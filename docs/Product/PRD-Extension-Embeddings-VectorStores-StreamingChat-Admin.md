# PRD: Extend Custom Extension with Embeddings, Vector Stores, Streaming Character Chat, and Admin Placeholders

## Overview
Add first‑class support in the browser extension for:
- Embeddings operations (Local/HF prioritized in UI)
- Vector store management (CRUD, upsert, query) with import/export and metadata filters
- Streaming character chat and post‑stream persistence
- Admin placeholders for Jobs, Workflows, and Prompt Studio (WIP)

Target server: tldw_server2 (FastAPI). Client: custom-extension.

## Goals
- Expose embeddings create/batch and model discovery; highlight Local/HF providers in UI.
- Manage vector stores (create/list/get/update/delete) and vectors (upsert/list/delete/query).
- Add import/export for vector stores (JSON/CSV) and server‑side metadata filters.
- Support streaming character chat using the server’s SSE endpoint and persist streamed results.
- Ship admin placeholders for Jobs, Workflows, and Prompt Studio (no full UI yet).
- Introduce a discovery step that reads `/webui/config.json` for safe hints (mode, defaults, endpoints, providers) to seed onboarding and capability gating.

## Non‑Goals
- Full admin UX for jobs/workflows/prompt‑studio in this phase.
- Changing server behavior; we consume existing REST endpoints.
- Advanced vector visualizations beyond basic list/query and import/export.

## Personas
- Power user: runs local server, manages content/indices, uses streaming chat.
- Admin/developer: monitors jobs; tests workflows and prompt studio; needs basic hooks/placeholders.

## Assumptions
- Server exposes the endpoints listed below and is reachable.
- Auth modes supported:
  - Single‑user: `X-API-KEY` header
  - Multi‑user: `Authorization: Bearer <token>` with refresh
- The extension uses `background-proxy` to send requests and apply auth.

## Dependencies
- Existing services: `TldwApiClient`, `TldwAuth`, `background-proxy`.
- Server routers: embeddings, vector_stores, chats (character sessions), jobs_admin, workflows, prompt-studio.

## High‑Level Solution
1) Add new client services for embeddings and vector stores (with import/export helpers).
2) Extend chat client to call streaming character chat endpoints and a “persist after stream” endpoint.
3) Add admin placeholder services (jobs, workflows, prompt‑studio) with minimal methods; gate behind capability checks.
4) Add a discovery step `probeWebUIConfig(baseUrl)` to seed defaults and features; REST endpoints remain canonical.

## Server API Mapping (Canonical)

### Embeddings
- Create embeddings: `POST /api/v1/embeddings`
- Batch create: `POST /api/v1/embeddings/batch`
- Models: `GET /api/v1/embeddings/models`
- Model metadata: `GET /api/v1/embeddings/models/{model_id}`
- Providers config: `GET /api/v1/embeddings/providers-config`
- Health: `GET /api/v1/embeddings/health`

### Vector Stores (OpenAI‑like surface)
- Stores: `POST /api/v1/vector_stores`, `GET /api/v1/vector_stores`, `GET /api/v1/vector_stores/{store_id}`, `PATCH /api/v1/vector_stores/{store_id}`, `DELETE /api/v1/vector_stores/{store_id}`
- Vectors: `POST /api/v1/vector_stores/{store_id}/vectors`, `GET /api/v1/vector_stores/{store_id}/vectors`, `DELETE /api/v1/vector_stores/{store_id}/vectors/{vector_id}`
- Query: `POST /api/v1/vector_stores/{store_id}/query` (supports `query` or raw `vector`, `top_k`, `filter`)
- Optional: `POST /api/v1/vector_stores/create_from_media`

### Streaming Character Chat
- Prepare messages: `POST /api/v1/chats/{chat_id}/completions`
- Stream completion (SSE): `POST /api/v1/chats/{chat_id}/complete-v2` with `{"stream": true, ...}`
- Persist streamed content: `POST /api/v1/chats/{chat_id}/completions/persist`

