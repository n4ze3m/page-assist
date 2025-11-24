# PRD: Local vs Remote Parsing Modes

## Background
- Current build bundles heavy parsing (PageAssist, html2canvas, Cheerio/Readability, Dexie DB, OCR/PDF helpers) into the extension.
- Some users prefer a lighter install (smaller bundle, fewer local permissions) and are willing to rely on the tldw_server for parsing/ingest.
- Others need offline/local parsing for privacy, reliability, or low-latency workflows.

## Goals
- Offer two install/runtime profiles:
  - **Light (remote parsing)**: minimal client bundle; all page/file parsing happens on tldw_server.
  - **Heavy (local parsing)**: includes in-browser parsing (HTML/PDF extraction, screenshotting, local vector store).
- Allow the user (or admin) to choose and switch mode with clear UX and fallbacks.
- Keep feature parity where practical; when not, surface clear messaging and server-side alternatives.

## Non-Goals
- Replacing server-side parsing implementation details.
- Introducing new parsing features beyond current client/server capabilities.

## Personas / Use Cases
- Privacy-conscious or offline users → Heavy/local mode.
- Managed deployments or low-footprint devices → Light/remote mode.
- Power users needing fast selection helpers without server round-trips → Heavy/local.

## Modes & Behaviors
- **Light (remote)**:
  - Excludes/lazy-loads heavy deps (html2canvas, Cheerio/Readability, Dexie PageAssist DB, OCR assets, PDF worker).
  - Context actions send URLs/content to server for processing; sidebar shows server results.
  - Local ingestion/parsing UI shows “Processed on server” badges; features unavailable locally are gated with call-to-action to enable Heavy.
- **Heavy (local)**:
  - Ships or on-demand loads local parsers, HTML/PDF loaders, screenshot capture, local vector DB, OCR (already toggled), PDF worker.
  - Selection helpers, page ingest, and media processing can run locally without server dependency (except for LLM calls).

## User Flows / UX
- Settings → System (or a new “Parsing mode”) toggle: `Light (Server parsing)` / `Heavy (Local parsing)`.
- Surface current mode in sidebar header and Quick Ingest dialogs (badge + tooltip).
- When a feature is unavailable in Light mode, show inline hint + “Enable local parsing” button that flips the setting (confirmation required).
- Install/first-run: default to Light; prompt to enable Heavy if offline parsing is desired.

## Functional Requirements
- Config key persisted (storage) and respected across entries (sidebar, options, background).
- Light mode:
  - Context menu “Send/Process” routes to server endpoints; no local DOM scraping.
  - Selection helpers send raw text to server; no local PageAssist extraction.
  - Disable or replace local vector store operations with server RAG where possible.
- Heavy mode:
  - Enable local parsing pipeline (HTML/PDF loaders, text splitter, local vector store, screenshot capture).
  - Preserve offline behavior for selection helpers and ingest where supported today.
- Telemetry/logging hook: record mode selection (if allowed) to assess adoption (no PII).
- Backward compatibility: default behavior matches current (Heavy) until rollout plan decides otherwise.

## Technical Approach (proposed)
- **Build split**: introduce two build targets or a build flag to exclude heavy deps from Light bundles (tree-shake PageAssist parsing, html2canvas, Cheerio/Readability, Dexie DB, OCR assets, PDF worker).
- **Runtime gating**:
  - Feature gates around parsing paths (page ingest, selection helpers, Quick Ingest local option, local vector store) controlled by the mode flag.
  - Dynamic imports for heavy modules even in Heavy mode to keep initial load small.
- **Server fallback**:
  - Ensure server endpoints can accept raw HTML/URL for processing when local parsing is off.
  - Add capability check; if server lacks required endpoints, surface warning when in Light mode.
- **Packaging**:
  - Option A: Two zipped artifacts (light/heavy).
  - Option B: Single artifact with lazy heavy modules + Settings toggle (keeps store distribution simpler).
- **Cache**: For Heavy mode, cache downloaded assets (OCR lang, PDF worker if CDN) per current approach.

## Dependencies
- tldw_server must support remote parsing endpoints for parity (URLs, file uploads).
- Distribution pipeline needs to accommodate dual artifacts if we choose split builds.

## Risks / Mitigations
- Feature drift between modes → shared capability map and UI hints.
- Larger QA matrix (light vs heavy across browsers) → add smoke tests per mode.
- CDN reliance for heavy modules in Light mode (if user upgrades) → keep offline copy in Heavy builds.

## Metrics / Success
- Bundle size reduction for Light build (target: remove ~10–15 MB of heavy deps).
- Adoption rate of Light vs Heavy.
- Error rate for parsing actions in Light mode vs Heavy.

## Open Questions
- Should Light mode remove selection helper context menu items or keep them but server-route?
- Do we need policy controls to force a mode (enterprise)?
- Should OCR remain a separate toggle even in Heavy mode (currently yes)?
