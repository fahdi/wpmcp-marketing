---
title: Tools Reference
order: 40
---

# Tools Reference

Every tool below is registered as a WordPress ability named `wpmcp/<tool-name>` (for example, `wpmcp/get-page`), in the `wpmcp` ability category, via `src/Plugin.php`. Each ability has its own `permission_callback`: most content tools require `edit_posts`, but domains that touch more sensitive surfaces (users, plugins/themes, database, filesystem, WooCommerce, menus) are gated by their own matching WordPress capability, noted per section below. All abilities currently ship on the free tier; none are gated to Pro yet.

"Undoable" below means the tool routes its mutation through `Safe_Mutation::run()`, so it is snapshotted before it runs and can be undone with `rollback-operation`. "Disabled by default" means a site owner must explicitly opt in via a `wpmcp_enable_*` filter (and the caller must pass `confirm: true`) before the tool will run at all. "Read-only" tools never write anything. See [The safety model](30-safety-model.md) for how the snapshot/rollback engine works, and [WooCommerce tools](60-woocommerce.md) for the store-specific detail on that domain.

## Content (`edit_posts`)

Create, read, update, delete, and organize posts, pages, and custom post types.

- `list-post-types`, `list-taxonomies` read-only. List registered post types and taxonomies.
- `list-posts`, `get-post` read-only. Search/list posts by type, status, search text, author, or parent; read one post's full detail (content, status, terms, meta, featured image).
- `create-post` not undoable (nothing to snapshot; a new object has no prior state). Create a post, page, or custom post type.
- `update-post` undoable. Partially update a post's fields, terms, meta, or featured image.
- `delete-post` undoable on the force path only. Trashes by default (WordPress's own trash is already reversible); `force: true` permanently deletes and is disabled by default, requiring `confirm: true`.
- `set-post-terms` undoable. Assign taxonomy terms to a post: replace, append, or remove.
- `update-blocks` undoable, verified. Replace a page's Gutenberg block markup; verifies the new markup still parses before considering the write successful.
- `get-page` read-only. Reads a page's title, content, and whether it is built with Elementor.

## Media (`edit_posts`)

- `get-media` read-only. Full attachment detail: sizes, dimensions, mime type, alt text, caption, description.
- `update-media` undoable. Update title, alt text, caption, and/or description.
- `delete-media` undoable, disabled by default. Deletes an attachment; disabled by default because file bytes on disk cannot be restored even though the database record can be (see [Safety model](30-safety-model.md#known-limitations-stated-honestly)).
- `sideload-image` not undoable (creates only). Downloads an image from a URL into the Media Library as a new attachment.

## Settings (`manage_options`)

- `get-settings` read-only. Reads site settings from a strict allowlist (general, reading, writing, discussion, media, permalinks).
- `update-settings` undoable, per key. Updates one or more allowlisted settings; validates and coerces each value, applies the valid subset even if some keys fail, and snapshots each changed option individually so any subset of a batch write can be undone independently.

## Users (per-tool capability)

- `list-users` (`list_users`), `get-user` (`list_users`) read-only. Safe summary rows and full profile detail; never return password hashes.
- `create-user` (`create_users`) not undoable (creates only). Creates a non-admin user with an auto-generated password (never returned) and emails the new user; rejects admin and unknown roles.
- `update-user` (`edit_users`) undoable. Updates a non-admin user's profile fields; refuses admin-capable users; never changes role or password.

There is deliberately no delete-user or role-change tool.

## Comments (per-tool capability)

- `list-comments`, `get-comment` (`moderate_comments`) read-only. Summary rows and single-comment detail.
- `moderate-comment` (`moderate_comments`) undoable. Approve, unapprove, spam, trash, or untrash a comment.
- `edit-comment` (`edit_comments`) undoable. Edit a comment's content and/or author fields.
- `delete-comment` (`edit_comments`) undoable, disabled by default. Permanently deletes a comment; the resurrected comment gets a new ID on rollback since WordPress always assigns a fresh auto-increment ID.

## Plugins and themes (per-tool capability)

Package management: install, activate, update, and remove plugins and themes.

- `list-plugins`, `list-themes` (`activate_plugins`) read-only. Active status, protected-package flag, pending updates, parent theme.
- `activate-plugin`, `deactivate-plugin` (`activate_plugins`) undoable. Snapshot the prior `active_plugins` option. Deactivation refuses protected packages (wpmcp itself, Elementor).
- `switch-theme` (`switch_themes`) undoable. Snapshots the prior template/stylesheet options.
- `install-plugin` (`install_plugins`), `install-theme` (`install_themes`) not undoable (creates only). Install from wordpress.org by slug, optionally activating.
- `update-plugin` (`update_plugins`), `update-theme` (`update_themes`) not undoable, disabled by default. Update to the latest wordpress.org version; file changes have no backup, so these are opt-in and require `confirm: true`.
- `delete-plugin` (`delete_plugins`), `delete-theme` (`delete_themes`) not undoable, disabled by default. Permanently delete installed files; refuse protected, active, or (for themes) active-parent packages; require `confirm: true`.

## Database (`manage_options`)

Direct table access, gated at `manage_options` since it is equivalent to phpMyAdmin-level access to the site.

- `list-tables`, `describe-table` read-only. Table inventory with row counts/sizes; column, type, and key detail for one table.
- `query` read-only. Runs `SELECT`/`SHOW`/`DESCRIBE`/`EXPLAIN`/`WITH` only; writes, DDL, stacked statements, and file-access SQL are rejected before execution; results are capped.
- `insert-row` not undoable, disabled by default. Inserts a row via `$wpdb->insert()` (parameterized); refuses protected tables.
- `update-rows`, `delete-rows` not undoable, disabled by default. Require a mandatory equality `WHERE` and `confirm: true`; refuse protected tables (`wp_users`/`wp_usermeta` by default, extendable). These capture a before-image to a capped audit log but honestly report `recoverable: false`: arbitrary-table rollback is out of scope for the snapshot engine, unlike the post/option/user/comment/order paths above.

## Filesystem (`manage_options`, requires `edit_files`, honors `DISALLOW_FILE_EDIT`)

Every path is confined to the WordPress install root; path traversal, symlink escapes, null bytes, and absolute paths outside the root are all rejected.

- `read-file`, `list-directory`, `search-files` read-only. Read a file; list a directory (optionally recursive); search file contents for a substring, filterable by extension.
- `write-file`, `edit-file` undoable, disabled by default. Create/overwrite a file, or replace an exact string in one; both back up the original file first, so `recoverable: true` is a real byte-for-byte guarantee, not just a log entry.
- `delete-file` undoable, disabled by default. Deletes a file after backing it up first; requires `confirm: true`.
- All filesystem tools refuse `wp-config.php` and `.htaccess` regardless of path.

## Performance (`manage_options`)

- `analyze-performance` read-only. Scans server configuration, WordPress internals (database size, autoloaded options, cron backlog, object cache, OPcache, plugin count), and a target page (defaults to the frontpage) for bottlenecks. Returns a scored report with severities and ranked, actionable recommendations. The optional page fetch is SSRF-safe: it only ever resolves to this site's own host.

## Security scanner (`manage_options`)

- `scan-security` read-only. Scans this site across four areas: PHP malware heuristics (uploads plus active plugins/themes, or the whole tree with `deep: true`), WordPress core file integrity against official wordpress.org checksums, configuration hardening (file editor, debug output, admin username, XML-RPC, version disclosure, HTTPS, security headers), and outdated/abandoned software. Returns a scored report (0-100, graded A-F) with severities and ranked recommendations. Self-contained; scans this site only.

## WooCommerce store tools (per-tool capability)

Full detail in [WooCommerce tools](60-woocommerce.md). Summary:

- `list-products`, `get-product`, `list-product-categories` (`manage_woocommerce`) read-only.
- `list-orders`, `get-order` (`edit_shop_orders`) read-only, HPOS- and CPT-safe.
- `get-sales-report` (`manage_woocommerce`) read-only. Order count, gross sales, items sold, and top products over a date range.
- `create-product` (`manage_woocommerce`) not undoable (creates only); a mistaken product is removed with `delete-product`.
- `update-product` (`manage_woocommerce`) undoable. A product is a post under the hood, so it uses the same snapshot/restore path as `update-post`: price, stock, and description restore exactly.
- `delete-product` (`manage_woocommerce`) undoable, disabled by default. Trash by default, `force: true` for permanent (resurrects at the original ID on rollback).
- `update-order-status` (`edit_shop_orders`) undoable. Snapshotted via the `wc_order` object type; restores the prior status exactly.
- `add-order-note` (`edit_shop_orders`) not undoable (additive only).

## Navigation menus (`edit_theme_options`)

- `list-menus`, `get-menu`, `list-menu-locations` read-only. Menu summaries, one menu's ordered items, and the theme's registered locations with their assigned menu.
- `create-menu` not undoable (creates only); a mistaken menu is removed with `delete-menu`.
- `add-menu-item` not undoable (additive); a mistaken item is removed with `remove-menu-item`.
- `update-menu-item` undoable. A menu item is a post under the hood, so it restores exactly via the same post snapshot path.
- `remove-menu-item` undoable. Resurrects the removed item at its original ID, re-attached to its menu.
- `assign-menu-to-location` undoable. Snapshotted via the `option` object type (the assignment lives in a theme_mod).
- `delete-menu` not undoable, disabled by default. Removes a nav_menu term; the menu name and its items are returned in the response so it can be rebuilt manually, since term deletion is not automatically reversible.

## Safety tools

Not tied to any one domain: these read and control the snapshot history itself.

- `list-operations` read-only. Lists recent agent operations from the snapshot history (tool, object type/id, session, timestamp). Never leaks snapshot payloads.
- `rollback-operation` undo. Restores one operation's pre-change snapshot by `operation_id`.
- `rollback-session` undo. Unwinds every operation from a session, restoring each distinct object to its earliest snapshot within that session (see [Safety model](30-safety-model.md#known-limitations-stated-honestly) for the free-tier retention caveat).

## Not yet shipped

`preview-change` (dry-run diff before applying a write) and Elementor deep-editing tools are on the roadmap but not implemented. See [Free vs Pro](50-free-vs-pro.md) for the current split between what's free today and what's planned.
