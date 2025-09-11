# TL;DW Migration Plan — Replace Ollama with tldw_server

## Objective
- Rebrand the extension as the official tldw server browser extension.
- Remove Ollama-specific logic and move all functionality to tldw_server.
- Preserve existing user data where possible via key migration and compatibility shims.

## Guiding Principles
- Minimal disruption: keep UX and data intact where feasible.
- Compatibility first: introduce shims to unblock builds, then iteratively refactor.
- Provider abstraction: keep a clean service/model interface to simplify future providers.
- Incremental merges: land work in phases behind small, verifiable PRs.

---

## Phase 0 — Inventory and Baseline
- Audit references and entry points
  - Services: `src/services/ollama.ts`, `src/services/app.ts` (advanced Ollama settings, headers), `src/services/tldw-server.ts` (present; partial aliasing).
  - Models: `src/models/ChatOllama`, `src/models/index.ts` (uses `ChatOllama`, `isOllamaModel`), `src/models/embedding.ts` (uses `OllamaEmbeddingsPageAssist`).
  - Content/entries: `src/entries/hf-pull.content.ts`, `src/entries/ollama-pull.content.ts`, Firefox variants in `src/entries-firefox/*`. These detect/pull models via Ollama CLI references.
  - UI/routes: `src/components/Option/Settings/ollama.tsx`, `src/routes/options-settings-ollama.tsx`, `src/components/Option/Settings/general-settings.tsx` (Ollama status toggle), `src/components/Option/Settings/rag.tsx` (fetches ollama info), `src/services/title.ts`, `src/web/website/index.ts`, `src/web/web.ts`.
  - i18n and copy: multiple strings under `src/assets/locale/**` referencing “Ollama”.
  - Docs: `docs/connection-issue.md`, `CONTRIBUTING.md` (Ollama install), any readme/docs branding.
  - Background: `src/entries-firefox/background.ts` uses `isOllamaRunning()` and `streamDownload()`.
- Confirm build/runtime constraints
  - Ensure `wxt.config.ts` permissions for network requests match tldw_server endpoints (likely `http://localhost:8000` by default).
  - Confirm if CORS header rewriting currently in use for Ollama is necessary for tldw_server.

Artifacts to produce
- Migration PR checklist per phase
- Backward-compat toggles and storage key migration map

---

## Phase 1 — Introduce tldw_server Service Layer (Compatibility First)
Goal: Unblock the codebase by pointing current Ollama service calls to tldw_server equivalents with minimal code churn, then refactor call sites.

Steps
1) Define tldw_server client surface
   - Ensure `src/services/tldw-server.ts` exports equivalents for:
     - `getTldwServerURL()`, `setTldwServerURL(url)`
     - `isTldwServerRunning()`
     - Model list, embeddings, chat completions, RAG settings endpoints (parity with what `services/ollama.ts` provides to callers).
   - If missing, add fetch helpers (streaming and non-streaming) mirroring current Ollama helpers.

2) Add compatibility re-exports
   - Temporarily: in `src/services/tldw-server.ts`, re-export Ollama API names to map old imports:
     - `export const getOllamaURL = getTldwServerURL`, `setOllamaURL = setTldwServerURL`, `isOllamaRunning = isTldwServerRunning`, etc.
   - This appears partially present; review and complete export mapping for any other helpers used by UI/models.

3) Select default base URL
   - Default to `http://localhost:8000` (confirm with tldw team), normalize via existing `cleanUrl()` util pattern.

Deliverables
- `tldw-server.ts` exposes a complete, documented surface
- Project builds with current imports unchanged

---

## Phase 2 — Refactor Models to tldw_server
Goal: Replace ChatOllama and Ollama Embeddings with tldw_server implementations.

Steps
1) Create new model classes
   - `src/models/ChatTldw.ts` with the same adapter interface currently used by `ChatOllama` consumers (message streaming, tool-calls if any, abort handling).
   - `src/models/TldwEmbedding.ts` to replace `OllamaEmbeddingsPageAssist`.

2) Update model resolver logic
   - In `src/models/index.ts`:
     - Replace `isOllamaModel()` usage with `isTldwModel()` or generic provider gating.
     - Return `new ChatTldw({...})` where it returned `ChatOllama`.

3) Migrate embedding entry points
   - In `src/models/embedding.ts`, swap construction to `new TldwEmbeddingsPageAssist({...})` and update import paths.

4) Remove or alias old classes
   - Keep a thin alias export for one release (optional) then delete `ChatOllama` and `OllamaEmbedding` files.

Deliverables
- Chat and embeddings fully backed by tldw_server
- No direct references to `ChatOllama`/`OllamaEmbedding` in main paths

---

## Phase 3 — UI and Routes
Goal: Rebrand settings UI and general toggles; ensure configuration points to tldw_server.

Steps
1) Settings screens
   - Remove or repurpose `src/components/Option/Settings/ollama.tsx` → `tldw-server.tsx` (or fold into existing `src/components/Option/Settings/tldw.tsx`).
   - Replace keys: `ollamaEnabledStatus` → `tldwServerEnabled`, `checkOllamaStatus` → `checkTldwServerStatus`.
   - Update `src/routes/options-settings-ollama.tsx` to a new `options-settings-tldw.tsx` route and adjust nav labels.

2) RAG settings
   - `src/components/Option/Settings/rag.tsx` fetches Ollama info; point this to tldw_server info endpoints and shape data accordingly.

3) General settings
   - `src/components/Option/Settings/general-settings.tsx` toggle text and wiring to `checkTldwServerStatus`.

Deliverables
- A single, coherent tldw Server settings experience
- No Ollama-labeled routes or toggles visible in UI

---

## Phase 4 — Content Scripts and Background
Goal: Remove Ollama-specific “pull from website” flows; keep only flows that make sense with tldw_server.

