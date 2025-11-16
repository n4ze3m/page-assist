# Connection, Empty States & First-Run UX PRD

## 1. Overview

This PRD defines a set of UX improvements to the extension’s options/home view and to the empty states of all major feature views (Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground, Settings).

The goal is to:

- Make it immediately clear what users should do when the extension is “Searching for your tldw server”.
- Provide meaningful, differentiated empty states for each feature so users understand what each mode does, even before they are connected or have any data.
- Align the chat composer behavior with connection readiness so users aren’t surprised by failed sends.
- Surface core non-chat capabilities (Review, Media, Knowledge, etc.) as first-class navigation instead of hiding them behind “More tools”.
- Replace jargon-heavy “Core / RAG” status pills with clearer, accessible connection status indicators.

These changes are Chrome-first but should apply cleanly to Firefox/Edge.

---

## 2. Problem Statement

### 2.1 Connection / Options View

Current behavior (from Playwright Chrome runs and screenshots):

- The main options screen often sits in a “Searching for your tldw server” state.
- There is no obvious next step or primary action in the central card (e.g., connect, change server, open settings).
- “Diagnostics” is a small, low-contrast link in the top-right corner; many users will not notice it.
- If the server is unreachable, the UI continues to show “Searching…” instead of a clear error with guidance.

User impact:

- New users are unsure what the extension needs from them (e.g., “Do I need to run something?”, “What URL do I use?”).
- Even experienced users may not know how to quickly correct a misconfigured URL or API key.
- Perceived reliability suffers because “Searching…” feels like a hang rather than a clear, recoverable state.

### 2.2 Feature Views Empty States

Current behavior:

- Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground, and Settings views show almost identical blank layouts.
- There’s little or no feature-specific guidance, examples, or calls to action.
- The only clearly differentiated UI is in the header and the bottom composer; the body of the page looks the same.

User impact:

- Users can’t easily understand what each mode is for, especially before they connect to a server.
- Discoverability of key capabilities (reviewing media, building knowledge, flashcards, prompts, etc.) is low.
- The extension feels “empty” and unfinished until the user stumbles into a successful interaction.

---

## 3. Goals & Non-Goals

### 3.1 Goals

- Provide a clear, guided path to a “successfully connected” state from the options/home view.
- Ensure the options view always presents an obvious primary action (or pair of actions) for the user’s current state.
- Differentiate feature views through meaningful, feature-specific empty states (copy, iconography, and actions).
- Reduce user confusion around server connectivity and configuration.
- Improve accessibility and clarity of connection status and diagnostics.

### 3.2 Non-Goals

- Changing the underlying connection/auth mechanics with tldw_server.
- Implementing new long-running connection flows (e.g. full OAuth) beyond what already exists.
- Replacing the overall visual design system (typography, spacing, base components); we may add or rearrange components using the existing design system but are not introducing a new visual language or re-theming the extension.
- Adding full-blown interactive multi-step tutorials; we focus on lightweight in-context guidance and examples.

---

## 4. Users & Use Cases

Primary personas:

- **Developer / technical user** running tldw_server locally on `http://127.0.0.1:8000` or a custom URL.
- **Power user / knowledge worker** who has access to a shared tldw_server but may not manage it.

Key use cases:

1. First-time install: user opens options, sees connection UI, and configures server URL/API key.
2. Returning user: tldw_server is already running; user wants to confirm status and start chatting quickly.
3. Troubleshooting: server is down, misconfigured, or moved; user needs clear diagnostics and a way to fix settings.
4. Feature discovery: user explores each view (Review, Media, Knowledge, etc.) to learn what the extension can do.

---

## 5. UX / Product Requirements

### 5.1 Connection / Options Home View

#### 5.1.1 States

The options/home view must support and visually distinguish at least these states:

1. **No configuration / first run**
   - No server URL or API key stored yet.
2. **Searching / connecting**
   - Configuration exists; the extension is trying to reach the server.
3. **Connected**
   - Successful health check to the configured server.
4. **Error / cannot reach server**
   - Timed out or failed to reach the configured server after N seconds.

These connection states are global; all surfaces (options, sidepanel, header status pills, composer) must derive their connection state from a single shared source so they remain consistent.

#### 5.1.2 Primary Card Layout

In all states, the central card on the options view must:

