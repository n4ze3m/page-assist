# System Patterns: Page Assist

Last updated: 2025-12-21
Derived from: repo structure (src/*), wxt.config.ts, package.json

1) High-Level Architecture
- Browser Extension built with WXT:
  - Multiple targets via TARGET env: chrome (Chromium/Edge), firefox.
  - Separate entrypoint trees: entries/ (default), entries-firefox/ (Firefox-specific).
  - Output bundle to build/, manifest assembled from wxt.config.ts.
- UI Layer:
  - React 18 with react-router-dom routes in src/routes/* for sidepanel and options UIs.
  - Tailwind CSS + Ant Design + Headless UI for styling/components.
  - i18n via i18next/react-i18next; locales under src/public/_locales and src/i18n.
- Platform Scripts:
  - Background: src/entries/background.ts (+ Firefox variant).
  - Content scripts: src/entries/*.content.ts (+ Firefox variants) for page extraction and features like YouTube summarize, model pulls.
- Domain/Core Libraries:
  - Models and Providers: src/models/* (ChatOllama, CustomChatOpenAI, ChatGoogleAI, ChatChromeAi, Embeddings).
  - Storage/DB: src/db/* (Dexie models/index, vector store glue), Zustand app stores in src/store/*.
  - RAG / Knowledge: src/libs/* and loaders/parser for ingestion (PDF, DOCX, HTML, CSV, TXT, OCR) and vectorization.
  - Utilities: hooks/*, libs/* helpers (fetcher, get-html/screenshot, runtime, notifications).

2) Key Modules and Responsibilities
- entries/ and entries-firefox/:
  - Assemble runtime-specific scripts (background, content, sidepanel, options).
  - Bridge browser APIs (context menus, shortcuts, sidePanel).
- routes/*:
  - React routes for UI:
    - sidepanel-*.tsx: Chat panel.
    - option-*.tsx: Settings pages (model, openai, knowledge, prompt, share, about, chrome/firefox-specific).
  - chrome-route.tsx / firefox-route.tsx to mount platform-specific route trees.
- services/*:
  - Integrations and side-effect orchestration (chrome APIs, provider calls, OCR, TTS, model settings, application lifecycles).
- models/*:
  - Provider adapters for chat and embeddings:
    - ChatOllama, CustomChatOpenAI, ChatGoogleAI, ChatChromeAi, OAIEmbedding, OllamaEmbedding.
  - Unify streaming, chunking, and tokenization concerns via CustomAIMessageChunk and utils/.
- libs/*:
  - Data processing (process-knowledge, process-source), PDF/PDFJS wrappers, html parsing (cheerio, readability), export/import, notifications.
  - Vector stores: PageAssistVectorStore, PAMemoryVectorStore abstractions.
- db/*:
  - Dexie schema and tables for chats, knowledge, vectors, nicknames, openai configs.
- loader/* and parser/*:
  - Loaders for various file types and URLs; parsers for site-specific content (amazon, wiki, twitter, google docs/sheets, default).
- hooks/*:
  - Chat flows (useMessage, useMessageOption), background messaging (useBackgroundMessage), UX (useSmartScroll, useSpeechRecognition, useTTS), i18n/useI18n, keyboard handlers, debounce, migrations, etc.
- store/*:
  - Zustand state containers coordinating UI and services.

3) Important Data Flows
A. Chat With Webpage
- Trigger from UI (sidepanel) -> hooks/useMessage and message options.
- Acquire page content via libs/get-tab-contents.ts and/or @mozilla/readability, html-to-text, pdfjs, OCR when needed.
- Optionally chunk/index through libs/process-knowledge/process-source + embeddings (OAIEmbedding/OllamaEmbedding) -> vector store (Dexie-backed via PageAssistVectorStore/PAMemoryVectorStore).
- Query model via models/* adapter; stream responses -> UI render via react-markdown + syntax highlighter; optional TTS via services/openai-tts or elevenlabs.

B. Generic Chat
- UI -> models/* provider based on settings (services/model-settings).
- Stream handling through CustomAIMessageChunk; state persisted in Dexie/Zustand.

C. Knowledge Base / RAG
- Loaders ingest (csv, txt, docx, html, pdf-url/pdf) -> process pipelines -> vectors persisted in Dexie.
- Query flow augments prompts with retrieved chunks.

4) Cross-Browser Pattern
- WXT switches entrypointsDir and manifest slices by TARGET.
- Firefox: browser_specific_settings.gecko.id, different permissions (MV2-style array incl. webRequestBlocking), CSP string adjusted for worker-src and blob:.
- Chromium/Edge: MV3 permissions, sidePanel API, host_permissions.

5) Permissions and Capabilities
- Chrome MV3: storage, sidePanel, activeTab, scripting, declarativeNetRequest, action, unlimitedStorage, contextMenus, tts, notifications.
- Firefox MV2: storage, activeTab, scripting, unlimitedStorage, contextMenus, webRequest, webRequestBlocking, notifications, host patterns (http/https/file).
- Commands (shortcuts):
  - _execute_action -> Web UI (Ctrl+Shift+L)
  - execute_side_panel -> Side panel (Ctrl+Shift+Y)

6) Design Patterns and Practices
- Adapter pattern for model providers (uniform Chat interface).
- Repository/DAO-like separation via Dexie db/ models and libs vector stores.
- Hooks-based composition for UI behavior (separation of concerns, reuse).
- Unidirectional data flow: UI -> hooks -> services/models -> state stores -> UI.
- Feature-based directories with platform splits (entries vs entries-firefox).
- CSP-conscious rendering (wasm-unsafe-eval allowance for PDF/Tesseract etc.).

7) Critical Implementation Paths
- Provider selection and streaming:
  - services/model-settings.ts resolves active provider.
  - models/* handle streaming tokens -> hooks update UI incrementally.
- Content extraction robustness:
  - libs/get-html, get-tab-contents, pdf/pdfjs, mammoth for docx, tesseract OCR; fallbacks increase resilience across sites.
- Vector operations:
  - embeddings via OAIEmbedding/OllamaEmbedding; similarity via ml-distance; persistence in Dexie; paging in UI.
- Internationalization:
  - i18n folder + public/_locales for extension strings; runtime language detection.

8) Error Handling and Resilience
- Use of TanStack Query for retries/caching where remote-like calls exist.
- Graceful fallbacks if a provider is unavailable (e.g., default to different endpoint).
- Notifications via libs/send-notification.ts; toasts via react-toastify.

9) Performance Considerations
- Offload heavy parsing/embedding where possible; chunking strategies in process-* libs.
- Externalize big deps (langchain, @langchain/community) in build to reduce bundle load where appropriate.
- Virtualized lists via @tanstack/react-virtual for histories.

10) Security and Privacy
- All default storage local to browser (Dexie/IndexedDB).
- No unsolicited network calls; host_permissions only as needed.
- Share feature is optional and can be disabled.

11) Component Relationships (Selected)
- Sidepanel UI -> hooks/useMessage -> services/model-settings -> models/* -> state stores/db -> UI render.
- Options pages -> services/* (provider config, knowledge mgmt) -> db/models -> reflect in UI.
- Background/content -> libs/* extraction -> message passing to UI/services.

12) Theming Pattern (Updated)
- Tailwind darkMode is set to "media" to follow system color scheme via prefers-color-scheme, removing reliance on an html/body ".dark" class.
- Custom CSS replaces ".dark ..." selectors with @media (prefers-color-scheme: dark) equivalents for dark-specific styling (e.g., scrollbars, shimmer text, tables).
- No DOM class toggling and no localStorage persistence for theme. The useDarkmode hook only reflects system mode for UI logic (e.g., Ant Design algorithm selection).
- Route wrappers no longer inject "dark"/"light" classes; only font class ("arimo") is applied.
- Settings UIs surface a read-only label indicating current system theme ("System: Dark/Light") instead of a manual toggle.

Appendix: Notable Files
- wxt.config.ts (manifest, permissions, CSP, targets)
- src/entries/background.ts, *.content.ts (content features)
- src/routes/* (UI screens)
- src/models/* (provider adapters)
- src/db/*, src/libs/PageAssistVectorStore.ts, src/libs/PAMemoryVectorStore.ts
- src/loader/*, src/parser/*
