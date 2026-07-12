---
title: Introduction
order: 0
---

# Introduction

wpmcp is a WordPress plugin that turns a site into an MCP (Model Context Protocol) server. It lets an AI agent, Claude, Cursor, or any other MCP-compatible client, read and edit a WordPress site directly: create and update posts and pages, manage media, adjust settings, and more.

## The core promise

Handing an AI agent write access to a live WordPress site is risky. A bad edit on a client's production site is the kind of mistake that is hard to walk back, and every other WordPress AI tool asks you to simply trust the model to get it right.

wpmcp takes the opposite approach: it assumes the agent will get something wrong eventually, and makes sure that nothing it does is permanent.

**Nothing an agent does through wpmcp is unrecoverable.** Every write goes through a safety engine that snapshots the affected object before the change happens. If the change breaks something, it can be rolled back, either by the agent itself (via a rollback tool) or by a human, with one click, from the WordPress admin screen. You can undo a single operation, or unwind an entire agent session back to where it started.

## How this is different

Most AI-for-WordPress tools focus entirely on the building and editing experience. wpmcp treats recoverability as the headline feature, not an afterthought:

- **Enforced in code, not by convention.** No tool that mutates the database can bypass the safety wrapper. This is a structural guarantee, not a guideline the code happens to follow.
- **Works at the WordPress data layer.** Snapshots capture the actual post row, meta, terms, and comments, so rollback does not depend on understanding any particular page builder's internal format.
- **Runs inside WordPress.** wpmcp is a single WordPress plugin built on the official WordPress Abilities API, not a separate Node process or local proxy. One install, and it works with any MCP client.
- **Free and open where it matters.** The safety engine and the core content/media/settings tools are free and GPL-2.0 licensed.

## Who this is for

- **Developers and agencies** who want to let an AI agent build or maintain WordPress sites (including client sites) without babysitting every change.
- **MCP client builders and power users** connecting Claude Code, Claude Desktop, Cursor, or another MCP client to a WordPress install.
- **Anyone nervous about giving an AI agent write access to production**, and wants an undo button that actually works.

## Project status

wpmcp is an early MVP. The safety engine (snapshot, apply, verify, rollback) and the first set of read/write tools are shipped and covered by tests. Some features described in the design spec (for example, Elementor deep editing, and unlimited history on a paid tier) are planned but not yet shipped. Where this documentation describes a planned feature, it says so explicitly.

## Where to go next

- [Getting started](10-getting-started.md): requirements and installation.
- [Connecting clients](20-connecting-clients.md): wiring up Claude Code, Cursor, or Claude Desktop.
- [The safety model](30-safety-model.md): how snapshot, rollback, and recovery actually work under the hood.
- [Tools reference](40-tools-reference.md): every MCP tool wpmcp ships, what it does, and whether it is safety-wrapped.
