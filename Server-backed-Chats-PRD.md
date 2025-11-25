## Server-backed Chats PRD

### Goal
Unify local and server-backed conversations so users can browse, open, and continue server-side chats directly from the chat history sidebar, while keeping existing local history fully functional. When resuming a server chat, new turns should be appended to the server conversation and reflected in the extension UI with minimal friction.

### Success Criteria
- Users can see a **Server chats** section in the chat history sidebar when connected to a tldw server.
- Clicking a server-backed conversation loads its full transcript into the main chat view.
- Sending new messages while a server conversation is active appends both user and assistant turns to the corresponding `/api/v1/chats/{id}` resource.
- Local (Dexie) history continues to work exactly as before; offline users can still chat and review local history.
- The UI clearly differentiates local vs. server chats and fails gracefully if server history is unavailable.
- Chat completions continue to be generated via the existing model pipeline (`ChatTldw` → `/chat/completions`); `/api/v1/chats` is used as a persistence log, not as the primary completion surface.

### In Scope (v1)
- **Server history listing**
  - Fetch server conversations from `/api/v1/chats/` when the connection is healthy.
  - Display them in a dedicated section in the options chat sidebar (`History` drawer) with title and basic metadata.
  - Support simple title-based filtering using the existing search box.
- **Server-backed resume**
  - Loading a server chat populates the transcript in the Playground view and marks that session as server-backed.
  - New turns (user and assistant) for that session are mirrored to `/api/v1/chats/{id}/messages` in addition to local Dexie history.
  - Clearing the chat exits “server-backed” mode and returns to purely local behavior.
- **Local history parity**
  - Local chat history UI (date-grouped sections, pinning, rename, delete, pagination) remains unchanged.
  - Local-only chats continue to be created and stored in IndexedDB even when server history is available.
- **Error handling**
  - If server history fetch fails (auth error, offline, 5xx), show a non-blocking error state for server chats while leaving local history intact.
  - If loading a specific server chat fails, keep the current conversation visible and surface a toast error.

### Out of Scope (v1)
- Sidepanel-specific server history UI or resume (v1 focuses on the options/Playground experience).
- Cross-device synchronization UX beyond what the server already provides (no new “multi-device” flows).
- Importing existing local Dexie histories into `/api/v1/chats` in bulk (can be a future migration feature).
- Advanced server-side search or filtering (e.g., semantic search across all chats).
- Fine-grained server message edit/delete from the extension; v1 is append-only from the client’s perspective.
- Editing or branching a server-backed conversation only affects the local Dexie copy; the server-side `/api/v1/chats` history is not rewritten in v1.

### Users & Flows

#### Primary Users
- **Local + server users**: have a tldw server configured and already use the Web UI or API for chat.
- **Extension-first users**: primarily use the extension UI but want their conversations persisted server-side.

#### Key Flows

1. **Browse existing server chats**
   - Preconditions: tldw server configured, API key valid, connectivity OK.
   - User opens the history sidebar from the Playground header.
   - Local histories appear as today (grouped by date).
   - A “Server chats” section appears below, listing recent `/api/v1/chats` with titles.
   - User can filter by title using the existing search box; server list updates client-side.

2. **Open and resume a server chat**
   - From the “Server chats” section, user clicks a conversation.
   - The extension:
     - Clears any active local history selection.
     - Fetches `/api/v1/chats/{id}/messages` (excluding deleted messages).
     - Maps server messages into the existing transcript format and renders them in the Playground.
     - Marks this session as server-backed (stores the server chat id).
   - User types a new message and sends:
     - Local Dexie history is updated as usual.
     - Server receives new `user` and `assistant` messages via `/api/v1/chats/{id}/messages`.

3. **Start a new local chat**
   - User clears the current chat or clicks “New chat.”
   - The extension:
     - Resets local history id.
     - Resets the server chat id (exiting server-backed mode).
   - Subsequent messages create/use a purely local Dexie history as before.

4. **Offline or server-unavailable behavior**
   - If the server is offline or misconfigured:
     - The “Server chats” section does not appear or shows a small “Server history unavailable” message.
     - Local history remains accessible and fully functional.
   - If a server chat fails to load:
     - The existing conversation stays on screen.
     - User sees an inline error/notification with guidance to check connection/settings.

### UX & UI

#### Sidebar Layout (Options Playground)
- **Search input**: unchanged; searches local history and filters server chats by title.
- **Local history sections**:
  - Grouped by Pinned / Today / Yesterday / Last 7 Days / Older.
  - Per-chat row styling unchanged, with existing icons for Copilot/branch sources.
