# New Sidepanel Chat Experience – PRD

## 1. Overview

This document defines a new experience for the sidepanel chat in the tldw Assistant extension.

The goals are to:

- Make the sidepanel feel like a first‑class chat client (not an afterthought).
- Ensure users can always locate and understand the composer, persistence mode, and key actions.
- Provide clear, contextual guidance in empty, loading, and error states.
- Align sidepanel behavior with the main options playground while preserving a compact, “always‑on” feel.

The redesigned sidepanel should pass existing Playwright UX tests and address issues surfaced by:

- `tests/e2e/ux-design-audit.spec.ts` (Chat + Sidepanel sections)
- `tests/e2e/sidepanel-first-run.spec.ts`
- `tests/e2e/sidepanel-bundle-smoke.spec.ts`
- `tests/e2e/chat-persistence-ux.spec.ts`
- `tests/e2e/chatStreaming.spec.ts`


## 2. Goals & Non‑Goals

### 2.1 Goals

- Make the chat input in the sidepanel:
  - Always visible,
  - Clearly interactive,
  - Keyboard‑first accessible.
- Provide helpful empty‑state guidance when there is no chat history.
- Convey persistence modes (local‑only vs temporary vs server‑backed) clearly and consistently.
- Surface model selection and connection status in a lightweight way so users know “who they’re talking to” and whether server features are available.
- Provide clear error and recovery states for connection/auth failures in the sidepanel context.
- Maintain parity with the main chat playground for core behaviors (streaming, persistence labels, connect hints).

### 2.2 Non‑Goals

- Redesigning the full options chat playground layout (tabs, settings, etc.).
- Changing the underlying persistence model (local IndexedDB/schema, server‑backed semantics).
- Implementing advanced features like multi‑conversation management, bookmarks, or complex “tool” UIs.
- Overhauling the entire sidepanel navigation/chrome beyond what’s needed for chat and quick actions.


## 3. Target Users & Scenarios

### 3.1 Personas

- **Focused researcher / knowledge worker**  
  Uses the sidepanel as an “assistant at hand” while browsing documentation, papers, or dashboards.

- **Note‑taker / student**  
  Frequently pulls in context from the current page, asks questions, and wants to keep a light mental model of where content is saved.

- **Ops / support engineer**  
  Uses the sidepanel as a quick diagnostic or triage companion, often juggling connection issues and limited time.

### 3.2 Key Scenarios

1. **First run (unconfigured)** — Opening the sidepanel before completing onboarding shows a connection card and a clear path to configure the server.
2. **Connected, fresh chat** — Sidepanel opens to an empty conversation with guidance and a ready‑focused composer.
3. **Ongoing chat** — Messages stream in with clear user/assistant styling and visible “thinking” indicators.
4. **Persistence control** — Users can see and change whether the current chat is:
   - Saved locally in the browser, or
   - Temporary (not saved), and (later) optionally:
   - Saved locally + on server.
5. **Connection/auth errors in sidepanel** — User attempts to send a message while server is misconfigured or API key invalid, and sees clear error + recovery affordances without getting stuck.
6. **Quick actions** — From the sidepanel, user can quickly:
   - Ingest/import the current page,
   - Jump to settings / diagnostics for connection issues,
   - Start a new chat / clear history.


## 4. Experience Architecture

### 4.1 High‑Level States

Sidepanel chat will explicitly support the following high‑level UI states:

1. **First‑run (unconfigured / disconnected)**  
   - Shared connection card, short explanation, buttons to “Open tldw server settings” and docs.

2. **Connected – Empty chat**  
   - No messages yet; empty state panel with guidance and example prompts; composer visible and focused.

3. **Connected – Active chat**  
   - List of messages (user/assistant) with clear visual differentiation and accessible ARIA labelling; active composer.

4. **Streaming / thinking**  
   - Assistant bubble with streaming text and visible “thinking” indicator (spinner or animated glyph).

5. **Error / degraded**  
   - Auth/connection issues surfaced via inline banners and call‑to‑action buttons (“Retry”, “Open settings”, etc.).