### Admin (placeholders)
- Jobs Admin (examples): `GET /api/v1/jobs/queue/status`, `GET /api/v1/jobs/stats`, `GET /api/v1/jobs/list`, `GET /api/v1/jobs/events`, `GET /api/v1/jobs/events/stream`, `POST /api/v1/jobs/queue/control`
- Workflows (scaffolding): `GET /api/v1/workflows`, `POST /api/v1/workflows`, `POST /api/v1/workflows/run`, plus runs status/list
- Prompt Studio: `/api/v1/prompt-studio/projects`, `/api/v1/prompt-studio/prompts`, `/api/v1/prompt-studio/test-cases`, `/api/v1/prompt-studio/evaluations`

## Client Changes (Services)

### Discovery (safe hint layer; REST remains canonical)
- File: `custom-extension/src/services/tldw/TldwApiClient.ts`
- Add: `probeWebUIConfig(baseUrl)` → `{ mode, authHints, chatDefaults, endpoints, providers }`
  - Reads `/webui/config.json` (absolute URL). Caches in storage.
  - Use to:
    - Default `authMode` in onboarding (single vs multi).
    - Gate features (Embeddings/VectorStores/Admin) if endpoints/providers unavailable.
    - Seed `chat.default_save_to_db` in streaming chat UI.

### Embeddings
- File: `custom-extension/src/services/tldw/TldwEmbeddings.ts`
- Methods:
  - `createEmbedding({ input, model, provider?, encoding_format?, dimensions? })`
  - `createEmbeddingsBatch({ inputs, model, provider?, ... })`
  - `listEmbeddingModels()`, `getEmbeddingModel(id)`
  - `getEmbeddingProvidersConfig()`, `health()`
- UI priority: Local/HuggingFace surfaced first; others grouped under “Cloud.”

### Vector Stores
- File: `custom-extension/src/services/tldw/TldwVectorStores.ts`
- Methods:
  - Stores: `createStore({ name?, dimensions, embedding_model?, metadata? })`, `listStores()`, `getStore(id)`, `updateStore(id, patch)`, `deleteStore(id)`
  - Vectors: `upsertVectors(id, { records })`, `listVectors(id, params)`, `deleteVector(id, vectorId)`
  - Query: `query(id, { query? | vector?, top_k?, filter? })`
  - Import/Export helpers:
    - `importJSON(id, json, { batchSize? })`, `importCSV(id, csv, { mappings, batchSize? })`
    - `exportJSON(id, { filter?, pageSize? })`, `exportCSV(id, { filter?, pageSize? })`
- Import format: array/NDJSON of `{ id?, content? | values?, metadata? }`. CSV uses a mapping dialog (e.g., `content`, `values` as JSON array, optional `id`, `metadata` as JSON).

### Streaming Character Chat
- File: extend `custom-extension/src/services/tldw/TldwApiClient.ts`
- Methods:
  - `prepareCharacterCompletion(chatId, { include_character_context?, limit?, offset?, append_user_message? }) -> { messages }`
  - `streamCharacterChatCompletion(chatId, bodyWithStreamTrue): AsyncGenerator<string|json>` using `/api/v1/chats/{id}/complete-v2`
  - `persistStreamedAssistantMessage(chatId, { assistant_content, user_message_id?, tool_calls?, usage?, chat_rating? })`
- Notes:
  - Prefer the above over older `.../messages/stream` variants that don’t exist on the server.
  - Generic chat still uses `POST /api/v1/chat/completions` if the client builds messages.

### Admin Placeholders (read‑mostly for now)
- Jobs Admin: `custom-extension/src/services/tldw/admin/TldwJobsAdmin.ts`
  - `getQueueStatus()`, `setQueueFlags(flags)`, `listJobs(params)`, `getStats()`, `streamEvents(onEvent)`
- Workflows: `custom-extension/src/services/tldw/admin/TldwWorkflows.ts`
  - `listDefinitions()`, `createDefinition(def)`, `run(defOrId, inputs)`, `listRuns(params)`
- Prompt Studio: `custom-extension/src/services/tldw/admin/TldwPromptStudio.ts`
  - `listProjects()`, `listPrompts(projectId?)` and a “Run Prompt” UI action with a “WIP – Coming Soon” notice (no API call yet)

### Index Exports
- Update `custom-extension/src/services/tldw/index.ts` to export `tldwEmbeddings`, `tldwVectorStores`, and admin placeholders.

