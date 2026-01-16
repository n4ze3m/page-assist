# Tech Context: Page Assist

Last updated: 2026-01-13
Derived from: package.json, wxt.config.ts, repo structure

1. Core Stack

- Language: TypeScript (tsconfig.json; tsc compile script without emit)
- UI: React 18 + react-router-dom
- Styling/UI: Tailwind CSS (forms, typography), Ant Design (antd), Headless UI, CSS-in-JS via @ant-design/cssinjs
- Theming (updated):
  - Tailwind darkMode: "media" (system-driven via prefers-color-scheme)
  - Custom CSS uses @media (prefers-color-scheme: dark) for dark-specific rules
  - Mode exposure via a simple hook (no DOM class mutations); Ant Design algorithm switches based on the system-reflected mode
- State: Zustand; Async/Server state: @tanstack/react-query; Virtualization: @tanstack/react-virtual
- i18n: i18next + react-i18next (+ detection via i18next-browser-languagedetector), src/i18n/\* and extension \_locales
- Extension framework/build: WXT (wxt.config.ts)
- Docs: VitePress (docs/)
- Storage/DB: Dexie + dexie-react-hooks (IndexedDB)
- Parsing/Content: @mozilla/readability, cheerio, html-to-text, pdfjs-dist, mammoth (DOCX), pa-tesseract.js (OCR)
- Rendering: react-markdown + rehype/remark (math via remark-math + rehype-katex/mathjax), react-syntax-highlighter
- Providers/Models: ollama, openai SDK; internal adapters in src/models/\* (ChatOllama, CustomChatOpenAI, ChatGoogleAI, ChatChromeAi)
- Embeddings/Vector: OAIEmbedding, OllamaEmbedding, ml-distance; vector stores in libs (PageAssistVectorStore, PAMemoryVectorStore)
- Notifications/TTS: react-toastify; services for notifications and TTS (openai-tts, elevenlabs)

2. Build/Dev Tooling

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

3. Manifest/Permissions/CSP (from wxt.config.ts)

- Permissions (Chromium/MV3): storage, sidePanel, activeTab, scripting, declarativeNetRequest, action, unlimitedStorage, contextMenus, tts, notifications
- Permissions (Firefox/MV2-like): storage, activeTab, scripting, unlimitedStorage, contextMenus, webRequest, webRequestBlocking, notifications, host patterns (http/https/file)
- Host permissions (Chromium): http/https/file
- Commands:
  - \_execute_action → Web UI (Ctrl+Shift+L)
  - execute_side_panel → Side panel (Ctrl+Shift+Y)
- CSP:
  - Chromium extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  - Firefox string includes worker-src and blob: allowances for PDF/Tesseract, etc.
- Names/Versions:
  - manifest.version: 1.5.44 (extension bundle)
  - package.json version: 1.1.0 (npm package)

4. Directory/Module Conventions

- entries/ and entries-firefox/: background.ts, \*.content.ts, sidepanel/, options/ per target
- src/routes/: route trees for sidepanel and options (chrome-route.tsx, firefox-route.tsx)
- src/services/: browser API integration, provider orchestration, OCR/TTS, model settings, application lifecycle
- src/models/: provider adapters and embedding utils
- src/libs/: data processing, parsing/extraction, pdf/pdfjs, export/import, notifications, runtime helpers
- src/db/: Dexie schema/models; vector persistence bindings
- src/loader/ & src/parser/: ingestion pipelines and site-specific parsers
- src/hooks/: UI/feature hooks; messaging, speech recognition, TTS, scrolling, keyboard, migrations, utilities
- src/public/: icons and \_locales; ocr assets under public/ocr
- Styling: tailwind.config.js + postcss.config.js; global src/assets/tailwind.css

5. Tooling/Style (Updated conventions)

- Prettier: 3.x with @plasmohq/prettier-plugin-sort-imports
- TypeScript: 5.3.x; @types for chrome, node, libs present
- Tailwind CSS utilities for ChatInput surfaces:
  - .pa-card (split across base, surface, interactive, and a [data-istemporary-chat] variant)
  - .pa-textarea, .pa-icon-button, .pa-controls
  - Prefer these utilities over long ad hoc className strings to ensure consistency and simplify UI changes.
- React form handling:
  - Always call e.preventDefault() in onSubmit handlers before delegating to submitForm to prevent page reload in extension UIs.
- Input/key handling:
  - Centralize Enter/Shift+Enter and IME/Firefox 'Process' key logic via useKeydownHandler; use extraGuard for mentions dropdown navigation.

6. Providers/Integrations

- Local:
  - Ollama via ollama npm package; runtime selection via services/model-settings and models/ChatOllama
  - Chrome AI (Gemini Nano) via models/ChatChromeAi (browser-provided)
- OpenAI-compatible:
  - openai SDK; CustomChatOpenAI adapter supports any OpenAI API-compatible endpoint
- Embeddings via OpenAI or Ollama adapters
- RAG flows use loaders + process-\* libs + vector stores (Dexie-backed)

7. ChatInput Consolidation (New)

- Shared controls under src/components/ChatInput/controls:
  - SpeechButton, StopButton, WebSearchToggle (switch|icon), ThinkingControls (ossLevels|toggle), UploadImageButton,
    UploadDocumentButton, ClearContextButton, VisionToggle, SubmitDropdown.
- Shared parts under src/components/ChatInput/parts:
  - ImagePreview (image header), DocumentsBar (selected docs list), FilesBar (uploaded files + retrieval toggle).
- Shared hooks under src/hooks/chat-input:
  - useSubmitValidation, useKeydownHandler.
- Integration:
  - Sidepanel/Chat/form.tsx and Option/Playground/PlaygroundForm.tsx delegate to shared controls/parts and prevent default on submit.

8. Constraints/Considerations

- MV3 (Chromium) vs MV2-like (Firefox) differences in APIs and CSP; managed in wxt.config.ts
- Heavy libraries (langchain) externalized to reduce bundle size
- Web features requiring wasm/worker/blob need CSP allowances (already configured)
- Data local by default; share optional and disabled by default in privacy-first mode
- Firefox scripting limitation on built-in PDF viewer handled with fallbacks in libs/get-html.ts

9. Testing/Quality

- Test runner: Vitest (vitest.config.ts) with React Testing Library.
- Global setup: test/setup/vitest.setup.ts; custom render with providers at test/utils/render.tsx.
- Mocks: test/mocks/browser.ts (webextension APIs), test/mocks/speech.ts (Speech/TTS APIs).
- Structure: **tests** colocated with components (e.g., src/components/ChatInput/controls/**tests**).
- Guidance: prefer accessible queries and user-event over snapshots; keep snapshots minimal.
- UI automation plan: `memory-bank/ui-ux-chat-automation-plan.md` (Playwright-based extension testing draft).

10. Versioning and Release

- Build scripts create per-target bundles under build/\*; zip tasks for store submissions
- Track both manifest.version (extension) and package.json version (npm)
- Postinstall step ensures WXT preparedness