## 5. Detailed UX Design

### 5.1 Layout & Information Hierarchy

**Top area (Header row)** – always visible

- Left:
  - Small label: `tldw Assistant`
  - Secondary chip for connection state:
    - “Connected” / “Offline” / “Demo mode”
- Right:
  - Icon buttons:
    - `Health & diagnostics` (already used in tests)
    - `Settings` (gear icon → opens options settings in new tab)
    - `New chat` (broom or plus icon; resets chat messages but keeps persistence mode)

**Middle area (Messages list)** – scrollable

- `role="log"` with `aria-live="polite"` wrapping messages.
- Each message:
  - `role="article"` and `aria-label`:
    - User: text from `quickChatHelper.userMessageAria` (e.g., “Your message”).
    - Assistant: `quickChatHelper.assistantMessageAria` (e.g., “Assistant message”).
  - User bubbles right‑aligned; assistant left‑aligned.
- Streaming state:
  - “Typing” indicator appended to the last assistant message (e.g., blinking block or animated dots).

**Bottom area (Composer & persistence)** – fixed at bottom

- Multiline `textarea` or input:
  - Placeholder: `Type a message...`
  - Must be visible and enabled whenever the app isn’t in a hard error/connecting state.
- Adjacent controls:
  - `Send` button:
    - Visible, labeled “Send”.
    - Submits message as an alternative to `Enter`, especially helpful on touch devices and for discoverability.
  - Optional icon button for quick ingest (see 5.5).
- Beneath composer:
  - **Persistence mode label** (mirrors main chat):
    - “Saved locally in this browser only”
    - “Temporary chat: not saved in history”
    - “Saved Locally+Server”
  - One line of microcopy when promoting to server‑backed mode:
    - E.g., “Saved locally + on your server — you can reopen it from server history.”


### 5.2 First‑Run & Connection Card (Unconfigured)

**Trigger:** Connection store indicates `UNCONFIGURED` phase and/or no server URL configured.

- Show a prominent card at the top of the sidepanel:
  - Title: “Connect tldw Assistant to your server”
  - Body copy:
    - High‑level explanation: “tldw Assistant needs your tldw_server URL and API key to work with your data.”
    - Microcopy referencing existing test:
      - “Settings open in a new browser tab.”
  - CTAs:
    - Primary button: `Open tldw server settings`  
      - Opens `options.html#/settings/tldw` in a new tab where supported; otherwise accepts `chrome://extensions/?options=` URL (per tests).
    - Secondary text link: `Learn how tldw_server works` (docs).

**Requirements / Test Hooks**

- `sidepanel-first-run.spec.ts` expects:
  - Text matching `/Connect tldw Assistant to your server/i`.
  - Text matching `/Settings open in a new browser tab/i`.
  - A button that, when clicked, opens an options/settings page matching `/chrome:\/\/extensions\/\?options=|options\.html#\/settings\/tldw/i`.


### 5.3 Connected – Empty Chat State

**Trigger:** Connected or demo mode; no messages yet for the current conversation.

- Messages area:
  - Centered empty‑state panel with:
    - Heading: “Start a conversation”
    - Body:
      - Short explanation of what you can ask (examples of tasks).
    - Example prompts (bulleted or button list):
      - “Summarize this page”
      - “Explain this code”
      - “Generate flashcards from this article”