## Capability Gating
- File: `custom-extension/src/services/tldw/tldwCapabilities.ts` (new)
- Methods:
  - `hasEmbeddings()` → probe `/api/v1/embeddings/models` or `/api/v1/embeddings/health`
  - `hasVectorStores()` → probe `/api/v1/vector_stores`
  - `hasWorkflows()` → probe `/api/v1/workflows`
  - `hasPromptStudio()` → probe `/api/v1/prompt-studio/projects`
  - `hasJobsAdmin()` → probe `/api/v1/jobs/queue/status`
- UI will hide/disable features when probes fail (404/403/503) or config hints indicate unavailability.

## UX Flows
### Embeddings
- Select provider/model (Local/HF prioritized) → enter text(s) → create single/batch embeddings → show dimensions and vector length; for batch, show count and any errors.

### Vector Stores
- Create store with dimensions → upsert vectors (content or raw values) → query by text or vector (with metadata filters) → display ranked results with id/snippet/score/metadata → export results or full store (JSON/CSV).
- Import: validate format client‑side; batch upsert (e.g., 200–500) with progress and error tally; resumable by re‑uploading the remainder.
- Filters: metadata filter builder (key, operator, value) converted into query `filter` object sent to server.

### Streaming Character Chat
- Start stream (`complete-v2`) → incremental content appears → on complete, optional “Save to history” checkbox (default seeded from discovery’s `chat.default_save_to_db`) triggers persist call → message appended to history.

### Admin Placeholders
- Minimal “Admin” section with read‑only views where accessible; show “WIP – Coming Soon” for Prompt Studio Run Prompt; hide the section if capability checks fail.

## Error Handling
- 401/403: prompt re‑auth or show insufficient permissions banner.
- 404/503: hide feature via capability gating; show disabled state.
- SSE timeouts: idle timeout and abort; show retry CTA.
- Vector insert: validate dimensions; surface server mismatch errors cleanly.

## Security
- Single‑user: `X-API-KEY`; multi‑user: `Authorization: Bearer …` with refresh via `TldwAuth`.
- Never store provider API keys client‑side; rely on server configuration.
- `/webui/config.json` is a safe hint source; do not treat it as authoritative for secrets.

## Performance
- Use `bgStream` for SSE with keep‑alive and cancellation.
- Batch embeddings and vector upserts; page exports to avoid oversized responses.
- Debounce vector queries; cache model lists briefly.

## Telemetry (Optional)
- Minimal client logging; rely on server metrics and audit logs.

## Acceptance Criteria
- Embeddings: list models; create single and batch embeddings; show vector info.
- Vector stores: CRUD works; upsert/query/delete vectors; import/export JSON/CSV with filters and pagination.
- Streaming chat: stream via `/api/v1/chats/{id}/complete-v2`; cancel; persist after stream.
- Admin placeholders: visible when accessible; hidden otherwise; Prompt Studio shows “WIP – Coming Soon”.
- Discovery: `probeWebUIConfig` informs onboarding defaults, feature gating, and chat default save.
- Auth: both single‑user and multi‑user modes work.

## Milestones
1) Services scaffolding + capability gating + happy‑paths (no UI changes).
2) Minimal UI for embeddings/vector stores and streaming chat.
3) Admin placeholders + jobs events stream hook.
4) Polish, error states, and docs updates.

## Risks & Mitigations
- No dedicated server “export” endpoint → use paged list/query + client zip/stream; throttle requests.
- Filter expressiveness → rely on server’s `filter` object; document basic operators.
- Large imports → enforce client batch size; show partial failures and a concise resume path.

## References
- WebUI config hints at mode/auth/endpoints/defaults: `/webui/config.json`
- LLM discovery (canonical): `/api/v1/llm/models`, `/api/v1/llm/providers`, `/api/v1/llm/models/metadata`
- Embeddings (canonical): `/api/v1/embeddings` (+ `/batch`, `/models`, `/providers-config`, `/health`)
- Vector stores (canonical): `/api/v1/vector_stores` (+ vectors, query)
- Streaming character chat (canonical): `/api/v1/chats/{id}/complete-v2` and `/completions/persist`
