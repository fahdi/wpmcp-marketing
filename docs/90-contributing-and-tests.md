---
title: Contributing and Tests
order: 90
---

# Contributing and Tests

## Dev setup

```bash
composer install       # install dev dependencies (PHPUnit, WP test scaffolding, phpcs)
composer test          # run the full PHPUnit + WordPress integration suite
composer test:free     # run only the free-tier test suite
composer test:pro      # run only the Pro/Freemius test suite
composer lint          # PSR-12 with WordPress-idiomatic naming, via phpcs
```

The suite needs a MySQL or MariaDB database for the WordPress integration harness (`tests/bootstrap.php` sets it up via the standard WordPress PHPUnit scaffolding). CI installs it with `bin/install-wp-tests.sh wordpress_test root root 127.0.0.1 6.9` against a MariaDB 10.6 service container; see `.github/workflows/ci.yml` for the exact steps if you need to reproduce it locally.

CI runs on every push and pull request across a PHP 8.1 / 8.2 matrix: `composer install`, `composer lint`, install the WordPress test scaffolding, then `composer test`.

## Test structure

Tests are split into two PHPUnit test suites, matching the free/Pro split described in [Free vs Pro](50-free-vs-pro.md):

- **`tests/free/`**, autoloaded as `WPMCP\Tests\Free\`, mirrors the `src/` structure: `Admin/`, `Content/`, `MCP/`, `Media/`, `Safety/`, `Settings/`, `Tools/`, plus root-level smoke and bootstrap tests. This is where the bulk of the coverage lives, including the safety engine's heaviest tests (`Safety/SafeMutationTest.php`, `Safety/RollbackServiceTest.php`, `Safety/SnapshotCaptureTest.php`, `Safety/SnapshotStoreCrudTest.php`, `Safety/SnapshotStoreInstallTest.php`).
- **`tests/pro/`**, autoloaded as `WPMCP\Tests\Pro\`, currently just `Freemius/BootstrapTest.php` and `GateTest.php`. Small on purpose: there is no Pro tool surface shipped yet, so there is nothing else to test there today. This suite will grow as Pro features land.

`phpunit.xml.dist` wires both suites (`free` -> `tests/free`, `pro` -> `tests/pro`) and defines the `WPMCP_TESTING` constant used by the bootstrap files to skip the plugin's normal `ABSPATH` guard during tests.

## The safety invariant

The project's core rule, stated plainly in the README's Contributing section: **no tool may write to the database except through `Safe_Mutation::run()`, and every change ships with a test.**

This is not enforced by a single "no bypass" test; it's enforced structurally and by convention across `src/Tools/`. Every WordPress write call (`wp_update_post`, `wp_delete_post`, `wp_insert_post`, `update_option`, etc.) in a tool handler either:

- sits inside a `Safe_Mutation::run()` closure, or
- has an explicit code comment justifying why it is exempt (only two categories qualify: pure-creation tools like `create-post` and `sideload-image`, where there is nothing pre-existing to snapshot; and WordPress's own trash for `delete-post`'s default path and `delete-media`'s `MEDIA_TRASH`-covered path, which is already reversible without a redundant snapshot).

When you add a new tool that mutates existing state, route the mutation through `Safe_Mutation::run()` with an `object_type`, `object_id`, `session_id`, and `tool_name` in its context array, the same pattern every existing write tool follows (see `src/Tools/Content/Update_Post.php` for a representative example, or `src/Tools/Settings/Update_Settings.php` for the per-key variant used by batch writes).

If a mutation genuinely creates a brand-new object with nothing to overwrite, or is already covered by WordPress's own reversible trash, document that exemption inline with a comment, the same way the existing exempt tools do, so the next contributor (or reviewer) understands it was a deliberate decision and not an oversight.

## How to document a new feature

When a new tool or test lands in this codebase:

1. **Add or extend a section in [`40-tools-reference.md`](40-tools-reference.md)** for the new tool: its registered ability name (`wpmcp/<name>`), purpose, key args, whether it's safe-wrapped (and why, if not), and any capability or opt-in requirements (disabled-by-default filters, `confirm` flags, allowlists).
2. **If it changes safety behavior**, adds a new object type to snapshot/restore, changes pruning/retention logic, changes the meta-purge, or touches the force-delete/resurrection path, also update [`30-safety-model.md`](30-safety-model.md). This file exists specifically to describe *actual* mechanics, so keep it in sync with the code rather than the aspirational design spec.
3. **Prefer describing what the code does over what a design doc says it should do.** This documentation set intentionally verified every claim against `src/` directly; a design spec drifting out of date from the shipped implementation is a normal part of development, not a bug, but the docs here should track the code, not the spec.
4. If a feature is Pro-gated or merely planned, say so explicitly ("planned") rather than implying it ships today. See [`50-free-vs-pro.md`](50-free-vs-pro.md) for the current free/Pro boundary.
