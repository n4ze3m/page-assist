# MCP (Model Context Protocol)

Page Assist supports MCP which allows your LLM to use external tools like search, databases, and more. You can connect to any MCP server that supports Streamable HTTP or SSE transport.

## Supported Transport Types

- Streamable HTTP

## Connecting to a Remote MCP Server

1. Go to Settings
2. Go to `MCP Settings`
3. Click `Add MCP Server`
4. Enter a name and the server URL
5. Select Auth Type (None, Bearer Token, or OAuth 2.1)
6. Click `Save`

Once added, the server tools will be automatically fetched and cached.

## Using STDIO MCP Servers

Page Assist is a browser extension, so it can't run STDIO-based MCP servers directly. You can use [supergateway](https://github.com/supercorp-ai/supergateway) to convert any STDIO MCP server to HTTP.

For example, to use Playwright MCP:

```bash
npx -y supergateway --stdio "npx @playwright/mcp@latest" --port 8808 --cors --outputTransport streamableHttp
```

Then add `http://localhost:8808/mcp` as the server URL in MCP Settings.

## Authentication

Page Assist supports two authentication methods for MCP servers.

### API Key / Bearer Token

If your MCP server requires an API key or bearer token:

1. Go to MCP Settings
2. Click `Add Custom Server`
3. Select `Bearer Token` as the auth type
4. Enter your token
5. Click `Save`

The token will be sent as `Authorization: Bearer <token>` with every request.

### OAuth 2.1

Some MCP servers (like Notion) require OAuth 2.1 authorization. Page Assist supports this using your Page Share URL as the OAuth redirect endpoint.

#### Setup

1. Make sure you have a Page Share URL configured (go to Settings > Manage Share)
2. Go to MCP Settings
3. Click `Add Custom Server`
4. Enter the server name and URL (e.g. `https://mcp.notion.com/mcp`)
5. Select `OAuth 2.1` as the auth type
6. Click `Save`
7. Click the key icon in the actions column to start the OAuth flow
8. Complete the authorization in the browser tab that opens

::: tip
Page Assist does not log or store any OAuth data on the server. The Page Share app only serves as a redirect endpoint. All tokens are stored locally in your browser.
:::

#### Self-Hosting Page Share

If you prefer not to use the default Page Share server for OAuth redirects, you can self-host it. See the [Page Share](/features/page-share) docs for instructions.

Once deployed, update your Page Share URL in Settings > Manage Share.

## Enable/Disable Servers Per Chat

You can temporarily enable or disable MCP servers per chat using the MCP icon button in the chat input. This lets you control which tools are available without changing global settings.

## Custom Headers

If your MCP server requires custom headers, you can add them when creating or editing a server in MCP Settings.