- Composer:
  - `textarea` with placeholder `/type.*message|ask|chat/i` to satisfy UX checks.
  - On focus, the empty‑state panel remains visible until a message is sent; once first message is sent, list transitions to standard message view.

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` expects:
  - Text matching `/start.*conversation|type.*message|ask.*question/i` for empty state.
  - A visible message input; failure should not occur where tests log a CRITICAL “Message input not visible or discoverable in sidepanel”.
  - Optional: visible hints about model selection or “no model configured” warning.


### 5.4 Connected – Active Chat & Streaming

**Messages**

- User messages:
  - Right‑aligned, distinct background, label “You”.
- Assistant messages:
  - Left‑aligned, allow markdown rendering, code blocks, etc.

**Streaming UX**

- On send:
  - Immediately render user message in history; do not wait for server.
  - Add assistant bubble in a “thinking” state:
    - Body: ephemeral placeholder or blank with typing indicator.
  - When tokens arrive (streaming SSE):
    - Update assistant bubble text incrementally.
  - When complete:
    - Remove “thinking” indicator.

**Requirements / Test Hooks**

- Align with `tests/e2e/chatStreaming.spec.ts`:
  - After sending a message, UI should eventually show assistant text matching `/Hello!?/` from `MockTldwServer`.
  - There should be some visible indicator of “loading/thinking” while awaiting response (spinner, “Thinking…”, etc.) as asserted by UX audit.


### 5.5 Quick Actions & Sidepanel‑Specific Shortcuts

**Quick ingest/import**

- Icon button in header or adjacent to composer:
  - Label: “Ingest” or “Save page”.
  - Tooltip / aria‑label: “Save current page on server”.
- Behavior:
  - Mirrors existing ingest actions in main UI (Quick Ingest / media pipeline).
  - On click:
    - Show small dropdown:
      - “Save current page on server”
      - Potential future options (e.g. “Summarize this page & save”).
  - Reflect currently configured server; show a connection hint if unavailable.

**Settings entry**

- Gear icon in header:
  - `aria-label="Settings"` or similar (for tests and accessibility).
  - On click: opens Options settings (same URL as connection card CTAs).

**New chat**

- Button or icon labeled `/New chat|Clear/`:
  - Clears current sidepanel conversation messages but does not change persistence mode or connection state.

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` expects:
  - Quick ingest/import action visible or logged as an enhancement when missing.
  - Settings access visible in the sidepanel.
  - Icon buttons with proper `title` or `aria-label` values to avoid “Icon button lacks tooltip or accessible label”.


### 5.6 Persistence Modes & Labels

**Modes**

1. **Local‑only** – default for disconnected or “local only” usage.
2. **Temporary** – chat not saved to history; toggled via a switch.
3. **Locally + Server** – chat saved both locally and on server (when available).

**UI Controls**

- Toggle switch near persistence label:
  - Accessible name must match `/Save chat|Save to history|Temporary chat/i`.
  - When toggled:
    - Switch between “Saved locally in this browser only” and “Temporary chat: not saved in history”.
- Button to promote chat to server‑backed state (when connected & supported):
  - Label: “Also save this chat to server”.
  - On click:
    - Show one‑time explainer (inline text block):
      - “Saved locally + on your server — you can reopen it from server history.”

**Requirements / Test Hooks**

- `chat-persistence-ux.spec.ts` and sidepanel tests expect:
  - Text for local‑only mode: `/Saved locally in this browser only/i`.
  - Text for temporary mode: `/Temporary chat: not saved in history/i`.
  - For server‑backed promotion:
    - Button text `/Also save this chat to server/i`.
    - Explanatory text including `/Saved locally \+ on your server/i` and `/reopen it from server history/i`.
  - Sidepanel version should show the same labels and behaviors as the main chat playground.


### 5.7 Connection & Auth Error Handling in Sidepanel

**Scenarios**

1. **Server unreachable mid‑chat**
   - While sending a message, connection check fails or server is offline.
2. **API key invalid/expired**
   - Server responds 401/403 on chat or model endpoints.

**UI Behaviors**

- Inline error banner at top of sidepanel messages area:
  - Title (server unreachable):
    - “Cannot connect to server”
  - Body:
    - “Check your server settings or try again.”
  - Actions:
    - `Retry` – re‑fires the connection check.
    - `Open settings` – opens Options settings for tldw server.
