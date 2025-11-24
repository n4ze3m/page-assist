## Direct API Chatting PRD

### Goal
Enable chatting without a tldw server by using locally provided API keys for OpenAI-compatible endpoints. Provide a toggle between “Direct API chat” and “Server chat,” persist direct-mode conversations locally, and lay groundwork for future import into the server.

### Success Criteria
- Users can enable/disable Direct API chat via a clear toggle.
- Users can enter/manage local API keys/base URLs and models for direct chat.
- Chats work when no tldw server is configured or reachable.
- Direct-mode conversations are stored locally and isolated from server-backed history.
- UX clearly indicates current mode and limitations.
- Future import path is defined (not necessarily shipped in v1).

### In Scope (v1)
- UI toggle to switch between Direct API chat and Server chat.
- Local credentials & model configuration screen (OpenAI-compatible base URL, model, API key, optional headers).
- Direct chat flow using local keys; reuse existing chat UI where feasible.
- Local conversation storage (separate namespace from server conversations).
- Basic rate-limit/auth/error handling; per-provider headers.
- Mode indicator + warnings in Direct mode (e.g., no server-only features).
- Fallback: if server is unconfigured/unreachable and Direct mode has valid keys, offer Direct mode.
- Security: keys stay local; no logging of secrets.

### Out of Scope (v1)
- Import/sync of local conversations into the server (define schema/stubs only).
- Non-chat endpoints (media, RAG) via direct mode.
- Multi-user shared local configs.

### Users & Flows
- New users without a server: prompted to add local API key or set up server; can chat via Direct mode.
- Existing users with server: default to Server mode; can toggle to Direct mode and back.
- Offline users: Direct mode available if keys are set; otherwise prompt to add key.

### User Stories
- As a user without a server, I can add an API key and start chatting.
- As a user, I can switch between Direct and Server chat with a clear indicator.
- As a user, I can see Direct-mode conversations persist locally and not mix with server history.
- As a user, I get meaningful errors if the key/base URL is invalid.

### Experience & UI
- Settings: “Chat Mode” section with toggle: “Server chat” | “Direct API chat (local keys)”.
- Direct mode configuration:
  - Provider/API base URL (OpenAI-compatible), model selector or free text, API key input.
  - Optional custom headers (e.g., org, routing keys).
  - Test connection button (probe `/models` or `/chat/completions` dry-run).
- Chat UI:
  - Mode badge (Direct/Server), model display, per-message provider if applicable.
  - Inline errors for auth/429/5xx.
- Empty state: If no server and no direct config, prompt to add key or set up server.
- Data notice: “Messages stored locally only” in Direct mode.

### Data & Storage
- Local storage namespace: `directChat.config`, `directChat.conversations`.
- Conversation schema: id, title, createdAt, updatedAt, messages[], model, provider, baseUrl, mode=direct, metadata for future import.
- Keep Server-mode history separate; do not cross-pollinate.

### API/Logic
- Direct mode uses configured base URL + headers; supports OpenAI-compatible `/chat/completions` and `/models` probe.
- Validation: allow common provider patterns; reject obviously bad URLs; require key for protected endpoints.
- Timeouts/retries: reuse existing client defaults; expose per-mode timeout if available.
- Errors: map auth (401/403), quota (429), server (5xx), validation to user-friendly messages.

### Architecture
- Add mode to connection/store: `mode: 'server' | 'direct'`.
- Service abstraction: `ChatClient` interface with `ServerChatClient` and `DirectApiChatClient`; selector based on mode.
- Storage service for direct conversations (CRUD, list).
- Gate server-only features (RAG, media) in Direct mode; show tooltips/disable.

### Import (future)
- Define export format (JSON with messages, timestamps, model, baseUrl).
- Stub “Export for server import” action; actual server import API to be designed later.

### Risks/Mitigations
- Mode confusion → prominent badges, tooltips, settings summary.
- Key leakage/logging → never log keys; mask in UI; keep only local.
- Provider incompatibility → custom base URL + headers; graceful errors.
- Mixing histories → separate namespaces; mode-tagged conversations.

### Rollout Plan
- v1: Toggle, config UI, local storage, direct chat client, mode indicator, basic error handling.
- v1.1: Export format and manual export action.
- Later: Server import endpoint + migration flow.

### Acceptance Tests (high level)
- With no server and a valid direct config, chat succeeds and persists locally.
- With server configured, default to Server mode; toggling to Direct uses direct config.
- Mode badge updates; server-only actions disabled in Direct mode.
- Invalid key/base URL surfaces error without crashing.
- Direct-mode conversations remain after reload and are hidden in Server mode.
