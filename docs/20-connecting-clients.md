---
title: Connecting an MCP Client
order: 20
---

# Connecting an MCP Client

wpmcp exposes its tools over the Model Context Protocol via the official WordPress Abilities API. Every ability wpmcp registers requires a caller to be authenticated as a WordPress user who can `edit_posts`, so the first step is generating credentials.

## Step 1: create an Application Password

wpmcp authenticates over WordPress's built-in [Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/) feature. No separate API key system, no additional plugin.

1. In wp-admin, go to **Users -> Profile** (or edit the specific user the agent should act as).
2. Scroll to **Application Passwords**.
3. Give it a name (e.g. `claude-code`) and click **Add New Application Password**.
4. Copy the generated password immediately. It is shown once.

Use a dedicated user for agent access rather than your own admin account, so you can revoke it independently and see its actions clearly in the operations list.

## Step 2: encode the credential

MCP clients that speak HTTP typically expect a `Basic` auth header, which is the base64 encoding of `username:application-password`:

```bash
echo -n "your-username:xxxx xxxx xxxx xxxx xxxx xxxx" | base64
```

Keep the spaces in the application password exactly as WordPress generated them before encoding.

## Step 3: point your client at the MCP endpoint

### Claude Code

Add an entry to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "wpmcp": {
      "type": "http",
      "url": "https://your-site.com/wp-json/mcp/wpmcp-server",
      "headers": {
        "Authorization": "Basic BASE64_OF_username:application-password"
      }
    }
  }
}
```

Replace `your-site.com` with your actual domain and the `Authorization` value with the base64 string from step 2.

### Cursor and Claude Desktop

Both are MCP-compatible clients, and the same endpoint and Basic-auth header work in their respective MCP server configuration. The `.mcp.json` example above will need to be adapted to whatever configuration format the client expects, but the URL and header are identical: no wpmcp-specific setup beyond the Application Password.

## Verifying the connection

Once connected, ask your client to call the `list-post-types` or `list-posts` tool. If you get a result back, the connection and auth are working. If you get a 401/403, double-check the Application Password encoding and that the WordPress user has at least the `edit_posts` capability (an Editor or Administrator role satisfies this by default).

See [Tools reference](40-tools-reference.md) for the full list of available tools once you are connected.
