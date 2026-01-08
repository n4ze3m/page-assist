# Progress: Page Assist

Last updated: 2026-01-07

1) What Works (Verified)
- Cross-browser extension structure using WXT with TARGET switching (chrome/edge, firefox).
- Sidebar and Web UI flows (routes under src/routes/*, entries for sidepanel/options/background).
- Provider adapters present: Ollama, Chrome AI (Gemini Nano), OpenAI-compatible (via openai SDK).
- RAG/Knowledge ingestion pipelines (loader/*, parser/*, libs/process-*; vector stores backed by Dexie).
- i18n wiring (src/i18n/*, public/_locales), global styling (Tailwind, AntD, Headless UI).
- Build/dev scripts for Chrome/Firefox/Edge; docs site using VitePress.
- CSP/permissions tailored per target; heavy deps externalized in build (langchain, @langchain/community).
- Keyboard shortcuts defined in manifest: Web UI (Ctrl+Shift+L), Side Panel (Ctrl+Shift+Y).
- Theming follows system preference:
  - Tailwind darkMode: "media" (no .dark class reliance).
  - Custom CSS uses @media (prefers-color-scheme: dark) for dark-specific rules.
  - Ant Design algorithm switches based on system via useDarkmode hook.
  - No DOM class mutations or localStorage overrides for theme.

2) What’s Left To Build / Improve
- Optional manual theme override:
  - If needed later, introduce data-theme="dark|light" with a small CSS variable override layer (without changing Tailwind darkMode back to "class").
- Verification and polish:
  - Manual test pass across Chrome/Firefox for page parsing (HTML, PDF, YouTube transcript), and background-triggered actions.
  - Confirm deduplication/streaming guard prevents duplicate or mid-stream submissions.
- Testing/QA:
  - Add unit/e2e sanity tests and/or CI.
  - Theme smoke tests (light/dark) for core screens.
- Performance/Profiling:
  - Measure open-to-first-response latency and parsing/embedding bottlenecks.
- Docs:
  - Document Firefox-specific content retrieval fallbacks and background message gating.

3) Current Status (Config/Versions/Build)
- Extension manifest version (wxt.config.ts): 1.5.44
- package.json version: 1.0.9
- Build outputs to build/ with per-target permissions/CSP:
  - Chromium (MV3): sidePanel, declarativeNetRequest, host permissions http/https/file
  - Firefox (MV2-like): webRequest/webRequestBlocking, host patterns, gecko id
- Top-level await enabled via plugin; large deps externalized to reduce bundle size.
- All data stored locally by default (Dexie); share feature optional/disable-able.
- Theming implementation status (unchanged since last update):
  - tailwind.config.js -> darkMode: "media"
  - src/assets/tailwind.css -> @media (prefers-color-scheme: dark) for dark styles
  - src/hooks/useDarkmode.tsx -> system-only, no DOM class toggles/localStorage
  - src/routes/*-route.tsx -> no theme class injection
  - Settings UIs -> read-only “System: Light/Dark”

4) Known Issues / Risks
- Page parsing variability across sites/content types (HTML, PDF, OCR edge cases).
- Provider compatibility drift (Ollama/OpenAI-compatible/Chrome AI).
- Browser policy changes that may affect permissions/CSP or store submissions.
- Performance variability on user hardware (local model inference; heavy OCR/PDF flows).
- Absence of automated tests increases regression risk.

5) Evolution of Decisions (Highlights)
- Adapter pattern for providers to unify chat/streaming APIs.
- Dexie (IndexedDB) for persistence + vector stores for RAG.
- Externalize langchain/* in build to keep bundle lean.
- entries vs entries-firefox split with per-target manifest slices.
- Privacy-first default (no telemetry, no unsolicited network calls).
- Theming moved from class-based .dark to system-driven media queries.
- Chat with Page robustness improvements (this session):
  - Always-resolve content retrieval with Firefox-aware fallbacks (no hangs).
  - Deduplicate background-triggered actions and guard against mid-stream submissions.
  - Correct initial embedding cache keying by websiteUrl to avoid stale state.

6) Recent Session Summary (this session)
- Fixed Firefox hangs in content retrieval:
  - src/libs/get-html.ts: Always resolve getDataFromCurrentTab; if scripting.executeScript returns no/undefined result or throws, fallback using tab.url and infer type (pdf/html). Chrome path also guards against undefined results.
- Stabilized embedding reuse on first turn:
  - src/hooks/useMessage.tsx: On messages.length === 0, use keepTrackOfEmbedding[websiteUrl] to avoid stale currentURL during the same tick.
- Prevented duplicate/overlapping background submissions:
  - src/routes/sidepanel-chat.tsx: Added lastBgKeyRef for deduplication and a streaming guard so background-triggered submits run only after current stream ends.

7) Next Actions (Concrete)
- Manual QA
  - Firefox:
    - HTML page: single generation, response references page content.
    - PDF viewer: no hang; response produced with safe context behavior.
    - YouTube summarize (context menu): exactly one request; runs post-stream.
  - Chromium:
    - Repeat above flows to confirm parity and no regressions.
- Optional hardening
  - useBackgroundMessage: hold Port from browser.runtime.connect and disconnect on cleanup to avoid zombie ports.
  - Add 250–500ms debounce for background-triggered submissions.
- Testing/CI
  - Draft smoke tests for “chat with page” including Firefox PDF and YouTube flows.
  - Add telemetry/logging hooks (local only) for frequency of fallbacks and deduped events to guide further improvements.

Appendix: Quick References
- Fallbacks: src/libs/get-html.ts
- Embedding reuse: src/hooks/useMessage.tsx
- Background gating/dedupe: src/routes/sidepanel-chat.tsx
