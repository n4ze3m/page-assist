## Quick Ingest Modal PRD

### Goal
Deliver a two-stage Quick Ingest modal that handles hybrid inputs (files + URLs), exposes per-item controls without overwhelming the user, and speeds up multi-item ingestion with clear status, presets, and retries.

### Success Criteria
- Users can add files and URLs in one flow and see them queued immediately.
- Queue rows show type, status (Default/Custom/Needs review), and quick actions (remove, select).
- The Inspector shows contextual settings per type while keeping common fields consistent across items.
- Bulk actions work (clear all, apply preset, edit common settings for selected items).
- Ingest CTA reflects the queue count (“Ingest N items”) and is blocked with clear reasons when needed.
- Progress and errors are surfaced inline and with a global toast; failed items are retryable.

### In Scope (v1)
- Hybrid input surface: drag/drop files, browse files, paste URLs (comma or newline separated) with validation.
- Queue list with item anatomy: type icon, name, status badge, meta (size/pages/duration), remove, selection.
- Status badges: Default (gray), Custom (blue), Needs review (orange) for auth/password/oversize issues.
- Inspector (right drawer/slide-over): common settings at top, then type-specific sections for Video/Audio/Docs/Web.
- Type-specific controls: video captions/transcribe/frame extraction; audio transcribe/diarize/language; docs OCR/page range/image extraction; web crawl depth/main-content-only/screenshot.
- Bulk actions: Clear all; Apply preset to selected; Edit common settings for selected.
- Footer: primary CTA “Ingest N items”, secondary cancel; mode toggle (store vs process-only); inline progress bar and retry failed.
- Error/empty states: invalid URLs inline, needs-auth/password flags, size cap warning; empty helper text for supported types and limits.
- Keyboard/accessibility: Enter to add URL, Esc to close inspector, focus states on dropzone.

### Out of Scope (v1)
- Preset management UI beyond select/apply (no create/edit flows here).
- Multi-step auth flows (only surface “needs auth”).
- Full file preview; only name/meta shown.
- Cross-session queue persistence.

### Users & Flows
- New user with files: drags files into dropzone → rows appear → tweak per type → ingest.
- Researcher with mixed sources: pastes multiple URLs → rows staged → selects a row to tweak custom settings → ingests all.
- Power user: selects several items → applies preset → edits common settings → ingests → retries failures if any.

### User Stories
- As a user, I can drop files and paste URLs together and see them queued with type detection.
- As a user, I can tell which items use defaults vs. custom settings and which need attention.
- As a user, I can adjust per-item (and per-type) settings without losing my place in the queue.
- As a user, I can apply a preset to selected items to avoid repetitive configuration.
- As a user, I can see ingest progress and retry failed items quickly.

### Experience & UI
- Layout: split pane; left = Input + Queue; right = Inspector slide-over (overlays on small screens).
- Input area: dashed dropzone with “Drag and drop files”, “Browse files”, “Paste from clipboard”; URL field below with “Paste URLs (comma/newline)” + Add button; inline invalid URL warning.
- Queue list: scrollable; row = type icon, truncated name, status badge, meta (size/duration/pages), remove button; active row highlights and opens Inspector; inline warnings for auth/password/oversize.
- Status badges: Default (gray), Custom (blue when edited), Needs review (orange when blocked).
- Inspector: header “Settings for {item}” + type pill; common settings always at top (Title, Tags, Destination, Permissions); below tabs/accordions (General, AI Processing, Destination, Permissions) with type-specific controls; any change immediately marks row Custom.
- Bulk header: shows count; Clear all; when selection present, show Apply preset dropdown and Edit common settings.
- Footer: mode toggle (store vs process-only), primary CTA “Ingest N items”, disabled state explains why; inline progress bar with counts/elapsed; “Retry failed” when applicable.
- Empty state: helper bullets for supported types, size limits, auth requirements.
- Notifications: inline row errors + global toast summary; “Retry failed” repopulates failed items.

### Data & Storage
- Queue item: id, name/url, detected type, status badge state, meta (size/pages/duration), flags (needsAuth, passwordProtected, oversized), per-item overrides reference.
- Common settings: title, tags, destination folder, permissions; applied consistently.
- Type-specific settings per item: video {transcribe, captions, frameExtraction, language}, audio {transcribe, diarize, language}, docs {ocr, pageRange, extractImages, language}, web {crawlDepth, mainContentOnly, screenshot}.
- Preset reference: id/name applied to selected items (preset definitions stored elsewhere).
- No queue persistence across sessions.

### API/Logic
- Input parsing: detect URLs (comma/newline separated); detect file type from extension/MIME; validate URL; flag needs-auth/password if signaled by backend or heuristics.
- Ingest payload: URLs + file blobs + per-item overrides + common settings + mode.
- Progress channel: streaming progress updates (processed/total, per-item status); error codes mapped to user-friendly text.
- Retry failed: requeue failed items (files/URLs) with previous settings where possible.

### Architecture
- UI state: left pane queue (items + selection), right pane inspector (active item), shared common settings, presets selection, progress.
- Services: ingest client capable of mixed payload (URLs + files), progress listener, retry helper.
- Responsiveness: Inspector overlays on small screens; maintains scroll position.

### Risks & Mitigations
- Overwhelm in Inspector → common-first layout, tabs/accordions, concise helper text.
- Ambiguous status → explicit badges with tooltips and inline reasons.
- Large queues → virtualized/scrollable list; avoid jank by limiting per-row re-render.
- Errors buried → per-row inline errors + global toast + retry failed action.
- Mode confusion → processing mode toggle labeled and placed near primary CTA.

### Rollout Plan
- v1: Input + queue + inspector slide-over, status badges, per-type controls, bulk clear/apply preset (apply only), retry failed, progress bar.
- v1.1: Preset creation/editing, saved queue defaults, richer auth handling.
- v1.2: Cross-session queue persistence, previews, deeper validations.

### Acceptance Tests (high level)
- Can drop files and paste multiple URLs; rows appear with detected types and Default badge.
- Selecting a row opens Inspector; changing a control sets badge to Custom.
- Needs-review items block ingest with a clear message.
- Bulk Clear All removes items; Apply preset marks selected items Custom.
- Ingest with mixed files/URLs shows progress and completes; failures appear with retry working.
- Mode toggle switches label and payload path (store vs process-only).
