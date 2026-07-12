---
title: Free vs Pro
order: 50
---

# Free vs Pro

## What's free today

Everything currently shipped in this repository is free and GPL-2.0 licensed. As of now, every registered ability is tagged `'free'`, there are no Pro-only tools actually running in the plugin yet. The free tier includes:

- The full safety engine: snapshot, apply, verify, rollback (both operation- and session-level).
- Gutenberg editing (`update-blocks`).
- All content tools (`create-post`, `get-post`, `update-post`, `delete-post`, `list-posts`, `set-post-terms`, `list-post-types`, `list-taxonomies`).
- All media tools (`get-media`, `update-media`, `delete-media`, `sideload-image`).
- All settings tools (`get-settings`, `update-settings`).
- The wp-admin **wpmcp** history and one-click restore screen.
- Operation history: the last **20** operations.

## The Gate

Free/Pro gating lives in `WPMCP\Pro\Gate` and is deliberately simple: a single boolean, `Gate::is_pro()`, backed by the Freemius SDK's `can_use_premium_code__premium_only()` when Freemius is active, and falling back safely to `false` when it isn't (no fatal error if the SDK is absent). `Gate::can_use(string $feature)` is currently just a pass-through to `is_pro()`, there is no per-feature matrix yet, it's a single on/off switch.

The concrete numeric difference implemented today:

```php
public static function history_limit(): int
{
    return self::is_pro() ? PHP_INT_MAX : 20;
}
```

Free tier: **20** operations of history, pruned globally (not per-session) after every write. Pro: unlimited (`PHP_INT_MAX`). This cap is the one place the free/pro split actually has teeth right now. See [Safety model](30-safety-model.md#known-limitations-stated-honestly) for what that means in practice for `rollback-session` on large agent runs.

The `MCP\Registrar` also has the mechanism to skip registering any ability tagged `'pro'` when `Gate::is_pro()` is false, so a Pro tool can be added to the codebase later and it will simply not appear for free-tier sites. This mechanism is tested but not yet used by any real tool, since no Pro abilities are registered in `Plugin.php` today.

## What's planned (Pro, not yet shipped)

The following are described in the project's roadmap and design spec as intended Pro features, but do not exist in the code yet:

- **Elementor deep editing.** Currently the plugin only reads whether a page is built with Elementor (via the `is_elementor` flag); there is no Elementor-specific write tooling.
- **Unlimited history and session rollback**, beyond the 20-operation free cap (the `history_limit()` mechanism above is already wired for this; it's a matter of flipping `is_pro()` to true via a real Freemius license, not new engineering).
- **`preview-change`**, a dry-run diff tool that shows what a write would do without applying it.
- **Change previews / visual before-and-after regression** on edited pages.
- Priority support.

If you see any of these referenced elsewhere as already working, treat that as aspirational until it appears in `src/` with tests.

## Going live on Pro (Freemius)

The Freemius integration is wired from day one so the plugin degrades gracefully whether or not Freemius is actually configured. `WPMCP\Freemius\Bootstrap::init()`:

1. No-ops immediately if `wpmcp_fs()` is already defined.
2. Checks whether the Freemius SDK is vendored at `vendor/freemius/start.php`. If that file does not exist (the normal state for local development and CI), it returns immediately and does nothing further, Freemius is fully inert.
3. If the SDK is present, it requires it, defines the memoized `wpmcp_fs()` accessor, and calls `fs_dynamic_init()` with the config from `Bootstrap::config()`.

Two things are required to actually go live on Freemius:

1. Register the plugin on freemius.com, then fill in the two placeholder constants in `wpmcp.php`:
   ```php
   define( 'WPMCP_FS_ID', 0 );          // replace with the real Plugin ID
   define( 'WPMCP_FS_PUBLIC_KEY', '' ); // replace with the real Public Key
   ```
2. Vendor the Freemius SDK itself at `vendor/freemius/start.php` (not currently present in this repository).

## Privacy default: `anonymous_mode`

`Bootstrap::config()` sets `'anonymous_mode' => true` by default:

```php
// Privacy-first defaults: wpmcp does not force telemetry opt-in.
// anonymous_mode skips the Freemius connect/opt-in gate on activation,
// matching our "no telemetry by default" positioning.
'anonymous_mode' => true,
```

This means Freemius's usual connect/opt-in screen is skipped on activation, no telemetry opt-in gate is forced on the site owner. This is a deliberate privacy-first default consistent with the project's "no telemetry by default" positioning, not an accidental omission.
