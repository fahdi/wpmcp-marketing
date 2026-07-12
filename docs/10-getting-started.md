---
title: Getting Started
order: 10
---

# Getting Started

## Requirements

| Dependency | Version |
| --- | --- |
| WordPress | >= 6.9 (this version bundles the Abilities API that wpmcp registers its tools on) |
| PHP | >= 8.1 |
| Composer | needed to install from source |
| MySQL / MariaDB | whatever your WordPress install already uses |

wpmcp is not yet listed on the wp.org plugin directory (this is planned). For now it is installed from source.

## Install from source

Clone the plugin directly into your `wp-content/plugins` directory and install its dependencies:

```bash
git clone https://github.com/fahdi/wpmcp.git wp-content/plugins/wpmcp
cd wp-content/plugins/wpmcp
composer install --no-dev
```

`--no-dev` skips the PHPUnit/test tooling, which you do not need on a production or staging install. If you plan to contribute to the plugin itself, see [Contributing and tests](90-contributing-and-tests.md) for the full dev setup instead.

## Activate the plugin

1. Log into wp-admin.
2. Go to **Plugins**.
3. Find **wpmcp** and click **Activate**.

On activation, wpmcp creates its snapshot storage table (`wp_wpmcp_snapshots`) and registers a **wpmcp** top-level admin menu item. That screen lists recent agent operations and lets a human restore any of them with one click, the same rollback mechanism the MCP tools use, just exposed to a person instead of an agent.

## What activation does not do

Activating the plugin does not, by itself, expose write access to the outside world. An MCP client still needs valid WordPress credentials (an Application Password) to call any tool, and every ability is capability-checked against `edit_posts` before it runs. See [Connecting clients](20-connecting-clients.md) for how to actually wire up an AI agent.

## Next steps

- [Connecting clients](20-connecting-clients.md): generate an Application Password and point an MCP client at your site.
- [The safety model](30-safety-model.md): understand what happens before and after every write.
