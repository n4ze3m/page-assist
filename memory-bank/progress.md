# Progress: Page Assist

Last updated: 2025-12-21

1) What Works (Verified)
- Cross-browser extension structure using WXT with TARGET switching (chrome/edge, firefox).
- Sidebar and Web UI flows (routes under src/routes/*, entries for sidepanel/options/background).
- Provider adapters present: Ollama, Chrome AI (Gemini Nano), OpenAI-compatible (via openai SDK).
- RAG/Knowledge ingestion pipelines (loader/*, parser/*, libs/process-*; vector stores backed by Dexie).
- i18n wiring (src/i18n/*, public/_locales), global styling (Tailwind, AntD, Headless UI).
- Build/dev scripts for Chrome/Firefox/Edge; docs site using VitePress.
- CSP/permissions tailored per target; heavy deps externalized in build (langchain, @langchain/community).
- Keyboard shortcuts defined in manifest: Web UI (Ctrl+Shift+L), Side Panel (Ctrl+Shift+Y).
- Theming now follows system preference:
  - Tailwind darkMode: "media" (no .dark class reliance).
  - Custom CSS uses @media (prefers-color-scheme: dark) for dark-specific rules.
  - Ant Design algorithm switches based on system via useDarkmode hook.
  - No DOM class mutations or localStorage overrides for theme.

2) What’s Left To Build / Improve
- Optional manual override strategy:
  - If needed later, introduce data-theme="dark|light" with a small CSS variable override layer (without changing Tailwind darkMode back to "class").
- Verification and polish:
  - Manual test pass across Chrome/Firefox in light/dark modes (Tailwind utilities, custom CSS for scrollbars/tables/shimmer, AntD components).
  - Scan and remove any remaining legacy .dark selectors (excluding comments/examples).
- Testing/QA:
  - Add unit/e2e sanity tests and/or CI.
  - Theme smoke tests (light/dark) for core screens.
- Performance/Profiling:
  - Measure open-to-first-response latency and parsing/embedding bottlenecks.
- Docs:
  - Note theming approach and rationale in developer documentation/troubleshooting.

3) Current Status (Config/Versions/Build)
- Extension manifest version (wxt.config.ts): 1.5.44
- package.json version: 1.0.9
- Build outputs to build/ with per-target permissions/CSP:
  - Chromium (MV3): sidePanel, declarativeNetRequest, host permissions http/https/file
  - Firefox (MV2-like): webRequest/webRequestBlocking, host patterns, gecko id
- Top-level await enabled via plugin; large deps externalized to reduce bundle size.
- All data stored locally by default (Dexie); share feature optional/disable-able.
- Theming implementation status:
  - tailwind.config.js -> darkMode: "media"
  - src/assets/tailwind.css -> @media (prefers-color-scheme: dark) for dark styles
  - src/hooks/useDarkmode.tsx -> system-only, no DOM class toggles/localStorage
  - src/routes/*-route.tsx -> removed theme class injection
  - Settings UIs show read-only “System: Light/Dark”; manual toggle removed

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

6) Recent Session Summary (this session)
- Implemented system-driven theming:
  - Tailwind darkMode: "media"
  - Replaced .dark CSS with @media (prefers-color-scheme: dark)
  - Simplified theme hook to reflect system preference only
  - Removed theme class injection in route wrappers
  - Replaced manual theme toggle with read-only system status in settings UIs
- Updated Memory Bank (activeContext) to reflect changes.

7) Next Actions (Concrete)
- Execute manual validation across light/dark in Chrome/Firefox for:
  - Tailwind dark: utilities, custom CSS (scrollbars/table/shimmer), AntD algorithm.
- Run a repo-wide scan for ".dark " usage outside comments and migrate if any remain.
- Decide on optional data-theme manual override and scope if requested.
- Draft a lightweight test/CI plan including theme smoke checks.
- Document theming approach in developer docs.

Appendix: Quick References
- Config: wxt.config.ts; tailwind.config.js (darkMode: "media")
- Hook: src/hooks/useDarkmode.tsx (system-only)
- CSS: src/assets/tailwind.css (media-query-based theming)
- Routes: src/routes/chrome-route.tsx, src/routes/firefox-route.tsx
- Settings: src/components/Option/Settings/general-settings.tsx, src/components/Sidepanel/Settings/body.tsx