- **Server chats section**:
  - Header label: “Server chats”.
  - Flat list of server conversations sorted by `updated_at` descending (most recently updated first), without date grouping.
  - Each row shows:
    - Title (single-line, truncated).
    - Secondary label “Server”.
  - Selected server chat is highlighted with the same selection style used for local history.
- **States**:
  - Loading: small skeleton block under the section header.
  - Empty: if there are no server chats, the section is omitted; if both local and server are empty, the global “No chat history” empty state appears.
  - Error (server history): optional small text in the server section; must not hide local content.

#### Conversation View (Playground)
- When a server chat is active:
  - Transcript shows server messages using the same bubble styling as local messages (no new chrome required).
  - Future enhancement (optional): a small “Server-backed” indicator near the title or header.
- Sending messages:
  - UX identical to the existing Playground experience (labels, buttons, queued messages).
  - Only subtle behavior difference is that the same turn is also persisted on the server.

### Data & Storage

#### Local (Extension)
- **Dexie chat history** (unchanged):
  - `chatHistories` + `messages` tables for local conversations.
  - History id (`historyId`) identifies the active local chat.
- **Server session tracking**:
  - `serverChatId` in `useStoreMessageOption` marks the currently active server chat id or `null` for local-only.
  - Reset on “New chat”, “Clear chat”, or when switching sessions.
 - **Source of truth**:
   - For rendering the transcript, the extension’s local state (`history` + `messages`) remains the source of truth. `/api/v1/chats` is treated as an append-only log that the client keeps in sync on a best-effort basis.

#### Server
- `/api/v1/chats/`:
  - Used to list server conversations (`ServerChatSummary`).
  - `id`, `title`, `created_at`, `updated_at`, optional `source`/`character_id`.
- `/api/v1/chats/{id}/messages`:
  - Used to:
    - Load the full server conversation when resuming.
    - Append new `user` and `assistant` messages on send.
  - For v1, only `role` + `content` (and optional `image_base64` in the future) are required.
  - Attachments (files/docs/images) are not mirrored in v1; they remain local-only and are not encoded into server messages yet.
 - Character chat sessions (`/api/v1/character-chat/...` and related endpoints) remain separate and are not covered by this PRD; the extension continues to use the existing character chat flow for those.

### Logic & Architecture

#### Server History Fetch
- Hook: `useServerChatHistory(searchQuery)`:
  - Reads `isConnected` from `useConnectionState`.
  - When connected, calls `tldwClient.listChats({ limit: 100, ordering: "-updated_at" })`.
  - Maps raw results to `ServerChatHistoryItem` with `createdAtMs`/`updatedAtMs`.
  - Applies client-side title filtering based on the search query.
  - Exposes `data`, `status`, and `isLoading` for UI.

#### Loading a Server Conversation
- On server chat click:
  - Clear local `historyId`, set `serverChatId` to the server chat’s id.
  - Call `tldwClient.listChatMessages(id, { include_deleted: "false" })`.
  - Map `ServerChatMessage[]` to:
    - Chat memory array (`role`, `content`) for the chat modes.
    - UI messages array (`isBot`, `name`, `message`, etc.).
  - Update `setHistory(...)`, `setMessages(...)`, and update the page title.

#### Sending Messages in Server-backed Mode
- The main Playground chat pipeline (`useMessageOption`) stays in control of:
  - Rendering UI messages.
  - Streaming model responses via the existing chat modes and model selection logic.
  - Persisting local history (Dexie) using `saveMessageOnSuccess`.
- When `serverChatId` is non-null and a normal turn completes:
  - The same turn is mirrored to `/api/v1/chats/{id}/messages`:
    - `user` message with `content = message`.
    - `assistant` message with `content = fullText`.
  - Mirroring is best-effort and does not block the UI; errors are logged and swallowed.
  - Assistant replies are always generated via the existing completion pipeline (`ChatTldw` / `/chat/completions`); `/api/v1/chats/{id}/messages` is only used to record the final turns.

#### Exiting Server-backed Mode
- `clearChat()`:
  - Clears messages/history and `historyId` as today.
  - Resets `serverChatId` to `null`.
- Selecting a local history item:
  - Sets `historyId` to a Dexie id and clears `serverChatId`.
- Invariant:
  - At most one of `historyId` or `serverChatId` is non-null at any given time. Selecting a server chat clears `historyId`, and selecting a local chat clears `serverChatId`.