- Occupy the central focus of the page (above the fold on standard laptop resolutions).
- Present a prominent **primary button** that makes the next step obvious.
- Include a short, plain-language explanation of what’s happening.
- Expose the current server URL and allow editing / changing it.
- Provide a clearly visible link or button to **Diagnostics** / troubleshooting.

#### 5.1.3 State-Specific Requirements

**(A) No configuration / first run**

- Show a clear headline, e.g., “Connect tldw Assistant to your server”.
- Show a brief description: what tldw_server is and why it’s required.
- Provide a primary button: **“Set up server”**.
  - Clicking opens a configuration UI (server URL, auth mode, API key) or navigates to the existing settings route.
- Provide secondary actions:
  - “Open diagnostics” (opens the Diagnostics view or documentation).
  - Optional: “Try a demo” (if we implement a demo mode).

**(B) Searching / connecting**

- Headline: “Searching for your tldw server…”.
- Subtext: “We’re trying to reach `{{serverUrl}}`. This usually takes a few seconds.”
- Show a status indicator (spinner / animated dot) and last checked time.
- Primary button: **“Change server”**.
  - Opens the same configuration UI as above.
- Secondary action: **“View diagnostics”** (button or clearly styled link inside the card).
- If the spinner runs longer than the shared `CONNECTION_TIMEOUT_MS` value (e.g., 8–10 seconds), auto-transition to the Error state.

**(C) Connected**

- Headline: “Connected to your tldw server”.
- Subtext: “You’re connected to `{{serverUrl}}`. Start chatting when you’re ready.”
- Show a clear success indicator (icon + green label).
- Primary button: **“Start chatting”**.
  - Scrolls focus to the chat composer or opens the primary chat experience.
- Secondary actions:
  - “Change server”
  - “View diagnostics”

**(D) Error / cannot reach server**

- Headline: “Can’t reach your tldw server”.
- Subtext should include:
  - The URL being attempted.
  - A simple sentence describing likely causes (server not running, wrong URL, network issues).
- Primary button: **“Retry connection”**.
- Secondary button: **“Change server”**.
- Tertiary link in-card: **“Diagnostics”** (linking to the Diagnostics view or troubleshooting docs).
- If possible, show a short inline error summary (e.g., HTTP status or timeout).

#### 5.1.4 Diagnostics Entry Point

- The existing “Diagnostics” link must be discoverable without relying on the top-right corner.
- Requirement: **Add a Diagnostics entry point inside the central card** in all non-connected states (No configuration, Searching, Error).
- Optional: keep the header “Diagnostics” link for quick access, but it should not be the only way in.

#### 5.1.5 Copy & Jargon

- Avoid jargon such as “Core / RAG” in primary user-facing copy; see §5.5 for the required connection status labels and behavior.
- If “Core” / “RAG” need to exist for internal debug or developer views, they must not be exposed as the only labels in production UI.
- All copy should use second person (“you”, “your server”) and avoid “localhost” unless necessary; show URLs in code-style.

#### 5.1.x Acceptance Criteria (High Level)

- When the server is unreachable for longer than `CONNECTION_TIMEOUT_MS`, opening the Options view shows an error card with “Retry connection”, “Change server”, and a visible Diagnostics link.
- When no server URL is configured, the Options view shows a first-run card with “Set up server” and a way to open Diagnostics.
- When the server health check succeeds, the Options view shows a connected state with “Start chatting”; activating it focuses or reveals the chat composer.

---

### 5.2 Feature Empty States (Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground, Settings)

For each feature view, define a simple empty-state block that appears when:

- The user has no relevant data (e.g., no past sessions, no items ingested), **or**
- The user is not connected to a server and the feature depends on server-side capabilities.

#### 5.2.1 Shared Requirements

All feature empty states must:

- Be visually distinct from the main connection card but stylistically consistent (same design system).
- Live in the main content area above the chat composer.
- Include:
  - Feature name or label.
  - 1–2 sentence description of what the feature does.
  - 1–3 bullet examples of “things you can do here”.
  - A single, clear **primary action** button if applicable.
  - Optional secondary link (e.g., “View docs”, “See example”).
- Respect connection state:
  - When **not connected**, the primary action should point back to “Connect server” rather than trying to run feature actions that will fail.
  - When **connected**, empty states should encourage first-time usage, not just connection.

#### 5.2.2 Feature-Specific Intent & Actions (Draft)

These are content/behavior intentions, not exact copy. Exact strings belong in i18n files.

