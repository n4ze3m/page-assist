# Project Brief: Page Assist

Last updated: 2025-12-20
Version observed: 1.0.9
Source of truth: README.md, docs/, package.json

1. Overview
Page Assist is an open-source browser extension that provides a sidebar and a full Web UI for interacting with locally running AI models. It enables users to chat with models from any webpage, extract page context, and operate in a privacy-first, local-first workflow.

2. Why this project exists
- Make local AI accessible everywhere during browsing.
- Provide a consistent UX (sidebar + web UI) across Chromium and Firefox.
- Preserve privacy by keeping data on-device, supporting local providers (e.g., Ollama, Chrome AI Gemini Nano) and OpenAI API–compatible endpoints (local or remote per user choice).

3. Goals and Success Criteria
3.1 Goals
- Provide a reliable sidebar surfaced on any webpage to interact with an AI model.
- Provide a full-featured Web UI (ChatGPT-like) within the extension.
- Enable “Chat With Webpage” to reason about the current tab’s content.
- Support multiple providers: Ollama, Chrome AI (Gemini Nano), OpenAI-compatible endpoints.
- Cross-browser support: Chrome/Chromium variants, Edge, Firefox (and others where feasible).
- Simple dev and build workflow using Bun or npm.

3.2 Success Criteria
- Sidebar opens quickly and can send/receive messages.
- Web UI works as a standalone chat interface with saved history.
- “Chat With Webpage” extracts page context accurately on common sites.
- Builds ship for Chrome/Edge/Firefox without code changes (single codebase).
- Users can configure providers without friction.
- No unsolicited data exfiltration; local storage by default.

4. Scope
In Scope
- Browser extension UI (Sidebar + Web UI).
- Local AI provider integration abstractions.
- Page parsing, summarization, Q&A for current tab (“Chat With Webpage”).
- Settings, shortcuts, and basic knowledge/document processing (as present in src/libs, loaders).
- Documentation site (docs/) using VitePress.

Out of Scope (initially)
- Managed cloud services or hosted backends.
- User accounts/sync across devices (unless browser storage sync is leveraged).
- Model training/fine-tuning pipelines.

5. Primary Users
- Privacy-conscious users running local models.
- Developers and power users wanting AI assistance during browsing.
- Researchers who need quick page summarization and Q&A.

6. Key Features (MVP+)
- Sidebar (global hotkey; per README default Ctrl+Shift+Y).
- Web UI (global hotkey; default Ctrl+Shift+L).
- Chat with webpage content.
- Provider support: Ollama, Chrome AI (Gemini Nano), OpenAI-compatible endpoints.
- Cross-browser builds (Chrome/Edge/Firefox).
- Local storage of data (Dexie/Zustand), export/import.

7. Non-Goals (for now)
- Fine-grained multi-tenant user management.
- Cloud data storage by default.
- Mobile browsers.

8. Technical Snapshot
- Language: TypeScript + React 18
- Extension framework: WXT (builds/zip for multiple browsers)
- Styling: Tailwind CSS, Ant Design (antd), Headless UI, CSS-in-JS for some cases
- State: Zustand; Queries/async: TanStack Query
- i18n: i18next + react-i18next
- Storage/DB: Dexie (IndexedDB) + dexie-react-hooks
- Parsing/Content: @mozilla/readability, cheerio, pdfjs, mammoth, tesseract (OCR)
- Build/Dev: Bun (preferred) or npm, VitePress for docs
- Docs: docs/ with vitepress

9. Constraints and Assumptions
- Must run within browser extension contexts (MV3-compatible via WXT).
- Must not send data to external services without explicit user configuration (privacy).
- Performance should be acceptable on typical laptops when using local providers.
- Cross-browser API differences managed via routing/entries for Chrome vs Firefox.

10. Release and Roadmap (from README)
- Done: Firefox support; More local AI providers.
- Upcoming: More customization options; Better UI/UX.

11. Risks
- Provider compatibility drift (API changes).
- Browser policy changes for extensions.
- Performance variability of local models on user hardware.
- Page parsing variability across diverse sites.

12. Keyboard Shortcuts (defaults)
- Open Sidebar: Ctrl+Shift+Y
- Open Web UI: Ctrl+Shift+L
- In-app shortcuts: New Chat (Ctrl+Shift+O), Toggle Sidebar (Ctrl+B), Focus Textarea (Shift+Esc), Toggle Chat Mode (Ctrl+E)

12. Privacy Principle
- No personal data collection.
- Share feature is opt-in and can be disabled.
- Data stored locally in browser storage.

Appendix: References
- README.md (installation, usage, privacy, links)
- docs/index.md (product intro)
- package.json (scripts/deps)
- docs/features/* (feature details)
