# tldw Extension – Knowledge Tools Workspace Views PRD

## 1. Overview

We are promoting **World Books**, **Chat Dictionaries**, **Characters**, and **Prompts** from Settings-only management screens into **first-class workspace views**, aligned with the existing **Review** and **Media** surfaces.

These new views should:

- Live in the **main app viewport**, not only under Settings.
- Share a consistent layout, empty states, and connection/demo behavior with **Review** / **Media**.
- Remain reachable from Settings for configuration, but primary usage flows should start from the main MODES row.

## 2. Goals & Non-Goals

### Goals

- Make World Books, Dictionaries, Characters, and Prompts feel like primary “knowledge tools,” not buried admin pages.
- Provide **Review/Media‑style** workspace UIs:
  - Clear header/title, description.
  - Connection‑aware empty states (online/offline/demo).
  - Primary CTA(s) and secondary actions in predictable locations.
- Keep existing CRUD capabilities (tables/forms) but wrap them in a more approachable workspace shell.

### Non-Goals

- No new backend entities or endpoints (reuse existing APIs).
- No major re‑architecture of existing managers (WorldBooksManager, CharactersManager, DictionariesManager, PromptsManager).
- No changes to data model semantics (e.g., how world‑books link to characters).

## 3. User Stories

- As a **writer/GM**, I want a dedicated **World Books** workspace so I can browse, search, and edit world‑books without digging into Settings.
- As a **power user**, I want a **Chat Dictionaries** workspace to maintain custom terms and definitions in one place, with quick search.
- As a **character‑driven user**, I want a **Characters** workspace to see all characters, filter them, and quickly jump into chat with a selected character.
- As a **prompt engineer**, I want a **Prompts** workspace to manage reusable prompts and easily insert them into conversations.
- As a **new user** (with or without demo mode), I want clear, helpful empty states for these tools that guide me to create my first item or connect my tldw server.

## 4. UX & IA

### 4.1 Navigation & Routing

- The app MUST expose dedicated routes for each feature:

  - World Books workspace: `#/world-books`.
  - Chat Dictionaries workspace: `#/dictionaries`.
  - Characters workspace: `#/characters`.
  - Prompts workspace: `#/prompts`.
  - Settings/config routes MAY exist and SHOULD live under `#/settings/...` (for example, `#/settings/world-books`), but they are configuration-only surfaces (see §6).

- **MODES row** (Header):

  - World Books, Dictionaries, Characters, and Prompts MUST route to their **workspace** paths (not settings paths).
  - Each mode MUST:
    - Highlight correctly (`aria-current="page"`) when its workspace route is active.
    - Show shortcut hints consistent with Review/Media.

- **SHOW SHORTCUTS**:

  - SHOW SHORTCUTS entries for these tools MUST link to the corresponding `#/settings/...` configuration views, not the workspace views.
  - Settings views are reserved for advanced / global configuration, not day‑to‑day data management.

### 4.2 Shared Workspace Layout

For each workspace (World Books / Dictionaries / Characters / Prompts):

- Use the same **top‑of‑page structure** as Review/Media:

  - Title + icon.
  - One‑line description.
  - Optional inline “tip” text or link (e.g., “Learn more in docs”).

- Below header:

  - **Toolbar row** with:
    - Primary CTA button (e.g., “New world book”, “New dictionary”, “New character”, “New prompt”).
    - Secondary actions (e.g., filters, import/export, bulk actions) aligned right.
  - Primary **content area**:
    - List/table/cards for existing items.
    - Feature‑specific filters/search.
    - Paginators where relevant.

### 4.3 Empty States (Online, Offline, Demo)

Each workspace adopts the same empty‑state patterns used by Review/Media and other new views:

- **Offline / unreachable tldw server**:

  - Use shared `FeatureEmptyState` (or equivalent) plus `useConnectionStore`.
  - Title: e.g., “Can’t reach your tldw server”.
  - Description referencing the current server URL and connection troubleshooting.
  - Primary CTA: “Retry connection”.
  - Secondary CTA: “Change server”.

- **Online but no data yet**:

  - Feature‑specific empty copy:
    - World Books: explain what a world book is and why to create one.
    - Dictionaries: describe how dictionaries affect chat terminology.
    - Characters: describe per‑character personalities/behaviors.
    - Prompts: describe reusable prompts and how they are used.
  - Primary CTA: “Create your first …”.
  - Secondary CTA: optional link to docs or templates.