- **Review**
  - Purpose: Turn meeting transcripts or videos into summaries, action items, and highlights.
  - Examples: “Summarize a YouTube video”, “Extract action items from a meeting transcript”.
  - Primary action (connected): “Open a video or transcript to review”.

- **Media**
  - Purpose: Work with single media items (podcasts, recordings, etc.) for transcription and analysis.
  - Examples: “Upload an audio file”, “Ask questions about a recording”.
  - Primary action (connected): “Choose a media file”.

- **Knowledge**
  - Purpose: Manage knowledge sources and search across them (RAG).
  - Examples: “Add a new document source”, “Search across all ingested items”.
  - Primary action (connected): “Add knowledge source”.

- **Notes**
  - Purpose: Capture and organize free-form notes connected to tldw insights.
  - Examples: “Create a new note”, “Link notes to a meeting or transcript”.
  - Primary action (connected): “Create note”.

- **Prompts**
  - Purpose: Save and reuse prompt templates for common tasks.
  - Examples: “Create a prompt for weekly summaries”, “Share prompts across your team”.
  - Primary action (connected): “Create prompt”.

- **Flashcards**
  - Purpose: Turn content into spaced-repetition flashcards.
  - Examples: “Generate flashcards from a lecture”, “Review cards created from your notes”.
  - Primary action (connected): “Generate flashcards”.

- **Playground**
  - Purpose: Experiment with different models, parameters, and prompt structures.
  - Examples: “Test a new prompt”, “Compare responses across models”.
  - Primary action (connected): “Start a playground chat”.

- **Settings**
  - Purpose: Configure extension behavior and server connection.
  - Empty state: Instead of a blank page, show a brief explanation of main categories (General, tldw server, etc.).
  - Primary action: “Configure server connection” when not connected; otherwise highlight key toggles or sections.

#### 5.2.3 Connection-Aware Behavior

- When **not connected**:
  - Each feature empty state should prominently show a small inline notice: “To use {{featureName}}, first connect to your tldw server.”
  - Primary action: **“Connect to server”** linking back to the options/home connection UI or settings section.

- When **connected** but with no data:
  - The notice should not re-emphasize server connection; instead, focus on first steps inside that feature.
  - Primary actions should trigger real feature workflows (open modals, start flows, navigate to relevant routes).

- When **not connected**, connection messaging takes precedence: show the global connection card or banner first; feature-specific empty states may appear below it or be suppressed until the connection is established.

#### 5.2.x Acceptance Criteria (High Level)

- When a user is connected and opens a feature view (e.g., Review, Media, Knowledge) with no data, they see a feature-specific empty state with a title, description, at least one example, and a primary action.
- When a user is not connected and opens any feature view, they see a prominent notice telling them to connect first and a primary action that navigates to the connection/settings UI.
- After a user connects successfully and returns to a feature view, the global connection messaging no longer blocks the feature-specific empty state or normal feature content.

### 5.3 Chat Composer Behavior When Not Connected

The chat composer should always reflect connection readiness so users are not surprised when messages fail.

These composer behaviors apply to both the Web UI (options view) and the sidepanel; both must derive state from the same shared connection status.

#### 5.3.1 Disabled / “Not Ready” State

- When the extension is in **No configuration**, **Searching / connecting**, or **Error / cannot reach server** states, the composer must visually indicate that it is **not ready** to send messages.
- Requirements for this state:
  - The Send button is disabled and clearly styled as inactive.
  - The input area is de-emphasized (e.g., reduced contrast, subtle overlay) without compromising readability.
  - Hovering or focusing the Send button shows a tooltip such as: “Connect to your tldw server to start chatting.”
  - A short inline helper message is shown near the composer (above or below) explaining that messages won’t send until the server is reachable.

#### 5.3.2 Placeholder & Helper Copy

- While disconnected, the composer placeholder must change from a generic prompt (e.g., “Type a message…”) to something connection-aware, such as:
  - “Waiting for your server — set it up in Settings.”
  - This text should be driven by i18n and safe for reuse across options and sidepanel views.
- On the first focus or click in the composer while disconnected:
  - Show a small inline banner or toast near the composer with:
    - A brief explanation that the server is not connected.
    - A clear button: **“Connect to server”** (navigates to the connection/settings view).
    - Optionally, a “View diagnostics” link.

#### 5.3.3 Optional Queued Messages (Nice-to-Have)

