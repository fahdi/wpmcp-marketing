---
title: WooCommerce Tools
order: 60
---

# WooCommerce Tools

wpmcp treats a WooCommerce store as a first-class surface, not an afterthought bolted onto the content tools. An AI agent can read products, orders, and sales data, and make the day-to-day changes a shop owner actually asks for: updating a price, marking an order as shipped, adjusting stock. Every one of those changes goes through the same snapshot/rollback engine documented in [The safety model](30-safety-model.md), so a bad price edit or a wrong order-status change is a one-click undo, not a support ticket.

## What a shop owner gets

- **Read the whole store.** `list-products` and `get-product` for the catalog, `list-product-categories` for how it is organized, `list-orders` and `get-order` for what customers have bought, `get-sales-report` for a date-range summary of gross sales, order count, items sold, and top products by quantity.
- **Change products safely.** `update-product` edits price, stock, description, SKU, and status. A product is a WordPress post under the hood, so the change is snapshotted the same way an ordinary page edit is: `rollback-operation` puts the exact prior price and stock quantity back, not an approximation.
- **Change order status safely.** `update-order-status` moves an order through the store's registered statuses (processing, completed, refunded, and so on), validated against what the store actually supports. It is snapshotted via a dedicated `wc_order` object type, so `rollback-operation` restores the prior status exactly, whether the store uses WooCommerce's classic post-based orders or the newer High-Performance Order Storage (HPOS) tables. Every order tool is HPOS- and CPT-safe: it does not assume one storage backend, so the same tools work whether or not a store has migrated to HPOS.
- **Create products, and add order notes.** `create-product` and `add-order-note` are additive: a new product with no prior state to snapshot, or a note appended to an order's history. A mistaken product is removed with `delete-product`.

## The one-click undo, and why it matters here specifically

Most AI-for-WooCommerce integrations either refuse to touch products and orders at all, or let an agent write directly with no way back. That is a real risk on a live store: an agent that fat-fingers a price from $49 to $4.90, or flips a paid order to "refunded" by mistake, has just cost real money in the minutes before a human notices.

wpmcp's answer is the same safety engine used everywhere else in the plugin:

1. `update-product` and `update-order-status` snapshot the object before the change applies.
2. The change happens.
3. If it turns out to be wrong, `rollback-operation` (from the agent, or a one-click Restore button on the **wpmcp** wp-admin screen) restores the exact prior state: the old price, the old stock count, the old order status.

This is the detail worth underlining for anyone evaluating AI tools against a live store: **product and order-status changes are undoable by construction, not by promise.** Competing WooCommerce AI plugins that offer direct database or REST access typically have no equivalent undo path once a write lands; recovering means restoring from a nightly backup (losing every order placed since), or fixing it by hand from memory. wpmcp's snapshot happens at the moment of the change, so the fix is a single click, seconds later, with no data loss for anything else that happened on the store in between.

## Destructive and disabled-by-default tools

- `delete-product` is disabled by default (a site must opt in via the `wpmcp_enable_delete_product` filter) and always requires `confirm: true`. Trash is the default path; `force: true` permanently deletes, and even that is snapshotted, a force-deleted product resurrects at its original ID with its price, stock, and category terms intact.

## Capabilities

Read tools (`list-products`, `get-product`, `list-product-categories`, `get-sales-report`) and product writes require `manage_woocommerce`, matching WooCommerce's own admin gate. Order tools (`list-orders`, `get-order`, `update-order-status`, `add-order-note`) require `edit_shop_orders`. There is no wpmcp-specific capability layer here: it defers entirely to the store's existing WooCommerce roles, so a shop owner does not need to reason about a second permissions model.

See the [Tools reference](40-tools-reference.md#woocommerce-store-tools-per-tool-capability) for the full argument-level detail on every WooCommerce tool.
