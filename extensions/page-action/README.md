# Page Action

An extension for Page Assist that adds browser actions on the active tab.

It exposes the active browser tab as a set of MCP tools. Page Assist connects to it over
cross-extension messaging and runs the actions against the tab via `chrome.debugger` (CDP),
so the model can read the page, click, type, navigate, draw on a canvas, and more.

This lives inside the Page Assist repo as a self-contained extension under
`extensions/page-action` (its own `package.json` and build; it does not affect the main
app's build).

## How it works

- Background service worker runs an MCP server (`@modelcontextprotocol/sdk`) over a
  `chrome.runtime` port (`PortTransport`).
- Page Assist connects with `chrome.runtime.connect(extensionId, { name: 'mcp' })` and
  drives the tools through its normal MCP tool loop.
- Connections are gated by a consent allow-list. Page Assist's ids are allowed by default
  (`jfgfiigpkhlkbnfnbobbkinehhfdhndo`, `ogkogooadflifpmmidmhjedogicnhooa`); any other
  extension raises an Approve/Deny prompt in the popup.
- Tools act on the active tab via CDP (trusted input, DOM serialization, screenshots).

Fixed extension id (pinned via the manifest `key`): `kaoapbeelphlbjmknbpnpndakmpafnbd`.
Chrome/Chromium only.

## Tools

- Browser surface: `inspect_page`, `locate_element`, `set_field_value`, `browser_input`,
  `run_browser_steps`, `navigate`, `extract_page_text`, `current_tabs`,
  `attach_image`, `read_console_messages`, `read_network_requests`,
  `set_window_size`, `javascript_tool`.
- Legacy helpers kept for compatibility: `get_page_state`, `click`, `input_text`,
  `scroll`, `send_keys`, `extract_content`, `capture_screenshot`, `get_dropdown_options`,
  `select_dropdown_option`, `move_mouse`, `drag`, `draw_path`, `wait_for_load`, `go_back`,
  `open_tab`, `list_tabs`, `switch_tab`, `close_tab`, `group_tabs`, `ungroup_tabs`,
  `file_upload`.

Notes:
- `get_page_state` returns a numbered list of interactive elements plus the viewport size.
  `click` and the pointer tools take either an element index or viewport CSS coordinates.
- `capture_screenshot` returns a PNG image block; Page Assist forwards it to the model as a
  vision message, so use a vision-capable model.
- Console/network messages are captured while the debugger is attached and reset on
  navigation.

## Development

From the repo root:

```bash
bun run page-action:dev      # launch Chrome with the extension loaded
bun run page-action:build    # build to extensions/page-action/output/chrome-mv3
```

Or from this folder:

```bash
cd extensions/page-action
bun install
bun run dev
bun run build
```

Load a build manually: `chrome://extensions` -> Developer mode -> Load unpacked ->
`extensions/page-action/output/chrome-mv3`.

## Connect from Page Assist

1. Install both extensions.
2. In Page Assist -> Settings -> MCP, add a server with Transport = **Browser extension**
   and Extension ID = `kaoapbeelphlbjmknbpnpndakmpafnbd`. Save.
3. Page Assist's ids are allow-listed by default, so it connects without a prompt.
4. Page Assist now lists and calls the page actions in chat.

The popup shows connection status, the allow-list (default ids are locked), and per-tool
toggles.