- Future enhancement (non-blocking for this iteration):
  - Allow users to type while disconnected and queue messages.
  - Queued messages should be visually labeled (e.g., “Queued — will send when connected”) with a way to cancel before they are sent.
  - When the server becomes reachable, provide a clear action to “Send queued messages” or send them automatically with an explicit confirmation.

#### 5.3.x Acceptance Criteria (High Level)

- When the connection state is “No configuration”, “Searching / connecting”, or “Error / cannot reach server”, the Send button in both Web UI and sidepanel is disabled, the composer is visually de-emphasized, and an inline helper message explains that messages won’t send until the server is reachable.
- When the connection state transitions to “Connected”, the composer in both Web UI and sidepanel shows the normal placeholder (e.g., “Type a message…”) and the Send button becomes enabled.
- Focusing or clicking the composer while disconnected shows a banner or tooltip that includes a “Connect to server” action that routes the user to the connection/settings view.

### 5.4 Feature Navigation & Tools Discoverability

Many core capabilities are currently behind a generic “More tools” button near the Send control, which makes discovery harder. We want core modes to feel first-class.

#### 5.4.1 Promote Core Modes

- Core capabilities (e.g., Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground) must have **first-class entry points** in the UI.
- Requirements:
  - Provide a visible primary navigation pattern for these modes (tab bar, segmented control, or clear header shortcuts), consistent between the Options view and sidepanel where feasible.
  - “More tools” should be reserved for advanced or rarely used tools, not for core workflows.
  - For each mode, provide at least one contextual entry point in the main view (e.g., a small card or shortcut like “Review this page” or “Search your knowledge”) that mirrors the navigation.

#### 5.4.2 Composer-Adjacent Tools

- The composer’s action row should make non-chat capabilities more discoverable:
  - Consider renaming the “More tools” button to a more descriptive label (e.g., “AI tools”) and ordering it after core per-mode actions.
  - Tooltips for the tools menu should list a few key examples (e.g., “Review media, search knowledge, manage prompts”) to set expectations.
- Where keyboard shortcuts exist for switching modes, they should be surfaced in the UI (e.g., “Press R for Review”) in an unobtrusive way.

#### 5.4.x Acceptance Criteria (High Level)

- When the Web UI is loaded, core modes (Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground) have visible first-class entry points (tabs, segmented control, or header shortcuts) and are not reachable only through “More tools”.
- The “More tools” menu contains only advanced or secondary tools; it is labeled descriptively (e.g., “AI tools”) and its tooltip makes clear what kinds of tools it contains.
- From the main view, users can see at least one contextual entry point for key modes (for example, “Review this page” or “Search your knowledge”) without needing to open a hidden menu.

### 5.5 Connection Status Display (“Core” / “RAG”)

The existing “Core” and “RAG” pills with green dots are small, jargon-heavy, and rely heavily on color. We want a clearer, more accessible status display.

#### 5.5.1 Plain-Language Labels

- “Core” and “RAG” labels must be replaced in user-facing UI with plain-language labels, for example:
  - “Server” (or “Chat online”) for the main tldw server.
  - “Knowledge” (or “Knowledge search”) for RAG / indexing state.
- Each label must include a textual state indicator such as “Online”, “Indexing”, “Offline”, rather than relying solely on color.
 - “Core” / “RAG” may remain only in internal code, logs, or debug views, not as user-visible labels.

#### 5.5.2 Visual & A11y Requirements

- Use icon + text combinations (e.g., checkmark, warning, or info icons) alongside any colored dots to ensure the status is understandable for color-blind users.
- Provide descriptive tooltips for each status pill, e.g.:
  - “Server: Connected to {{host}}. Chat and tools are available.”
  - “Knowledge: Offline — new searches may not return results.”
- Status elements must have appropriate ARIA labels (e.g., “Connection status: Server online”, “Connection status: Knowledge offline”) so that screen readers can announce them.

#### 5.5.3 Interactivity

- Decide explicitly whether the status is purely informational or interactive:
  - **If informational-only**: present as static text with hover tooltips, with no click affordance.
  - **If interactive**: visually indicate this (button styling, hover/focus states) and define the click behavior:
    - e.g., clicking opens the Diagnostics view (or the Settings → Diagnostics/Health page).
- In either case, avoid ambiguous “looks clickable but does nothing” patterns.

#### 5.5.x Acceptance Criteria (High Level)