- Inline error for invalid API key:
  - Text matching `/invalid.*key|unauthorized|authentication.*failed|401/i`.
  - CTA: `Update API key` or `Open tldw server settings`.

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` expects:
  - For invalid API key:
    - Clear error message.
    - Quick link to settings or a button to fix the key.
  - For server disconnection:
    - A clear error message when the server is unreachable.
    - A prominent `Retry` button.
    - A link/button to open settings to fix the URL/API key.


### 5.8 Accessibility & Keyboard Navigation

**Focus behavior**

- On opening sidepanel and connected state:
  - Focus MUST move directly to the composer (`Type a message...`).
- Tab order:
  - From header buttons → messages (if necessary) → composer → persistence controls.
- Focus visible:
  - All interactive elements must have a clearly visible focus outline or equivalent in both light and dark modes.

**ARIA & roles**

- Messages container should use `role="log"` and `aria-live="polite"` to announce new messages.
- Error banners use `role="alert"` for screen reader announcement.
- Icon buttons must have `aria-label` or visible text.

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` (Navigation & Accessibility) expects:
  - Tab navigation to land on interactive elements (not zero focusable items).
  - Visible focus rings or other indicators; absence will be flagged as major issues.
  - For connected sidepanel, no redundant “Start chatting” button; composer should be enabled and focused.
- `sidepanel-first-run.spec.ts` expects:
  - Connected sidepanel case to focus the composer immediately.


## 6. Functional Requirements

1. **Composer visibility**
   - The chat input must be present and visible in all non‑blocking states (unconfigured, connected, offline with local‑only fallback).

2. **State synchronization**
   - Sidepanel chat should reuse the same chat state/persistence model as the main options chat where appropriate (or maintain a clear parallel structure).
   - Connection state (phases, errorKind, knowledgeStatus) must be reflected consistently in both sidepanel and options.

3. **Recovery actions**
   - All error banners must provide at least one recovery action (Retry, Open Settings).

4. **Integration with connection store hooks**
   - Must respect test hooks in `src/store/connection.tsx`:
     - `__tldw_useConnectionStore`
     - `__tldw_enableOfflineBypass`
     - `__tldw_forceUnconfigured`

5. **Internationalization**

   - All new strings must be added under `src/assets/locale/*` and `_locales/*` as applicable.
   - Chat‑specific ARIA labels may reuse or extend existing `quickChatHelper.*` keys to avoid duplication.


## 7. Acceptance Criteria & QA

### 7.1 Automated Test Alignment

- `ux-design-audit.spec.ts`
  - Chat empty state guidance is visible.
  - Composer is visible and discoverable (no CRITICAL “message input not visible”).
  - Loading/typing indicator appears during response generation.
  - Model selection visibility is improved or at least signposted.
  - Sidepanel quick actions (ingest, settings, new chat) are accessible and labeled.

- `sidepanel-first-run.spec.ts`
  - Connection card and new‑tab settings behavior work as expected.
  - Connected sidepanel focuses the composer without extra “Start chatting” CTA.

- `sidepanel-bundle-smoke.spec.ts`
  - Packaged build shows the connection card and tldw server settings button in sidepanel.

- `chat-persistence-ux.spec.ts`
  - Persistence labels and behaviors match those in the playground.

- `chatStreaming.spec.ts`
  - Streaming chat works and surfaces tokens correctly.

### 7.2 Manual QA Scenarios

- Sidepanel opened:
  - Before onboarding (unconfigured).
  - Immediately after completing onboarding.
  - With server disconnected (simulate by stopping MockTldwServer).
  - With invalid API key configured.
  - After toggling persistence modes and promoting a chat to server‑backed.
  - Using keyboard only (Tab/Shift+Tab, Enter, Space).


## 8. Open Questions

1. Should the sidepanel maintain a separate “quick” chat history from the main playground, or share a common message store?
2. Should model selection in the sidepanel be a fully interactive dropdown, or a link prompting the user to configure models in the main Options UI?
3. How aggressively should the sidepanel surface non‑chat actions (e.g., RAG search, flashcard generation) without overwhelming the constrained UI?
4. Should we support sidepanel‑only “scratch” conversations that are never shown in main history, beyond the existing temporary mode?

These can be refined during design review and implementation planning.

