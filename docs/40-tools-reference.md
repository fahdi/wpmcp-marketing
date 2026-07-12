---
title: Tools Reference
order: 40
---

# Tools Reference

Every tool below is registered as a WordPress ability named `wpmcp/<tool-name>` (for example, `wpmcp/get-page`), in the `wpmcp` ability category, via `src/Plugin.php`. Unless noted otherwise, every ability's `permission_callback` requires the calling user to have the `edit_posts` capability, this applies uniformly to reads, writes, and the safety tools; there is currently no finer-grained per-tool capability. All abilities currently ship on the free tier; none are gated to Pro yet.

"Safe-wrapped" below means the tool routes its mutation through `Safe_Mutation::run()`, so it is snapshotted before it runs and can be undone with `rollback-operation`. Where a tool is not safe-wrapped, the reference explains why.

## Read tools

### `get-page`

Reads a page's title, content, and whether it is built with Elementor.

- **Args:** `id` (integer, required).
- **Returns:** `id`, `title`, `content`, `is_elementor` (true if the `_elementor_edit_mode` post meta is set).
- **Safety:** read-only, not applicable.

### `get-post`

Reads a post/page/custom post type's full detail: content, status, terms, meta, and featured image.

- **Args:** `post_id` (integer, required).
- **Returns:** `post_id`, `post_type`, `title`, `slug`, `status`, `content`, `excerpt`, `date`, `modified`, `parent`, `permalink`, `terms` (grouped by taxonomy), `meta` (protected/underscore-prefixed keys are filtered out), `featured_image` (`{id, url}` or `null`), `is_elementor`.
- **Safety:** read-only.

### `list-posts`

Search or list posts, pages, or custom post types.

- **Args:** `post_type` (default `post`), `status` (default `any`; one of `publish`, `future`, `draft`, `pending`, `private`, `trash`, `any`), `search`, `author` (integer), `parent` (integer), `per_page` (1-100, default 20), `page`, `orderby` (`date`, `modified`, `title`, `menu_order`, `ID`), `order` (`ASC`/`DESC`, default `DESC`).
- **Returns:** `posts` (array of summaries), `total`, `pages`, `page`.
- **Safety:** read-only.

### `list-post-types`

Lists registered post types.

- **Args:** `public_only` (boolean, default `true`).
- **Returns:** `post_types`, each with `name`, `label`, `hierarchical`, `public`, `taxonomies`. Internal WordPress-only types (revisions, nav menu items, templates, `wp_navigation`, `attachment`, etc.) are always excluded.
- **Safety:** read-only.

### `list-taxonomies`

Lists registered taxonomies, optionally filtered to those attached to a given post type.

- **Args:** `post_type` (string, optional; if omitted, lists all taxonomies).
- **Returns:** `taxonomies`, each with `name`, `label`, `hierarchical`, `object_types`.
- **Safety:** read-only.

### `get-media`

Reads a Media Library attachment's full detail.

- **Args:** `media_id` (integer, required).
- **Returns:** `media_id`, `title`, `slug`, `url`, `mime_type`, `alt`, `caption`, `description`, `date`, `post_parent`, `width`, `height`, `sizes` (per registered image size), `metadata` (raw attachment metadata array).
- **Safety:** read-only. Errors if the ID is not an `attachment` post type.

### `get-settings`

Reads site settings from a strict allowlist (`Settings_Registry`), covering the general, reading, writing, discussion, media, and permalinks groups.

- **Args:** `group` (string, optional filter), `keys` (array of option names, optional filter).
- **Returns:** `settings`, each row with `key`, `group`, `type` (`string`/`int`/`bool`/`enum`), coerced `value`, `writable` (false for `admin_email`, `siteurl`, `home`), and `options` (the allowed enum values, when applicable).
- **Safety:** read-only. Only options in the allowlist are visible at all, regardless of what is requested.

## Content writes

### `create-post`

Creates a new post, page, or custom post type, optionally with terms and meta.

- **Args:** `post_type` (default `post`), `title`, `content`, `excerpt`, `status` (one of `draft`, `publish`, `pending`, `private`, `future`; default `draft`), `slug`, `parent` (integer), `terms` (object of taxonomy => term list), `meta` (object).
- **Returns:** `post_id`, `status`, `permalink`.
- **Safety: not safe-wrapped.** Creating a brand-new post cannot overwrite or destroy any existing content, so there is nothing to snapshot. Blocked from targeting internal/non-writable post types (`revision`, `nav_menu_item`, `attachment`, block templates, etc.) and from writing protected/underscore-prefixed meta keys.

### `update-post`

Partially updates an existing post's fields, terms, meta, or featured image.

- **Args:** `post_id` (required), `title`, `content`, `excerpt`, `status`, `slug`, `parent`, `terms` (object), `terms_mode` (`replace`, default, or `append`), `meta` (object), `featured_image` (`{id}` object to set, or `null` to remove), `session_id`.
- **Returns:** `operation_id`, `post_id`.
- **Safety: safe-wrapped.** Snapshots the post before applying any change. Rejects writes to non-writable post types or protected meta keys.

