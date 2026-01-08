# Tech Context: Page Assist

Last updated: 2026-01-07
Derived from: package.json, wxt.config.ts, repo structure

1) Core Stack
- Language: TypeScript (tsconfig.json; tsc compile script without emit)
- UI: React 18 + react-router-dom
- Styling/UI: Tailwind CSS (forms, typography), Ant Design (antd), Headless UI, CSS-in-JS via @ant-design/cssinjs
- Theming (updated):
  - Tailwind darkMode: "media" (system-driven via prefers-color-scheme)
  - Custom CSS uses @media (prefers-color-scheme: dark) for dark-specific rules
  - Mode exposure via a simple hook (no DOM class mutations); Ant Design algorithm switches based on the system-reflected mode
- State: Zustand; Async/Server state: @tanstack/react-query; Virtualization: @tanstack/react-virtual
- i18n: i18next + react-i18next (+ detection via i18next-browser-languagedetector), src/i18n/* and extension _locales
- Extension framework/build: WXT (wxt.config.ts)
- Docs: VitePress (docs/)
- Storage/DB: Dexie + dexie-react-hooks (IndexedDB)
- Parsing/Content: @mozilla/readability, cheerio, html-to-text, pdfjs-dist, mammoth (DOCX), pa-tesseract.js (OCR)
- Rendering: react-markdown + rehype/remark (math via remark-math + rehype-katex/mathjax), react-syntax-highlighter
- Providers/Models: ollama, openai SDK; internal adapters in src/models/* (ChatOllama, CustomChatOpenAI, ChatGoogleAI, ChatChromeAi)
- Embeddings/Vector: OAIEmbedding, OllamaEmbedding, ml-distance; vector stores in libs (PageAssistVectorStore, PAMemoryVectorStore)
- Notifications/TTS: react-toastify; services for notifications and TTS (openai-tts, elevenlabs)

2) Build/Dev Tooling
- Bun preferred but npm compatible (README note)
- Scripts (from package.json):
  - Dev (Chromium): bun dev → cross-env TARGET=chrome wxt
  - Dev (Firefox): bun dev:firefox → wxt -b firefox with TARGET=firefox
  - Dev (Edge): bun dev:edge → wxt -b edge with TARGET=chrome
  - Build all: bun build → runs build:chrome; build:firefox; build:edge
  - Build per-target: build:chrome | build:firefox | build:edge
  - Zip per-target: zip | zip:firefox
  - Compile types: compile (tsc --noEmit)
  - Docs: docs:dev | docs:build | docs:preview (vitepress)
  - postinstall: wxt prepare
- Vite/WXT config:
  - Plugins: @vitejs/plugin-react, vite-plugin-top-level-await
  - Build externalized dependencies: ["langchain", "@langchain/community"] to shrink bundle
  - entrypointsDir: entries or entries-firefox based on TARGET
  - outDir: build
  - Manifest assembled in wxt.config.ts with per-target differences (permissions, CSP, gecko id)

3) Manifest/Permissions/CSP (from wxt.config.ts)
- Permissions (Chromium/MV3): storage, sidePanel, activeTab, scripting, declarativeNetRequest, action, unlimitedStorage, contextMenus, tts, notifications
- Permissions (Firefox/MV2-like): storage, activeTab, scripting, unlimitedStorage, contextMenus, webRequest, webRequestBlocking, notifications, host patterns (http/https/file)
- Host permissions (Chromium): http/https/file
- Commands:
  - _execute_action → Web UI (Ctrl+Shift+L)
  - execute_side_panel → Side panel (Ctrl+Shift+Y)
- CSP:
  - Chromium extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  - Firefox string includes worker-src and blob: allowances for PDF/Tesseract, etc.
- Names/Versions:
  - manifest.version: 1.5.44 (extension bundle)
  - package.json version: 1.0.9 (npm package) — note discrepancy tracked in activeContext

4) Directory/Module Conventions
- entries/ and entries-firefox/: background.ts, *.content.ts, sidepanel/, options/ per target
- src/routes/: route trees for sidepanel and options (chrome-route.tsx, firefox-route.tsx)
- src/services/: browser API integration, provider orchestration, OCR/TTS, model settings, application lifecycle
- src/models/: provider adapters and embedding utils
- src/libs/: data processing, parsing/extraction, pdf/pdfjs, export/import, notifications, runtime helpers
- src/db/: Dexie schema/models; vector persistence bindings
- src/loader/ & src/parser/: ingestion pipelines and site-specific parsers
- src/hooks/: UI/feature hooks; messaging, speech recognition, TTS, scrolling, keyboard, migrations, utilities
- src/public/: icons and _locales; ocr assets under public/ocr
- Styling: tailwind.config.js + postcss.config.js; global src/assets/tailwind.css

5) Tooling/Style
- Prettier: 3.x with @plasmohq/prettier-plugin-sort-imports
- TypeScript: 5.3.x; @types for chrome, node, libs present
- Tailwind CSS: 3.4.x + plugins (forms, typography)
- PostCSS/Autoprefixer configured
- React 18.2, react-router-dom 6.10, vite-plugin-top-level-await to enable top-level await
- i18n language detection and support-lists in src/i18n

6) Providers/Integrations
- Local:
  - Ollama via ollama npm package; runtime selection in services/model-settings and models/ChatOllama
  - Chrome AI (Gemini Nano) via models/ChatChromeAi (browser-provided)
- OpenAI-compatible:
  - openai SDK; CustomChatOpenAI adapter supports any OpenAI API-compatible endpoint
- Embeddings via OpenAI or Ollama adapters
- RAG flows use loaders + process-* libs + vector stores (Dexie-backed)

7) Development Setup
- Recommended:
  - Install Bun (or use npm as fallback)
  - bun install
  - For Chromium dev: bun dev
  - For Firefox dev: bun dev:firefox
  - Build all: bun run build
  - Load unpacked extension from build/ in browser (per README)
- Docs development: bun run docs:dev (VitePress)

8) Constraints/Considerations
- MV3 (Chromium) vs MV2-like (Firefox) differences in APIs and CSP; managed in wxt.config.ts
- Heavy libraries (langchain) externalized to reduce bundle size
- Web features requiring wasm/worker/blob need CSP allowances (already configured)
- All data local by default (Dexie); share feature optional and can be disabled
- Internationalization and extension store listings rely on proper _locales packaging
- Theming approach (updated):
  - System-first: relies on browser/OS prefers-color-scheme, no html/body theme classes
  - No localStorage persistence for theme; no DOM class toggling
- Firefox scripting limitation on built-in PDF viewer:
  - browser.scripting.executeScript can return no/undefined result or throw; we must always resolve content retrieval to avoid UI deadlocks.
  - Implemented in src/libs/get-html.ts with fallbacks using tab.url and type inference (pdf/html).

9) Testing/Quality Notes
- No dedicated test framework/scripts defined in package.json
- Manual verification across browsers per README; prioritize e2e sanity for:
  - Sidebar/web UI load + shortcuts
  - Provider connectivity (Ollama, Chrome AI, OpenAI-compatible)
  - Chat With Webpage parsing flows:
    - HTML pages
    - Firefox PDF (built-in viewer) with fallback path
    - YouTube pages/transcripts (fetching transcript via in-tab scraping)
  - Vector store ingest/retrieve
  - Theme smoke tests: verify Tailwind dark variants, custom CSS media queries, AntD algorithm switching
  - Background-triggered events (context menus, YouTube summarize) should be deduped and gated during streaming

10) Versioning and Release
- Build scripts create per-target bundles (build/*); zip tasks for store submissions
- Track both manifest.version (extension) and package.json version (npm package)
- Postinstall step ensures WXT preparedness

11) Browser-Specific Constraints and Implemented Solutions (New)
- Firefox:
  - content retrieval on PDF viewer: executeScript may fail or return nothing
    - Solution: src/libs/get-html.ts always resolves; fallback to { url: tab.url, content: "", type: inferred } to prevent hangs.
  - Sidebar lifecycle can cause duplicate background events (e.g., context menu triggers while opening)
    - Solution: src/routes/sidepanel-chat.tsx adds a streaming guard and dedupes background-triggered messages by a stable key (type:text).
- Cross-browser parity:
  - Changes are safe for Chromium/Edge paths and maintain identical UX.

Appendix: Key Files
- wxt.config.ts, tailwind.config.js (darkMode: "media"), postcss.config.js, tsconfig.json, .prettierrc.cjs
- src/models/*, src/services/*, src/libs/*, src/db/*, src/routes/*
- src/hooks/useDarkmode.tsx (system-only mode hook)
- src/libs/get-html.ts (content retrieval fallbacks), src/routes/sidepanel-chat.tsx (background dedupe + streaming guard), src/hooks/useMessage.tsx (embedding reuse keying)
- docs/ (VitePress)
