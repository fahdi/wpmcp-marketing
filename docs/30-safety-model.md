---
title: The Safety Model
order: 30
---

# The Safety Model

This is the part of wpmcp that the rest of the product exists to support. Every tool that mutates existing data routes through a single orchestrator, `Safe_Mutation::run()`. No exceptions, and this is enforced in code: a tool cannot write to a post or option except by calling this method.

## The snapshot -> apply -> verify -> rollback flow

```
snapshot (before)  ->  apply the change  ->  verify  ->  ok?
     |                                          |         |
 stored in                              on failure:    return
 wp_wpmcp_snapshots                     auto-rollback   operation id
 (keyed by operation + session)         + raise error
```

1. **Snapshot.** Before the mutation runs, `Snapshot::capture()` records the target's before-image and `Safe_Mutation` stores it, gzip-compressed, in the `wp_wpmcp_snapshots` table, keyed by a generated operation ID (a UUID) and the calling session's ID.
2. **Apply.** The tool's actual mutation callback runs (e.g. `wp_update_post()`, `update_option()`, `wp_delete_post()`).
3. **Verify (optional, tool-specific).** Some tools pass a verification callback. `update-blocks`, for example, checks that the new block markup still parses as valid Gutenberg blocks. If verification fails, `Safe_Mutation` immediately restores the snapshot and throws a `Mutation_Failed` exception, so a bad write never survives past the same request.
4. **Rollback, on demand.** Separate from the automatic verify-and-revert above, any successfully-applied operation can be undone later via the `rollback-operation` or `rollback-session` tools, or from the **wpmcp** wp-admin screen.

Every write tool returns an `operation_id` in its response specifically so a caller (human or agent) can reference it later for rollback.

## What gets captured

Snapshot capture is dispatched by object type (`src/Safety/Snapshot.php`), and now covers five object types: `post`, `option`, `user`, `comment`, and `wc_order`. This is what makes product edits, order status changes, comment edits, and menu edits undoable through the same engine as posts and settings, not a separate one-off mechanism per domain.

**Posts (and attachments, which are WordPress posts of type `attachment`):**

- The **full post row**, every column from `get_post($id, ARRAY_A)`, not a hand-picked subset of fields. This matters for the resurrection path below: a partial capture would mean a force-deleted post comes back missing its original post type, author, parent, slug, dates, or menu order, silently rebuilt from `wp_insert_post()`'s defaults.
- **All post meta** (`get_post_meta($id)`), every key and value.
- **Taxonomy term assignments**, captured per taxonomy registered on that post type via `wp_get_object_terms()`.
- **Comments and their comment meta**, captured only for use by the force-delete resurrection path (see below). WordPress's `wp_delete_post($id, true)` destroys comments and commentmeta with no equivalent in the trash or in-place-update paths, so they have to be captured up front to be restorable.

A WooCommerce product is a post (`post_type = product`) and a navigation menu item is a post (`post_type = nav_menu_item`), so `update-product`, `delete-product`, `update-menu-item`, and `remove-menu-item` all restore exactly through this same full-row-plus-meta-plus-terms path: price, stock, description, title, url, parent, and position all come back as they were.

**Options (used by `update-settings` and `assign-menu-to-location`):**

- The option's current value.
- Whether the option **existed** before the write. Options have no trash/soft-delete equivalent: a write either changes an existing value or introduces a brand-new option. Recording `existed` lets rollback choose between putting the old value back (`update_option()`) or removing the option entirely (`delete_option()`) if it wasn't there before.

**Users (used by `update-user`):**

- The user's core profile fields and all usermeta, captured before any change so `rollback-operation` restores display name, email, url, nickname, name fields, and description exactly. Role and password are never touched by any wpmcp tool, so neither is part of this capture.

**Comments (used by `moderate-comment`, `edit-comment`, and `delete-comment`):**

- The comment row and its comment meta. `delete-comment`'s resurrection path reinserts the comment via `wp_insert_comment()`; the content, author, dates, and post association are restored, but (like force-deleted posts' comments) the comment gets a new auto-increment ID, since WordPress core does not let a caller choose one.

**WooCommerce orders (used by `update-order-status`):**

- The order's prior status, captured via the `wc_order` object type so it is HPOS- and CPT-safe (it does not assume orders are stored as posts). `rollback-operation` restores the exact prior status.

Snapshots are serialized with `gzencode(wp_json_encode($before))` and stored in a `LONGBLOB` column.

## Operation rollback vs session rollback

Two distinct undo scopes, both backed by the same snapshot table:

- **`rollback-operation`** restores exactly one snapshot, identified by its `operation_id`. Simple: look up the row, apply that snapshot.
- **`rollback-session`** unwinds an entire agent session. It pulls every snapshot recorded under a `session_id`, walks them oldest-first, and for each distinct object restores only the **earliest** snapshot seen, that object's state from before the session touched it at all. If the same post was edited three times in one session, only the first (pre-session) snapshot is applied; the two later ones are skipped once the object's identity has already been restored. The tool's return value (`restored_count`) counts snapshot rows processed, not distinct objects restored, so it can be larger than the number of objects that actually changed.