- **Demo mode (online/offline)**:

  - When `demoEnabled === true`:
    - Empty states should use **demo‑aware copy**:
      - Emphasize safe experimentation, no real data required.
      - Make it clear that content may be local/demo only.
    - Show a small set of **synthetic sample rows/cards** when there is no real data:
      - Samples are not persisted to the server.
      - They are clearly labeled as demo data and disappear once real items exist.

### 4.4 Data States & CRUD

- Existing managers (WorldBooksManager, DictionariesManager, CharactersManager, PromptsManager) provide:

  - Tables/lists with search + sort.
  - Detail drawers or inline forms.
  - CRUD operations via tldw APIs.

- Requirement:

  - Embed these managers into the new workspace shells without breaking their current functionality.
  - Ensure loading, error, and empty states inside the tables are consistent with Review/Media (e.g., spinners, retries, inline error messages).

### 4.5 Chat & Review Integration

- From each workspace, provide lightweight link‑backs into chat and review flows:

  - World Books:

    - From a row, provide “Open in Review” or “Inspect media in this world book” where applicable.
    - Provide “Use in chat” link that takes user to chat with appropriate context, if feasible.

  - Characters:

    - Primary action in row: “Chat with character”.
    - Opening this should focus the chat surface with that character pre‑selected.

  - Chat Dictionaries:

    - Create/edit flows remain in workspace.
    - No extra wiring required, as dictionaries are already applied in chat via configuration.

  - Prompts:

    - “Use in chat” and optionally “Copy prompt” actions.
    - “Use in chat” MUST:
      - Navigate to the main chat view.
      - Prefill the composer with the prompt’s text.
      - If the composer already contains text, show a confirmation asking whether to **overwrite** or **append** the prompt text; the user must explicitly choose before the composer is changed.
    - At minimum, provide easy access to prompt content.

Depth of integration can be phased; see Phasing below.

## 5. Detailed Requirements by Workspace

### 5.1 World Books Workspace

- **Route**: `#/world-books`.
- **Header**:

  - Title: “World Books”.
  - Description: short explanation of world books as structured knowledge for stories/worlds.

- **Toolbar**:

  - Primary CTA: “New world book”.
  - Secondary: filter by tag, owner, or usage (optional; can be follow‑up phase).

- **Main content**:

  - Embed or reuse `WorldBooksManager` inside workspace shell.
  - Ensure:

    - Connection errors use shared connection empty state.
    - Table “empty” state for zero results uses new copy, not default AntD empty.

- **Empty states**:

  - Offline, Online, and Demo behaviors as in §4.3.

### 5.2 Chat Dictionaries Workspace

- **Route**: `#/dictionaries`.
- **Header**:

  - Title: “Chat Dictionaries”.
  - Description: explain that dictionaries help the model understand project‑specific terms.

- **Toolbar**:

  - Primary CTA: “New dictionary” or “Add term”.
  - Secondary: quick search input; filter by language or scope.

- **Main content**:

  - Embed `DictionariesManager`.
  - Ensure that edits auto‑refresh the list and that error states are surfaced clearly.

### 5.3 Characters Workspace

- **Route**: `#/characters`.
- **Header**:

  - Title: “Characters”.
  - Description: explain that characters encapsulate a role/personality for chat.

- **Toolbar**:

  - Primary CTA: “New character”.
  - Secondary: filters by tags, world book, or last used.

- **Main content**:

  - Embed `CharactersManager`.
  - Ensure row‑level actions include:

    - Edit.
    - Duplicate (if supported).
    - **Chat with character** (link to main chat with that character pre‑selected).

### 5.4 Prompts Workspace

- **Route**: `#/prompts`.
- **Header**:

  - Title: “Prompts”.
  - Description: “Reusable instructions you can apply across chats and tools.”

- **Toolbar**:

  - Primary CTA: “New prompt”.
  - Secondary: filter by category / tag, search by name/text.

- **Main content**:

  - Embed Prompts manager component (currently under Settings).
  - Row‑level actions:

    - Edit / delete as today.
    - Phase 1: “Use in chat” action that:
      - Navigates to the main chat view.
      - Prefills the composer with the selected prompt’s text (user can still edit before sending).
    - Optional later: add “Copy to clipboard” or inline insertion without navigation.

## 6. Technical Requirements

- **Routing**:

  - Add new routes for workspace views; keep existing `#/settings/...` routes for detailed configuration views.
  - Update MODES row links to point to workspace routes.