Steps
1) Remove/replace HuggingFace and ollama.com pull listeners
   - Remove or disable `src/entries/hf-pull.content.ts`, `src/entries/ollama-pull.content.ts` and their Firefox variants, unless tldw_server supports equivalent operations.

2) Background health checks
   - `src/entries-firefox/background.ts`: swap `isOllamaRunning()` → `isTldwServerRunning()` and status badges/messages accordingly.

Deliverables
- No content scripts tied to Ollama CLI strings
- Background status based on tldw_server

---

## Phase 5 — Storage Key Migration
Goal: Migrate users’ existing settings seamlessly.

Steps
1) Define key map
   - `ollamaURL` → `tldwServerURL`
   - `ollamaEnabledStatus` → `tldwServerEnabled`
   - `checkOllamaStatus` → `checkTldwServerStatus`
   - `customOllamaHeaders` → `customTldwHeaders` (only if still needed)

2) On-update migration
   - Add a background/on-install migration script that, on first run of the new version:
     - If new key absent and old key present: copy value; then optionally remove old key after successful persist.
   - Log a one-time telemetry event or console info for diagnostics.

Deliverables
- Users keep configured URLs and toggles without re-entering data

---

## Phase 6 — i18n and Copy
Goal: Rebrand all user-facing text to “tldw server”.

Steps
1) Update strings
   - Replace occurrences of “Ollama” across `src/assets/locale/**` with “tldw server” or “tldw_server” per naming standard.
   - Keep keys stable if preferred; update values. Or introduce new keys and deprecate old in a follow-up.

2) Remove Ollama-specific help text
   - Delete or rewrite content about Ollama CORS rewrites and model pulling.

Deliverables
- UI text is fully tldw-branded in all supported languages

---

## Phase 7 — Build Config and Permissions
Goal: Align WXT/Tailwind and manifest with tldw_server networking and branding.

Steps
1) `wxt.config.ts` and manifest pieces
   - Update extension name, description, icons to tldw branding.
   - Host permissions: include `http://localhost:8000/*` by default and allow user-configured origins via dynamic rules if supported.
   - Remove `webRequest` permissions tied to Ollama header-rewrite if not needed for tldw_server.

2) Tailwind/theme
   - Update branding colors or logos if provided by tldw.

Deliverables
- Correct permissions for tldw_server endpoints
- Updated branding across the extension

---

## Phase 8 — Docs and Onboarding
Goal: Position the extension as the official tldw server browser extension.

Steps
1) Rewrite docs
   - Replace `docs/connection-issue.md` with tldw_server connection guidance.
   - Update `CONTRIBUTING.md`: remove Ollama install requirements; add tldw_server quickstart.
   - Update README and docs site metadata (VitePress under `docs/`).

2) Onboarding
   - Update any in-app onboarding or tooltips referencing Ollama.

Deliverables
- Clear, accurate docs for tldw users

---

## Phase 9 — QA and Smoke Tests
Goal: Verify parity and reliability across Chrome/Firefox/Edge.

Checklist
- Options pages load and save tldw settings
- Chat flows: prompt → streaming response from tldw_server
- Embeddings/RAG flows, if supported by tldw_server
- Network errors surfaced cleanly; retry/cancel works
- Background badge/status reflects tldw_server availability
- i18n renders correctly in at least EN + 2 other locales

Manual Commands
- `bun run compile` passes
- `bun run dev`/`dev:firefox` manual smoke tests
- `bun run build` and `bun run zip`

---

## Phase 10 — Cleanup and Removal
Goal: Eliminate dead code and Ollama-specific assets.

Steps
- Remove `src/services/ollama.ts`, `ChatOllama`, `OllamaEmbedding`, and related entries/routes once fully replaced.
- Remove unused locales/keys and docs pages after migration window.
- Purge feature flags or shims mapping Ollama → tldw_server.

Deliverables
- No Ollama code remains

---

## Rollout Strategy
- Branch: `feat/tldw-rebrand`.
- PR sequence: Phase 1 → 3 small PRs for Phase 2 (chat/embedding/index resolver) → Phase 3 (UI) → Phase 4/5 (background + migration) → Phase 6/7 (i18n/manifest) → Phase 8 (docs) → Phase 10 (cleanup).
- Tag a beta for community smoke testing before final release.

---

## Risks and Mitigations
- API surface mismatch: Define clear tldw_server API contracts early; add adapters if needed.
- CORS/network differences: Validate whether header rewrite is needed; adjust permissions accordingly.
- User confusion during rebrand: Provide a one-time in-app notice and docs redirect.
- Storage migration edge cases: Keep a read-only fallback for old keys for one release cycle.

---

## Open Questions
- Confirm default tldw_server URL/ports and authentication model.
- Confirm feature parity: embeddings, RAG, and any model-pull equivalents.
- Branding assets: final name, icons, and color tokens.
- Telemetry/analytics requirements (if any) for the official extension.

---

## Quick Reference — File Touch List (initial)
- Services: `src/services/tldw-server.ts`, remove/alias `src/services/ollama.ts`
- Models: `src/models/ChatTldw.ts`, `src/models/TldwEmbedding.ts`, update `src/models/index.ts`, `src/models/embedding.ts`
- UI/Routes: `src/components/Option/Settings/tldw.tsx` (consolidate), remove `ollama.tsx`; `src/routes/options-settings-tldw.tsx`
- Entries/Background: remove hf/ollama pull content scripts, update `background.ts`
- i18n: `src/assets/locale/**` value updates, remove Ollama-specific keys
- Docs: `docs/**` for rebrand and new connection guide
- Config: `wxt.config.ts` manifest fields and permissions
- Migration: add on-install/update script to migrate storage keys