### Error Handling & Edge Cases
- **Server offline/unreachable**:
  - `useServerChatHistory` is disabled when `isConnected` is false.
  - No server chats section is rendered; local history remains.
- **Auth or API errors when listing chats**:
  - The server chats section can show a minimal error hint (copy tbd), but local history is not affected.
- **Errors when loading a specific server chat**:
  - Catch and display a toast: “Failed to load server chat. Check your connection and try again.”
  - Do not clear the current conversation.
- **Errors when mirroring messages to server**:
  - Do not surface to the user in v1; maintain local behavior.
  - Consider telemetry hooks in the future.
- **Offline-queued messages**:
  - Queued offline messages are only guaranteed to be stored and replayed locally. In v1 they are not guaranteed to be backfilled into `/api/v1/chats` after connectivity is restored.

### Security & Privacy
- Reuse existing tldw server auth flows (API key / tokens) and `bgRequest` wiring.
- Do not log chat content or API keys in console or network helpers.
- All new server calls (list chats, list messages, add messages) go through the existing background proxy and tldw client abstractions.

### Metrics & Observability (future)
- Track (optionally, in a privacy-preserving way):
  - Number of users who open server chats from the sidebar.
  - Frequency of errors when listing or loading server chats.
  - Ratio of server-backed vs local-only conversations.
- These metrics can inform whether to invest further in server-side search, cross-device flows, or automatic migration.

### Risks & Mitigations
- **Confusion between local and server chats**
  - Mitigation: separate “Server chats” section with a clear label; optional badge in the conversation view; respect existing local grouping.
- **Partial sync (local saved, server append fails)**
  - Mitigation: server append is best-effort and non-blocking; local history remains source of truth for the extension. Future versions may surface explicit sync status.
- **Server API incompatibilities**
  - Mitigation: rely on the canonical `/api/v1/chats` endpoints from tldw_server; type responses defensively and handle missing fields.

### Acceptance Tests (High Level)
- With a healthy server and at least one existing `/api/v1/chats` record:
  - The “Server chats” section appears in the options sidebar.
  - Clicking a server chat loads its messages into the Playground transcript without errors.
- While a server chat is active:
  - Sending a new message results in:
    - A visible user + assistant turn in the UI.
    - Two corresponding messages (`role: "user"` and `role: "assistant"`) added to `/api/v1/chats/{id}/messages`.
- After clearing the chat:
  - The transcript resets and `serverChatId` is cleared.
  - Subsequent messages create or reuse a local Dexie history only (no new messages appended to the previous server chat).
- With the server offline or misconfigured:
  - Local history sections remain fully functional.
  - The “Server chats” section does not appear or shows a small “server history unavailable” hint; there are no crashes or blocking spinners.

### Rollout Plan
- **v1**
  - Server chats section in the options sidebar.
  - Load + render server-backed conversations.
  - Append new turns to server chats while preserving local history.
- **v1.x (future)**
  - Surface a visual indicator in the header when a server chat is active.
  - Add a “Save this local chat to server” action to create a new `/api/v1/chats` resource from an existing Dexie conversation.
  - Extend to sidepanel chat history if usage warrants it.
  - Add server-side search or filtering for server chats (e.g., `/api/v1/chats?query=`) and a sidebar filter control to view `[All | Local | Server]` conversations.

### Implementation Notes (Code Pointers)

- `src/services/tldw/TldwApiClient.ts`
  - `ServerChatSummary`, `ServerChatMessage` types.
  - `listChats`, `createChat`, `getChat`, `updateChat`, `listChatMessages`, `addChatMessage` for `/api/v1/chats` and `/messages`.
- `src/hooks/useServerChatHistory.ts`
  - React Query hook that lists server chats when connected and exposes them to the sidebar.
- `src/hooks/useConnectionState.ts` / `useServerOnline`
  - Provide connection status used to gate server history fetching and to disable server-backed behavior when offline.
- `src/components/Option/Sidebar.tsx`
  - Existing local Dexie history UI.
  - New “Server chats” section, click handler to load a server conversation and set `serverChatId`.
- `src/store/option.tsx`
  - Shared `serverChatId` / `setServerChatId` fields in `useStoreMessageOption`.
- `src/hooks/useMessageOption.tsx`
  - Main Playground chat pipeline.
  - Wraps `createSaveMessageOnSuccess` to mirror new turns to `/api/v1/chats/{id}/messages` when `serverChatId` is set.
