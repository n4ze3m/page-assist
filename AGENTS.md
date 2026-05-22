# Page Assist — Agent Guide

## Commands

| Command | Purpose |
|---------|---------|
| `bun install` | Install deps (requires Bun). `npm install` works if Bun fails. |
| `bun dev` | Dev server for Chrome |
| `bun dev:firefox` | Dev server for Firefox |
| `bun run build` | Build for all 3 browsers sequentially (Chrome → Firefox → Edge) |
| `bun run build:chrome` / `bun run build:firefox` / `bun run build:edge` | Single-browser build |
| `bun run compile` | TypeScript type-check (`tsc --noEmit`), no bundling |
| `bun run zip` | Package Chrome extension for store |
| `bun run docs:dev` | Start VitePress docs dev server |
| `bun run docs:build` | Build docs |

Postinstall runs `wxt prepare` (generates `src/.wxt/`). Must run before `compile`.

## Framework & Toolchain

- **WXT v0.19.6** — browser extension framework (Vite-based). Config in `wxt.config.ts`.
- **React 18 + TypeScript 5.3 + Tailwind CSS + Ant Design**.
- Input format: **no semicolons, double quotes, no trailing commas** (Prettier, checked via `@plasmohq/prettier-plugin-sort-imports`). **No ESLint**.
- **No test framework or test scripts** — there are no automated tests in this repo.
- `rollupOptions.external: ["langchain", "@langchain/community"]` — these are not bundled.
- `resolutions` pins `@langchain/core` to `^1.1.31`.

## Architecture

### Dual entrypoints (Chrome vs Firefox)

Controlled by `TARGET` env var in `wxt.config.ts`:

```
entrypointsDir = TARGET === "firefox" ? "entries-firefox" : "entries"
```

- `src/entries/` — Chrome MV3 entrypoints (background, options, sidepanel, content scripts)
- `src/entries-firefox/` — Firefox MV2 entrypoints (same structure, API differences)

Key Firefox differences: `sidebarAction.open()` instead of `sidePanel`, no `host_permissions`, MV2 permissions include `webRequest`/`webRequestBlocking`, manifest includes `browser_specific_settings.gecko.id`.

### Entrypoints

| Entry | Path | Description |
|-------|------|-------------|
| Background | `entries/background.ts` | Runtime messages, context menus, commands, action clicks, MCP oauth, model pulls |
| Options (Web UI) | `entries/options/` | Full-page Web UI (`/options.html`), route: `routes/option-*.tsx` |
| Sidepanel | `entries/sidepanel/` | Sidebar UI, route: `routes/sidepanel-*.tsx` |
| Content scripts | `entries/*.content.ts` | YouTube summarize, HuggingFace/Ollama model pull UIs |

### Source layout (src/)

| Directory | Purpose |
|-----------|---------|
| `services/` | Business logic: ollama, search, TTS, OCR, app settings, action config |
| `models/` | AI model integrations: ChatOllama, CustomChatOpenAI, ChatChromeAi, embeddings |
| `store/` | Zustand stores (index, model, option, webui) |
| `db/` | Dexie.js IndexedDB layer (chat, knowledge, vector, document, migrations) |
| `routes/` | React Router route defs — separate chrome vs firefox, options vs sidepanel |
| `libs/` | MCP client, PDF parsing, vector stores (PageAssistVectorStore, PAMemoryVectorStore), export/import, OCR |
| `components/` | React UI components: Common, Option, Sidepanel, Layouts, MCP |
| `i18n/` | i18next translations in `lang/` |
| `hooks/` | Custom hooks (useDarkMode, etc.) |
| `web/` | Web search engine integrations |
| `utils/` | Shared utility functions |
| `types/` | Shared type definitions |

### Key runtime details

- Routing uses `MemoryRouter` (browser extension constraint — no URL navigation).
- DB migrations (`src/db/dexie/migration.ts`) run on options page mount.
- State: Zustand + TanStack React Query.
- Build output goes to `build/`. Generated `.wxt/` is gitignored.

## Style conventions

- Import sort order (managed by Prettier plugin): `@plasmohq/` → `~` path aliases → relative `./` or `../`
- Path alias: `@/` maps to `src/`, `~/` maps to WXT root (same as `src/`)
- Tailwind classes with `dark:` variant via `class`-based dark mode toggle
