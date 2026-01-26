# UI/UX Chat Automation Plan

Date: 2026-01-16
Scope: Chrome extension chat UI (sidepanel), no MCP dependency.

## Progress Checklist

- [x] Draft plan and test matrix.
- [ ] Confirm selectors/test IDs strategy.
- [ ] Decide mocking approach for model responses.
- [ ] Align CI runtime constraints (Chrome version, headless policy).

## Plan Overview

- Entry points: `src/entries/sidepanel/App.tsx`, `src/routes/sidepanel-chat.tsx`.
- Route: `/` in `SidepanelRoutingChrome` renders chat UI.
- Build: `bun run build:chrome` (WXT output in `build/`).

## Automation Stack (Recommended)

- Use Playwright with persistent Chromium context.
- Launch args:
  - `--disable-extensions-except=build`
  - `--load-extension=build`
- Derive extension ID from service worker URL; open `chrome-extension://<id>/sidepanel/index.html`.
- MCP: not required for DOM/UX validation; optional for DevTools traces.

## Test Matrix (Chat UI)

### Smoke

- Load sidepanel page; header, input, and message list render.
- Submit a message; user message appears.
- Streaming indicator appears and completes (mocked response).
- Toggle chat mode (rag/normal) via UI/shortcut.
- Clear chat; empty state visible.

### UX/Interaction

- Auto-scroll to bottom on new message.
- Scroll up; “scroll down” button appears.
- Drag/drop: non-image shows error; image attaches.
- Background image storage value applies overlay.
- Keyboard shortcuts: clear chat, toggle sidebar, switch mode.

### State/Edge

- No model selected → error notification on submit.
- Resume last chat from storage/db on load.
- Temporary chat setting toggles session behavior.

## CI-Ready Execution Plan (Not Implemented)

- Build extension for Chrome in CI.
- Start Playwright with persistent context and extension loaded.
- Resolve extension ID and navigate to sidepanel URL.
- Use stable selectors or `data-testid` for assertions.
- Mock LLM responses via background/service worker interception.
- Capture screenshots on failure; store artifacts.

## Open Questions

- Do we add `data-testid` attributes to Chat UI components?
- Preferred mock layer: network intercept vs. background message stub?
- Snapshot/screenshot diffing required or DOM-only assertions?
- Should we test open-sidepanel via Chrome UI or direct URL only?