- **Layout & composition**:

  - Introduce small wrapper components per workspace:

    - `WorldBooksWorkspace`, `DictionariesWorkspace`, `CharactersWorkspace`, `PromptsWorkspace`.

  - Each workspace wrapper:

    - Uses the main app layout shell (same as Review/Media).
    - Uses `useConnectionStore` for connection phase.
    - Uses `useDemoMode` for demo‑aware empty states.
    - Renders `FeatureEmptyState` in connection error / demo cases.
    - Hosts the primary data‑management UI for that feature (lists/tables/cards, CRUD actions).

  - Settings/config views for these features:

    - Live under `#/settings/...`.
    - Are focused on configuration only (e.g., defaults, advanced toggles, import/export settings).
    - MUST NOT be clones of the workspace UIs; they may reuse lower‑level components (forms, filters) but should not present full workspace‑style tables as the primary surface.

- **State & store reuse**:

  - No new global stores required; reuse existing Zustand/React Query or local component state.
  - Ensure no duplication of fetch logic; managers remain the single source of truth for data.

- **i18n**:

  - Add new keys for:

    - Workspace titles, descriptions.
    - Empty state titles/descriptions/CTAs (online/offline/demo) for each feature.
    - Any new button labels (e.g., “New world book”, “Chat with character”).

  - Propagate to all locale files with at least English placeholders.

- **Accessibility**:

  - Ensure active MODES pill sets `aria-current="page"`.
  - Tables/lists uphold existing accessibility patterns (labels for buttons, focus states, keyboard navigability).

## 7. Phasing

### Phase 1 – Navigation + Wrapper Views

- Add routes and workspace shells.
- Wire MODES row to new paths.
- Embed existing managers into shells.
- Implement connection‑aware and basic online empty states.
- Characters deep‑link:
  - “Chat with character” from the Characters workspace navigates to the main chat surface and selects that character as active.
  - If the composer already contains text, the existing text SHOULD be preserved; Phase 1 does not modify composer content for character deep‑links.
- Prompts deep‑link:
  - “Use in chat” from the Prompts workspace navigates to the main chat surface and pre‑fills the composer with the prompt text (no auto‑send).
  - If the composer already contains text, show a small confirmation dialog:
    - Option A: Overwrite existing text with the prompt.
    - Option B: Append the prompt text to the existing text (with a separating newline).
    - No change is applied until the user chooses one of the options.

### Phase 2 – Demo Mode & UX Polish

- Demo‑aware empty states.
- Synthetic sample rows/cards in demo mode for each workspace when there is no real data.
- Refine copy, icons, and CTA structure.
- Add per‑feature tips or links to docs.

### Phase 3 – Advanced Chat Integration (Optional)

- Characters: optional enhancements such as preserving current conversation context or opening a dedicated character thread.
- Prompts: richer behaviors such as inserting prompts into an existing conversation without navigation or managing multi‑step prompt sequences.
- World Books / Dictionaries: contextual hooks from chat/Review if desired (e.g., “Open related world book” from Review).

## 8. Success Metrics

- Increased usage of World Books, Dictionaries, Characters, and Prompts versus baseline (open counts, CRUD operations).
- Reduced time‑to‑first‑item for new users (first world book/character/prompt created).
- Qualitative feedback: users report these tools feel like core parts of the workspace, not hidden configuration.

## 9. Decisions & Assumptions

- Demo mode:
  - MUST **show synthetic sample rows/cards** (non‑persisted, clearly labeled) when there is no real data, instead of only changing empty‑state copy.
  - Demo rows/cards are rendered client‑side only and are never sent to or stored on the tldw server.
- Workspace vs settings:
  - Each feature (World Books, Dictionaries, Characters, Prompts) has:
    - A **workspace view** (main MODES route) that is the primary place for viewing and managing items.
    - A **settings/config view** (`#/settings/...`) that focuses on configuration related to that feature (defaults, advanced options) and does not duplicate the full workspace UI.
- Phase 1 deep‑link behavior:
  - Characters:
    - “Chat with character” navigates to the main chat surface and selects that character as active.
    - It does not automatically alter existing composer content in Phase 1.
  - Prompts:
    - “Use in chat” navigates to chat and pre‑fills (or, after confirmation, appends) the prompt text into the composer.
    - If the composer is non‑empty, the user MUST be prompted to choose overwrite vs append; no change occurs until they confirm.