Object identity for deduplication is `object_type:object_id` for posts, users, comments, and orders, and `option:<option name>` for options (the raw database `object_id` column is always `0` for option rows, since options are identified by name, not a numeric ID; the real name lives inside the serialized blob).

## The meta-purge

Rollback is a full restore, not an additive merge. If the mutation being undone added a new meta key that did not exist at snapshot time, a rollback that only restored the snapshotted keys would leave that new key behind as orphaned meta, i.e. the object would not be truly back to its pre-mutation state.

To prevent that, `Rollback_Service::apply_snapshot()`:

1. Diffs the object's **current** meta against the **snapshotted** meta.
2. Deletes any meta key present now but absent from the snapshot (added by the mutation being undone).
3. Deletes and re-adds every snapshotted key/value pair exactly as captured.

This is what makes rollback exact rather than approximate: a restored object matches its pre-mutation state, including the absence of anything the agent added.

## Force-delete and resurrection, with ID verification

Trashing a post (`delete-post` without `force: true`) is **not** routed through `Safe_Mutation` at all: WordPress's own trash already makes it reversible, so a redundant snapshot would buy nothing. Force-deleting (`force: true`) permanently removes the post row, so that path **is** safe-wrapped.

When a force-deleted post needs to be rolled back, the row no longer exists, so a plain `wp_update_post()` would silently no-op. Instead, `Rollback_Service` re-inserts the post at its **original ID** using `wp_insert_post()`'s `import_id` parameter, then replays the captured comments on top of it via `wp_insert_comment()` (comment IDs themselves cannot be preserved, WordPress core always assigns a new auto-increment comment ID, but content, author, dates, and thread association with the post are restored).

Two safety checks guard this resurrection path:

- **Identity check before choosing the restore path.** If a post already exists at the target ID, wpmcp does not assume it's safe to just update it in place. It compares `post_date_gmt` (immutable after creation) between the live row and the snapshot. If they don't match, the row at that ID is a *different* post that has since reclaimed the ID (e.g. someone manually re-imported content after the original was force-deleted), and blindly updating it would silently overwrite an unrelated post. In that case rollback routes through the resurrection path instead, which triggers the next check.
- **ID collision check after resurrection.** `wp_insert_post()`'s `import_id` is only honored if that ID is still free; on a collision it silently falls back to a new auto-increment ID instead of erroring. wpmcp checks the returned ID against the ID it asked for, and if they don't match, throws a `Mutation_Failed` rather than leaving a "restored" post sitting at the wrong ID with no error. A rollback that silently succeeds at the wrong ID would be worse than one that fails loudly.

## Known limitations, stated honestly

**Free-tier history retention bounds session rollback.** `Gate::history_limit()` returns `20` for the free tier (unlimited, `PHP_INT_MAX`, for Pro). After every write, `Safe_Mutation::run()` calls `Snapshot_Store::prune()`, which deletes all snapshot rows beyond the most recent `N`. This pruning is **not currently session-aware**: it prunes purely by recency across the whole table, not per-session. On a free-tier site, an agent session that performs more than 20 total operations (across any objects) can lose its earliest snapshots before the session ends. In that case, `rollback-session` restores each object to the *earliest surviving* snapshot rather than guaranteed to its true pre-session state. This does not affect Pro (unlimited history). Making pruning session-aware, so a snapshot belonging to a still-active session is never pruned within its retention window, is on the roadmap.

**Media force-delete does not restore file bytes.** Force-deleting an attachment (or deleting one without `MEDIA_TRASH` defined) permanently unlinks the physical file from disk. Rollback via `Safe_Mutation` restores the media's database record faithfully, the post row, all meta, and taxonomy terms, but it cannot restore bytes already deleted from the filesystem. The `delete-media` tool response signals this explicitly with `"files_recoverable": false` and a `warning` field pointing at the tracking issue. Full file-level recovery is tracked as [issue #24](https://github.com/wpmcp/wpmcp/issues/24) and is not yet implemented. Because of this, `delete-media` is **disabled by default**: a site must opt in via the `wpmcp_enable_delete_media` filter, and every call additionally requires `confirm: true`.

Note on wording: an earlier design-spec draft stated that snapshot capture does not record taxonomy terms. That is now out of date. The current `Snapshot::capture()` implementation does capture per-taxonomy term assignments for posts, and `Rollback_Service::apply_snapshot()` restores them via `wp_set_object_terms()`. What is genuinely not yet captured is a small set of secondary post fields not covered by the full-row capture's practical use today (the design intentionally captures the entire row, so this gap is narrower than earlier drafts suggested); consult `src/Safety/Snapshot.php` directly if you need the exact current field list, since this is an area still evolving.

## Driving rollback

- **From an agent:** call the `rollback-operation` or `rollback-session` MCP tools directly (see [Tools reference](40-tools-reference.md)).
- **From a human:** open the **wpmcp** screen in wp-admin, which lists recent operations (via the same `list-operations` data) with a one-click **Restore** button per row.