- In the header, users see status indicators labeled with plain-language terms (e.g., “Server: Online”, “Knowledge: Offline”) accompanied by icons; “Core” and “RAG” do not appear as user-visible labels.
- Hovering or focusing these status indicators reveals tooltips that describe what each system does and its current state, including host information when available.
- If the status is interactive, clicking it opens Diagnostics; if it is informational only, it presents no pointer cursor or click behavior.

---

## 6. Accessibility & Internationalization

- All new buttons and links must be keyboard-focusable with visible focus states.
- Provide ARIA labels / roles for status indicators (e.g., “Connection status: searching”, “Connection status: connected”).
- Avoid color-only indicators for critical information (e.g., red/green dots for Core/RAG); pair with text and/or icons.
- Ensure new inline banners, notices, and tooltips (including composer helper banners) are announced appropriately by screen readers (e.g., via roles or live regions) and remain fully keyboard-accessible and dismissible when needed.
- All copy introduced here must be internationalized through the existing i18n system (`src/assets/locale/*` and `_locales/*`).

---

## 7. Telemetry & Success Metrics

If/when telemetry is available, we’d like to measure:

- Time from first extension open to successful connection.
- Number of retries / connection errors per user.
- Click-through rates on:
  - “Connect / Set up server”
  - “Change server”
  - “Diagnostics / Troubleshooting”
  - Primary actions on each feature empty state.
- Feature adoption: first successful action per feature after seeing its empty state.

Success criteria (qualitative):

- Fewer user reports of being “stuck on Searching for your tldw server”.
- Users can verbally describe what each feature (Review, Media, Knowledge, etc.) does after briefly scanning the empty state.

---

## 8. Implementation Notes (Non-Binding)

These are suggestions for engineering; they are not hard requirements.

- Use a small connection-state model (e.g., a `ConnectionState` enum + data) shared across options/home and feature views to keep state handling consistent.
- Implement connection timeouts and state transitions in a single central connection store or hook (e.g., backed by a background script) so that health checks run in one place and all UIs subscribe to that state instead of polling tldw_server independently.
- Define a shared `CONNECTION_TIMEOUT_MS` constant and retry/backoff strategy in the connection store; all UI states (e.g., “Searching”, “Error”) must derive from this state rather than starting their own timers.
- Leverage existing layout components and design tokens to keep the new cards visually consistent with the rest of the extension.
- Consider a tiny “demo mode” flag for future iterations; empty states can check this to show sample content without a live server.

---

## 9. Open Questions

- Should we support a full “offline demo” mode where users can click through example flows without any server? - Yes
- Do we want per-feature links to specific documentation pages (e.g., docs for Knowledge vs. Media), or a single generic docs link? - Per-feature links
- What timeout duration is appropriate before transitioning from “Searching” to “Can’t reach your server”? - 20sec
- Should the sidepanel first-run card (currently showing connection status) be unified with the options/home connection design defined here? - Yes

---

## 10. Implementation Checklist (First Pass)

This section translates the requirements into a concrete, implementation-oriented checklist. It is not exhaustive, but should be enough to drive the initial PR(s).