### `delete-post`

Deletes a post. Trashes by default; permanently deletes with `force: true`.

- **Args:** `post_id` (required), `force` (boolean), `session_id`.
- **Returns (trash path):** `post_id`, `deleted: "trashed"`. **Returns (force path):** `operation_id`, `post_id`, `deleted: "deleted"`.
- **Safety: safe on force only.** The default trash path is **not** safe-wrapped, WordPress's own trash is already reversible, so a redundant snapshot adds nothing. The `force: true` path **is** safe-wrapped, since it permanently removes the post row (see [Safety model](30-safety-model.md#force-delete-and-resurrection-with-id-verification) for how rollback resurrects a force-deleted post).

### `set-post-terms`

Assigns taxonomy terms to a post.

- **Args:** `post_id` (required), `taxonomy` (required), `terms` (array, required), `mode` (`replace` default, `append`, or `remove`), `session_id`.
- **Returns:** `operation_id`, `post_id`, `taxonomy`, `terms` (the resulting term list after the change).
- **Safety: safe-wrapped.**

## Media

### `update-media`

Updates an attachment's title, alt text, caption, and/or description.

- **Args:** `media_id` (required), `title`, `alt`, `caption`, `description`, `session_id`.
- **Returns:** `operation_id`, `media_id`, `updated` (array of which fields changed).
- **Safety: safe-wrapped.** Attachments are posts (`post_type = attachment`), so they use the same generic post snapshot/restore path as `update-post`: full row, all meta (including `_wp_attachment_image_alt`), and terms.

### `delete-media`

Deletes a Media Library attachment. **Disabled by default.**

- **Args:** `media_id` (required), `confirm` (boolean, required, must be `true`), `force` (boolean), `session_id`.
- **Returns (trashed, native):** `media_id`, `deleted: "trashed"`, `files_recoverable: true`. **Returns (deleted):** `operation_id`, `media_id`, `deleted: "deleted"`, `files_recoverable: false`, `warning` (points at the file-recovery limitation).
- **Safety: safe-wrapped**, except when the deletion is naturally covered by WordPress's own trash (only happens when the site defines `MEDIA_TRASH` truthy and `force` was not requested; most sites don't set this constant, so this default-trash case is uncommon in practice).
- **Disabled by default:** a site must explicitly opt in with `add_filter('wpmcp_enable_delete_media', '__return_true')` before this tool will run at all, in addition to the caller passing `confirm: true` on every call. See [Safety model](30-safety-model.md#known-limitations-stated-honestly) for why: rollback restores the database record but not the physical file bytes once they're unlinked from disk (issue #24).

### `sideload-image`

Downloads an image from a URL into the Media Library as a new attachment.

- **Args:** `url` (required), `post_id` (integer, optional parent), `description`, `alt`.
- **Returns:** `media_id`, `url`.
- **Safety: not safe-wrapped.** Like `create-post`, this only ever creates a brand-new object; there is nothing pre-existing to snapshot or roll back.

## Settings

### `update-settings`

Updates one or more site settings from the same strict allowlist `get-settings` reads from.

- **Args:** `settings` (object of key => value, required).
- **Returns:** `updated` (object of key => coerced value actually applied), `skipped` (array of `{key, reason}` for keys rejected as not-allowlisted, read-only, or failing validation), `rewrite_flushed` (boolean), `operation_ids` (array, one per key that actually changed).
- **Safety: safe-wrapped, per key.** Each changed option is snapshotted and applied individually through `Safe_Mutation`, with `object_type: 'option'`, so any subset of a batch write can be independently undone via `rollback-operation`. Keys that are unchanged (value already matches) are reported as applied but do not consume a snapshot/history slot. Validation includes enum checks, int range clamping, and rejecting unsafe permalink structures; invalid or non-writable keys are skipped and reported rather than silently dropped, and the rest of the batch still applies.

## Safety tools

### `list-operations`

Lists recent agent operations from the snapshot history. Does not leak snapshot payloads.

- **Args:** `limit` (integer, default 20).
- **Returns:** `operations`, each with `operation_id`, `session_id`, `tool_name`, `object_type`, `object_id`, `created_at`.

### `rollback-operation`

Undoes a single operation by restoring its pre-change snapshot.

- **Args:** `operation_id` (string, required).
- **Returns:** `restored` (boolean).

### `rollback-session`

Unwinds every operation from a given session, restoring each distinct object to its earliest snapshot within that session (its pre-session state, subject to the free-tier retention limitation described in [Safety model](30-safety-model.md#known-limitations-stated-honestly)).

- **Args:** `session_id` (string, required).
- **Returns:** `restored_count` (integer; counts snapshot rows processed, not distinct objects restored, so it can exceed the number of objects actually changed).

## Not yet shipped

`preview-change` (dry-run diff before applying a write) and Elementor deep-editing tools are on the roadmap but not implemented. See [Free vs Pro](50-free-vs-pro.md) for the current split between what's free today and what's planned.
