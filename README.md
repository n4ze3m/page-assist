<p align="center">
  <h1 align="center">tldw Browser_Assistant</h1>
</p>

<p align="center">
  Browser extension frontend for tldw_server — a unified AI assistant with chat, RAG, media processing, and more.
</p>

## Overview

tldw Browser_Assistant is an open‑source browser extension that provides a side panel and full‑page web UI for your own tldw_server instance. It connects to tldw_server so you can:

- Chat with any model configured on your server
- Search and cite with RAG (retrieval‑augmented generation)
- Ingest and process media (web pages, videos, audio, documents)
- Transcribe speech (STT) and synthesize speech (TTS)
- Chat with the current page, use internet search, OCR snippets, and more


## Requirements

- Bun (or Node) for building: https://bun.sh/
- A running tldw_server instance (local or remote)
  - Single‑user: API key
  - Multi‑user: username/password (Bearer tokens)


## Quick Start (Development)

```bash
bun install

# Chrome/Edge dev
bun dev             # Chrome
bun run dev:edge    # Edge

# Firefox dev
bun run dev:firefox
```

Then load the extension from the WXT dev server prompt, or open your browser’s extensions page and load the unpacked output from the prompted build directory.

## Build & Package

```bash
# Build all targets (Chrome, Firefox, Edge)
bun run build

# Or build individually
bun run build:chrome
bun run build:firefox
bun run build:edge

# Create zipped artifacts for release
bun run zip          # Chrome by default
bun run zip:firefox  # Firefox
```

By default the build output is placed in `build/`. Load that directory as an “unpacked”/temporary extension in your browser.

## Configuration (First Run)

Open Options → tldw Server and configure:

- Server URL: e.g., `http://localhost:8000`
- Authentication Mode:
  - Single‑user (API key)
  - Multi‑user (login via username/password)
- Timeouts: global and per‑API (chat, RAG, media, uploads)

The extension requests optional host permission (Chromium) for your configured origin so background requests can include auth headers and avoid CORS issues.

## Features

- Sidebar: Chat from any page; quick RAG/search; page‑aware chat
- Web UI: Full chat experience with history, editing, and regeneration
- RAG: Simple/search modes; insert citations into context
- Media: Add URLs, ingest web content; progress via notifications
- STT/TTS: Transcribe uploads and play synthesized speech (where available)
- Multi‑language UI: Locales under `src/assets/locale/*` and `_locales/*`

Want something else? Please open an issue.

## Usage

### Open the UI

- Side Panel: `Ctrl+Shift+Y`
- Web UI (new tab): `Ctrl+Shift+L`

Shortcuts are configurable from your browser’s extension settings and inside the app for in‑app actions.

### In‑App Shortcuts (defaults)

- New Chat: `Ctrl+Shift+O`
- Toggle Sidebar: `Ctrl+B`
- Focus Textarea: `Shift+Esc`
- Toggle Chat Mode (page/chat): `Ctrl+E`

## Browser Support

| Browser     | Sidebar | Chat With Webpage | Web UI |
| ----------- | ------- | ----------------- | ------ |
| Chrome      | ✅      | ✅                | ✅     |
| Brave       | ✅      | ✅                | ✅     |
| Firefox     | ✅      | ✅                | ✅     |
| Vivaldi     | ✅      | ✅                | ✅     |
| Edge        | ✅      | ✅                | ✅     |
| LibreWolf   | ✅      | ✅                | ✅     |
| Zen Browser | ✅      | ✅                | ✅     |
| Opera       | ❌      | ❌                | ✅     |
| Arc         | ❌      | ❌                | ✅     |

## Model & Provider Support

Models are surfaced from your tldw_server configuration (OpenAI‑compatible providers, local runtimes, etc.). Model fetching uses `/api/v1/llm/models` and related endpoints exposed by your server.

## Roadmap (Active Work)

- ✅ Foundation: branding, settings, auth (API key + login)
- ✅ Models: fetch and select models from tldw_server
- ✅ Chat: streaming completions via `/api/v1/chat/completions`
- 🚧 RAG search and citations
- 🚧 Media ingestion (URL/page) and processing
- 🚧 STT/TTS integration

## Privacy

- The extension does not collect analytics or telemetry.
- Credentials are stored using browser storage; tokens are handled by the background where possible.
- Data you process flows to the tldw_server you configure (local or remote). Review your server’s privacy/security settings.
- See [PRIVACY.md](PRIVACY.md) for more details.

## Development Notes

- Source lives in `src/` with WXT entries under `entries/` and `entries-firefox/`.
- TailwindCSS for UI (`src/assets/tailwind.css`, `tailwind.config.js`).
- Prettier + import sorting: `bunx prettier --write .`
- Type‑check before PRs: `bun run compile`
  - OpenAPI path enforcement: the web UI’s API calls are compile‑time checked against the bundled `openapi.json`. If you add or change an endpoint path/method, update `openapi.json` accordingly or your typecheck will fail.
  - CI: GitHub Actions runs the typecheck on each push/PR (`.github/workflows/typecheck.yml`).
  - Use the typed helpers `bgRequest`, `bgStream`, and `bgUpload` for all server calls. Direct `browser.runtime.sendMessage({ type: 'tldw:request' ... })` calls should pass a path typed as `AllowedPath` to participate in checks.

See `Testing-Guide.md` for how to run the Playwright E2E suite and manual smoke tests.

## Contributing

Contributions are welcome! Please open an issue or PR. Follow conventional commits (feat:, fix:, docs:, chore:, etc.) and include steps to test and screenshots for UI changes.

## License

AGPL

## Acknowledgements

This project builds on the excellent work of the original Page Assist extension.