### 10.1 Connection Card & First-Run (Options + Sidepanel)

  - [x] Implement a single shared connection store/hook that drives:
    - Options homepage connection card
    - Sidepanel first-run view (reusing the same card component with responsive layout)
    - Chat composer enabled/disabled state (details in 10.2)
    - Header connection indicators (visual treatment in 10.5)
  - [x] Define shared connection constants/behavior:
    - [x] `CONNECTION_TIMEOUT_MS` used to transition from “Searching” to “Error”.
    - [x] Retry/backoff strategy; UIs must not implement their own timeouts.
  - [x] Refactor `OptionIndex` (options landing route) to subscribe to the shared connection state instead of running its own health checks, and
  render state-specific cards:

    - [x] **First-run** (no server URL configured):
      - Headline: “Connect tldw Assistant to your server”.
      - Brief description of what tldw_server is and why it’s required.
      - Primary button: “Set up server”.
      - Secondary action: “Open diagnostics”.
      - Optional button: “Try a demo” (only when a demo-mode feature flag is enabled).

    - [x] **Searching / connecting**:
      - Headline: “Searching for your tldw server…”.
      - Subtext showing the `{{serverUrl}}` being checked and a short explanation.
      - Spinner/status indicator and “last checked” time.
      - Primary button: “Change server”.
      - Secondary in-card action: “View diagnostics”.

    - [x] **Connected**:
      - Headline: “Connected to your tldw server”.
      - Subtext showing the current `{{serverUrl}}`.
      - Clear success indicator (icon + green label).
      - Primary button: “Start chatting” (focuses or reveals the main chat composer).
      - Secondary actions: “Change server”, “View diagnostics”.

    - [x] **Error / cannot reach server** (after `CONNECTION_TIMEOUT_MS` or explicit failure):
      - Headline: “Can’t reach your tldw server”.
      - Subtext including the attempted `{{serverUrl}}` and likely causes (server not running, wrong URL, network issues).
      - Primary button: “Retry connection”.
      - Secondary button: “Change server”.
      - In-card “Diagnostics” link, with optional inline error summary (e.g., HTTP status or timeout).

  - [x] Ensure all non-connected states (**First-run**, **Searching**, **Error**) expose an in-card Diagnostics entry point, in addition to any
  existing header link.
  - [x] Ensure the current `serverUrl` is visible in the connection card for **Searching**, **Connected**, and **Error** states; “Change server”
  must route to the canonical Settings → tldw Server configuration UI (not a duplicate form).
  - [x] Refactor the sidepanel first-run experience to reuse the shared connection card component, with layout tweaks for narrow width but
  identical states, copy, and actions.
  - [x] Wire “Set up server” / “Change server” / “Diagnostics” actions to:
    - [x] Navigate to the relevant Settings → tldw Server section or use `openOptionsPage` when invoked from the sidepanel.
    - [x] Open the Diagnostics view or troubleshooting docs in a new tab, as appropriate.
  - [x] Add i18n keys for all connection card headlines, subtexts, and button/label copy in the `option` (and shared `common` where appropriate)
  namespaces; avoid hard-coded English strings.

### 10.2 Chat Composer Readiness (Web UI + Sidepanel)

- [x] Connect both Web UI and sidepanel composers to the shared connection state.
- [ ] When state is **No configuration / Searching / Error**:
  - [x] Disable the Send button and apply “inactive” styling.
  - [x] De-emphasize the input area (without making text unreadable).
  - [x] Show an inline helper message near the composer explaining that messages won’t send until the server is reachable.
  - [x] Change the placeholder to a connection-aware variant (e.g., “Waiting for your server — set it up in Settings.”).
  - [x] On first focus/click, show a small banner or tooltip with:
    - “Connect to server” button.
    - Optional Diagnostics link.
- [ ] When state is **Connected**:
  - [x] Restore normal placeholder.
  - [x] Enable Send button and normal styling.

### 10.3 Feature Empty States

- [x] For each core feature (Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground, Settings):
  - [x] Implement a feature-specific empty-state component (title, description, examples, primary CTA).
  - [x] Wire it to show when:
    - Connection is **Connected**, and
    - The feature has “no data” (e.g., no items, no sessions).
    - Define “no data” per feature, for example:
      - Review: no previously saved review sessions or transcripts.
      - Media: no uploaded media items or recordings.
      - Knowledge: no configured knowledge sources or ingested items.
      - Notes: no saved notes.
      - Prompts: no saved prompt templates.
      - Flashcards: no decks or cards available to review.
      - Playground: no saved playground sessions or experiments.
      - Settings: no prior configuration beyond defaults (first visit).
  - [x] Use the i18n keys defined for these empty states in the relevant namespaces (`option`, `review`, `knowledge`, `settings`) and add per-feature namespaces (`media`, `notes`, `prompts`, `flashcards`, `playground`) for feature-specific empty-state copy, reserving `common` for shared phrases like “Connect to server”.
- [x] When **not connected**:
  - [x] Ensure a prominent connection notice or card appears first.
  - [x] Show a “Connect to server” CTA that routes to the connection/settings view.
  - [x] Either hide the feature-specific empty state or render it below the connection messaging per the design decision.

- **Implementation status (2025-11-16)**:
  - Notes: connected-state “No notes yet” empty state implemented with title, description, examples, and “Create note” CTA; when not connected, a connection-focused empty state with “Connect to server” CTA is shown instead.
  - Flashcards: when not connected, the entire Flashcards view now shows a connection-focused empty state with “Connect to server” CTA; feature-specific “no due cards” and “no cards” empties remain for connected state.
  - Review / Media: when not connected, Review and Media routes now show a connection-focused empty state with “Connect to server” CTA instead of generic empties; when connected, existing per-feature “no items” messaging is preserved.
  - Knowledge: when not connected, the Knowledge Settings view shows a connection-focused empty state; when connected but there are no knowledge bases, a “No knowledge sources yet” empty state with examples and an “Add knowledge” CTA is shown.
  - Prompts: when not connected, the Manage Prompts view shows a connection-focused empty state; when connected but there are no custom prompts, a “No custom prompts yet” empty state with examples and a “Create prompt” CTA replaces the bare table.
  - Playground: when not connected, the Options landing view shows the shared server connection card; when connected but there are no messages in the Playground chat, a “Start a new Playground chat” empty state with examples and “Start chatting” CTA is shown.
  - Settings: the General Settings home now includes a small intro empty state explaining key categories when connected (with a “Configure server & auth” CTA) and a connection-focused notice when the server is offline.

### 10.4 Navigation & “More tools”

- [x] Identify where core modes are selected today (e.g., header shortcuts, dropdowns, sidepanel toolbar).
- [x] Promote core modes (Review, Media, Knowledge, Notes, Prompts, Flashcards, Playground) to:
  - [x] A visible tab bar, segmented control, or equivalent first-class navigation in the Web UI.
  - [x] Matching or analogous entry points in the sidepanel where feasible.
- [x] Ensure navigation works in both the full-width options UI and the narrow sidepanel without horizontal overflow; the tab bar or segmented control should degrade gracefully (e.g., wrapping, overflow menu, or icons-only) on smaller viewports.
- [x] Restrict the “More tools” menu to advanced or secondary tools:
  - [x] Rename to a more descriptive label (e.g., “AI tools”).
  - [x] Add a tooltip listing a few representative tools.
- [x] Surface keyboard shortcuts for mode switching (if they exist) in a subtle way (e.g., tooltip or shortcut hint).

- **Implementation status (2025-11-16)**:
  - Web UI: a “Modes” pill row (Playground, Review, Media, Knowledge, Notes, Prompts, Flashcards) has been added below the header toolbar; the active mode is highlighted and clicking a pill routes to the corresponding view.
  - Sidepanel: a compact “modes” popover in the sidepanel header opens Web UI routes for the same core modes, keeping navigation accessible even in the narrow layout.
  - “More” menu: the header “More” button now reads “AI tools” with an “Advanced tools” tooltip string, and the menu itself remains reserved for advanced actions (open sidebar, GitHub, etc.).
  - Mode shortcuts: default `Alt+1`–`Alt+7` shortcuts are wired for Playground/Review/Media/Knowledge/Notes/Prompts/Flashcards, and each mode pill exposes its shortcut via a tooltip (“{{shortcut}} to switch”) so power users can discover them without cluttering the UI.

### 10.5 Connection Status Indicators (Core/RAG → Server/Knowledge)

- [x] Locate header status components currently labeled “Core” and “RAG”.
- [x] Replace user-visible labels with plain-language text:
  - [x] “Server: Online / Offline / Checking…”
  - [x] “Knowledge: Ready / Indexing / Offline”
- [x] Add icon + text combinations (checkmark/warning/info) and ensure:
  - [x] Indicators do not rely solely on color to convey status.
  - [x] ARIA labels describe the status (e.g., “Connection status: Server online”).
- [x] Decide on interactivity:
  - [x] If interactive: make them look and behave like buttons that open Diagnostics (or Settings → Diagnostics/Health).
  - [ ] If non-interactive: ensure they are clearly informational-only (no pointer cursor, no click handlers).

### 10.6 Diagnostics Entry Points

- [x] Ensure Diagnostics is reachable from:
  - [x] Connection card in all non-connected states.
  - [x] Header status indicators (if interactive).
  - [x] Settings navigation (e.g., Health / Diagnostics section).
- [ ] Standardize user-facing labels on “Diagnostics”:
  - [ ] Buttons/links labeled “Open diagnostics” or “Diagnostics”.
  - [ ] External documentation link clearly labeled as a diagnostics/troubleshooting guide.

### 10.7 Tests / Validation (Where Practical)

- [ ] Update or add Playwright tests to cover:
  - [ ] Options first-run, searching, connected, and error states.
  - [ ] Composer disabled/enabled behavior based on connection state (Web UI + sidepanel).
  - [ ] Visibility and content of feature empty states when connected vs not connected.
  - [ ] Presence and behavior of Diagnostics entry points.
  - [ ] Header status labels (no “Core/RAG” in user-visible text) and, if interactive, navigation to Diagnostics.
