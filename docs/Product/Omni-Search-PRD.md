# Omni-Search PRD (Draft v1)

## 1. Overview

Build a global **omni-search** bar that lets users quickly jump to any screen/workspace and open any item (chats, media items, notes, flashcard collections, prompts) from a single entry point.

The bar lives at the top center of the app and can be focused via a keyboard shortcut, reducing the need for manual navigation and making the product feel fast and “command palette”-like.

## 2. Goals

- Enable users to navigate to any **screen/workspace** by name.
- Enable users to find and open any **item** (chat, media item, note, flashcard collection, prompt) by name or partial recall.
- Support a fast **keyboard-driven workflow** (focus, search, select, open) in ≤3–4 actions.
- Provide a single mental model for **“jump to anywhere / pull up anything”**.

## 3. Non-Goals

- Full-text search across all historical content (e.g., entire chat transcripts, full note bodies) in v1.
- Cross-device or cross-account search.
- OS-level global shortcut integration outside the browser/extension (v1 is in-app only).
- Complex search syntax beyond simple type prefixes (no advanced query language in v1).

## 4. User Stories

- As a user, I can press `Cmd+K` / `Ctrl+K` from any screen to focus the omni-search bar.
- As a user, I can type the name of a **screen** (e.g., “Study workspace”) and press Enter to jump directly there.
- As a user, I can type the name or part of the name of a **chat, media item, note, flashcard collection, or prompt** and open it with Enter.
- As a user, I can see which results are **screens vs chats vs notes vs other items** at a glance.
- As a user, I can narrow my search to a specific type (e.g., notes only) using a short **type prefix** (e.g., `n:`).
- As a user, I can see my **recent or frequently used** screens/items when I focus the search bar before typing.
- As a user, when no results exist for my query, I can quickly **create a new note, chat, or flashcard collection** with that name.

## 5. UX / UI

### 5.1 Placement & Layout

- Omni-search bar is visible at the top of the main UI, centered:
  - Full-width on smaller screens; constrained max width on desktop (`max-w` style, centered).
- Height and visual style consistent with existing input fields; stands out as a primary control (e.g., subtle border, background, and icon).
- Placeholder text:  
  `Search screens, chats, media, notes…`

### 5.2 Interaction & States

- **Focus**
  - Clicking the bar focuses the input and opens the dropdown.
  - Pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) focuses the input and opens the dropdown from anywhere in the app.
- **Typing**
  - As the user types, results update in real time.
  - Searches are debounced (e.g., 150–250 ms) to avoid unnecessary work.
- **Selection**
  - Mouse: clicking a result opens it.
  - Keyboard: Up/Down arrows move selection; Enter confirms.
- **Escape**
  - `Esc` closes the dropdown and blurs the bar.
- **Scrolling**
  - If results exceed dropdown height, dropdown becomes scrollable while the bar remains fixed.

### 5.3 Result List & Grouping

- Results are displayed in a dropdown directly under the bar.
- Visually grouped by type with simple section headers:
  - **Screens**
  - **Chats**
  - **Media**
  - **Notes**
  - **Flashcard Collections**
  - **Prompts**
- Each result row:
  - **Left:** type-specific icon (screen, chat bubble, media thumbnail/file, note, cards, prompt).
  - **Center:** main label (title/name) + secondary line (e.g., timestamp, snippet, count, source).
  - **Right:** subtle type tag (e.g., `SCREEN`, `CHAT`, `NOTE`).
- Default limit per group (e.g., up to 3 per type) with potential “Show more [type]” row at the end of each group in a later iteration.

### 5.4 Visual States

- **Empty (focus, no query yet)**
  - v1: MAY show a simple help/placeholder state only (e.g., “Type to search screens, chats, notes…”).
  - v1.1: Show a “Quick access” / “Recent” section: recently or frequently used screens/items (e.g., top 5–10).
    - Example:
      - Last opened chat
      - Last opened note
      - Last reviewed flashcard collection
      - Most visited workspace
- **Typing with results**
  - Show matching sections with highlighted substrings for matched terms in labels.
  - Maintain section ordering (Screens → Chats → Media → Notes → Flashcard Collections → Prompts).
- **No results**
  - Show message:  
    `No matches for “{query}”.`
  - Show contextual actions such as:
    - `Create note "{query}"` (if appropriate).
    - `Start new chat "{query}"`.
    - `Create flashcard collection "{query}"`.
- **Loading**
  - If any data sources are slow, show a lightweight loading indicator within the affected section, but do not block other sections from rendering.

## 6. Scope of Search (Entities)

### 6.1 Screens / Workspaces

**Definition:** Any primary page view or workspace in the product.

**Examples (to be tailored to actual routes):**

- Dashboard / Home
- Study workspace
- Media library
- Flashcards
- Notes
- Settings / Options

**Data model (conceptual):**

- `id` — unique identifier.
- `label` — display name (e.g., “Study workspace”).
- `description` (optional) — short description.
- `icon` — icon reference.
- `route` — internal route or navigation target.
- `keywords[]` — aliases (e.g., “study”, “review”, “cards” for Flashcards).

### 6.2 Items

**Chats**

- Title (or generated from participants/content).
- Last message snippet.
- Last updated timestamp.

**Media items**

- Title.
- Source (YouTube, local, etc.).
- Basic metadata (e.g., duration, created/added date).

**Notes**

- Title.
- First line snippet.
- Last updated timestamp.

**Flashcard collections**

- Name.
- Card count.
- Last reviewed date (if available).

**Prompts**

- Name.
- Short preview of the prompt text.
- Last used date (if available).

## 7. Search Behavior & Ranking

### 7.1 Query Handling

- Case-insensitive matching; trim leading/trailing whitespace.
- Match on entity **labels** by default; fuzzy match allowed.
- Prefix / exact matches are ranked higher than general fuzzy matches.

#### Type Prefixes (v1 or v1.1)

Support simple type-filter prefixes to narrow search **starting in v1.1**:

- `s:` or `screen:` → screens only.
- `c:` or `chat:` → chats only.
- `m:` → media items only.
- `n:` → notes only.
- `f:` → flashcard collections only.
- `p:` → prompts only.

Behavior:

- If query begins with `<prefix> `:
  - Strip prefix from the query term.
  - Set active filter type.
  - Search **only** the specified type.
- UI:
  - Display an active filter indicator (e.g., chip “Filtering by: Notes”).

Implementation notes:

- Parsing support MAY exist behind a feature flag in the codebase, but is **disabled in v1**.
- v1.1 can enable prefixes via configuration/feature flag, alongside visible filter chips in the UI.

### 7.2 Ranking

**Per type:**

- Scoring inputs:
  - **Text relevance**
    - Exact label match.
    - Prefix match.
    - Fuzzy match (substring, approximate).
  - **Recency**
    - Last opened/updated timestamp.
  - **Pinning/Favoriting** (if supported in the future).
- Items are sorted by a composite score, e.g.:
  - `score = textRelevance * 0.7 + recency * 0.3` (conceptual).

**Cross-type:**

- For v1, results are grouped by type and shown in a fixed section order:
  1. Screens
  2. Chats
  3. Media
  4. Notes
  5. Flashcard Collections
  6. Prompts
- Within each group, items are ordered by their per-type score.

**Contextual boosts (optional, v1.1):**

- Slightly boost items related to the current screen. Examples:
  - When user is on the Flashcards screen, flashcard collections get a small score bump.
  - When user is on the Notes screen, notes get a small bump.

## 8. Keyboard Shortcuts & Power-User Features

- `Cmd+K` / `Ctrl+K`:
  - Focuses the omni-search bar and opens the dropdown from any screen.
- `Up` / `Down`:
  - Moves selection within the visible result list.
- `Enter`:
  - Opens the highlighted result or executes the highlighted action.
- `Esc`:
  - Closes the dropdown and blurs the bar.
- `Tab` (optional, v1.1):
  - Cycles through type sections when there are multiple sections present.
- `Shift+Enter` (optional, v1.1):
  - Triggers an alternate action for certain types (e.g., for flashcard collections: Enter = open collection, Shift+Enter = start review).

## 9. Functional Requirements

1. The omni-search bar is rendered on all major screens/workspaces where navigation makes sense (e.g., main layout).
2. The bar can be focused via mouse click or keyboard shortcut (`Cmd+K` / `Ctrl+K`).
3. While focused, relevant results are fetched from:
   - A static registry for **screens**.
   - Local storage/state for dynamic entities:
     - Chats
     - Media items
     - Notes
     - Flashcard collections
     - Prompts
4. Selecting a result performs the appropriate action, primarily by **changing the route in the current extension view** (not opening new browser tabs) unless a specific flow explicitly requires a new tab:
   - **Screens:** navigate to the target screen/workspace route and close dropdown.
   - **Chats:** open the chat view and center on that conversation (respecting current layout, e.g., sidepanel vs full page).
   - **Media:** navigate to the media screen and select the item (or start playback).
   - **Notes:** open Notes screen and focus/scroll to the specific note.
   - **Flashcard collections:** open the collection’s page (v1; review flow may be added later).
   - **Prompts:** open the prompt editor or start a new chat with that prompt (decision to be finalized).
5. When no results are found:
   - Display a clear “no results” state.
   - Offer context-appropriate creation actions (e.g., create note, start chat, create flashcard collection) where applicable.
6. The search feature must work offline or with intermittent connectivity for data stored locally by the extension.
7. If any individual data source fails (e.g., chat store), the omni-search should:
  - Fail gracefully (log or surface non-blocking error).
  - Continue to display other sections.
8. Accessibility:
   - Omni-search uses appropriate ARIA roles (`combobox`, `listbox`, `option`), announces result counts or state to screen readers where appropriate, and supports full keyboard navigation without a mouse.
9. Async behavior:
   - The UI MUST discard results from older queries if a newer query has been issued (e.g., via an incrementing request id or `AbortController`) to avoid flicker or stale result flashes when typing quickly.

## 10. Data & Technical Design (High-Level)

### 10.1 Screen Registry

Create a central registry defining all navigable screens, e.g.:

- `ScreenDefinition`:
  - `id: string`
  - `label: string`
  - `description?: string`
  - `icon: IconType`
  - `route: string` (or route object)
  - `keywords?: string[]`

The registry is the single source of truth for:

- What screens exist.
- How they should be labeled in omni-search.
- How to navigate to them.

### 10.2 Search Functions

Provide typed functions for each entity type:

- `searchScreens(query, filter?)`
- `searchChats(query, filter?)`
- `searchMedia(query, filter?)`
- `searchNotes(query, filter?)`
- `searchFlashcards(query, filter?)`
- `searchPrompts(query, filter?)`

These functions:

- Take a raw string query (already trimmed and prefix-parsed).
- Return arrays of entity-specific results with enough metadata to present in the UI.
- Are expected to be **fast** and local (in-memory/state/local storage).

Per-type search functions **MUST** return results already sorted by their own relevance/recency logic; the omni-search aggregator only:

- Groups results by type.
- Applies simple truncation (e.g., `limitPerSection`).

### 10.3 Normalized Result Type

Define a normalized union type for UI consumption, for example:

- Common shape:
  - `id: string`
  - `type: 'screen' | 'chat' | 'media' | 'note' | 'flashcards' | 'prompt'`
  - `label: string`
  - `subtitle?: string`
  - `icon: IconType`
  - `onSelect: () => void` (or navigation descriptor)

`omniSearch(query)` composes the per-type search functions, normalizes them into this union, scores/sorts them, and returns grouped data to the component.

### 10.4 Performance Considerations

- Debounce input (e.g., 150–250 ms).
- All lookups should be local and typically O(n) over reasonably sized arrays.
- If entity counts grow large, consider:
  - Precomputing simple indices (e.g., lowercased labels).
  - Using a lightweight fuzzy search helper (no heavy external dependencies in v1 if avoidable).

### 10.6 Recency / Frequency (v1.1)

- v1.1 introduces recency/frequency-aware empty state and ranking refinements:
  - Track recency and frequency in-memory and persist lightweight stats in extension storage:
    - `lastOpenedAt` per entity.
    - `openCount` per entity (optional).
  - “Recent” sections use the last N opened entities across all types (or per type) when the query is empty.
  - These signals can be used by per-type search functions when ordering results.

### 10.5 Error Handling

- If any data source throws:
  - Catch and log (internal only).
  - Mark that section as unavailable or “error loading” while preserving others.
- The omni-search UI must remain responsive and not crash due to one failing data source.

## 11. Analytics & Success Metrics

**Instrumentation ideas:**

- Number of omni-search invocations per active user per day.
- Distribution of entity types opened via omni-search:
  - Screens vs Chats vs Notes vs Media vs Flashcards vs Prompts.
- Time from focus → selection (proxy for speed).
- Number of “no results” queries.

**Success indicators:**

- Reduction in manual navigation actions:
  - Fewer sidebar/menu clicks per session (if measurable).
- Increased usage of deeper features:
  - More visits to screens like Flashcards, Notes, Prompts via omni-search.
- Qualitative feedback:
  - Users report “finding things faster” and “less clicking around”.

## 12. Rollout & Phasing

### 12.1 v1 Scope

- Global omni-search bar UI at the top of the main layout.
- Search across:
  - Screens/workspaces (via screen registry).
  - Chats.
  - Media items.
  - Notes.
  - Flashcard collections.
  - Prompts.
- v1 supports all types, but **no creation flows and no recency/frequency weighting yet**; results are ordered by simple text match (case-insensitive) plus static section ordering.
- Basic ranking is provided by per-type search functions using straightforward text matching; the omni-search aggregator only groups and truncates.
- Empty state in v1 may be a simple help/placeholder message (no recents).
- No-results state in v1 only shows a static “no results” message (no create actions).

### 12.2 v1.1 / Future Enhancements

- Type prefixes (`c:`, `n:`, etc.) with visible filter chips, enabled via feature flag.
- Alternate actions per type:
  - Flashcards: Enter = open; Shift+Enter = start review.
  - Prompts: Enter = open editor; Shift+Enter = start new chat with prompt.
- Recency/frequency-aware empty state and ranking, based on `lastOpenedAt` and optional `openCount` per entity.
- Simple creation flows for no-results:
  - If `filterType === 'note'` and no results → show `Create note "{query}"`.
  - If `filterType === 'flashcards'` and no results → show `Create flashcard collection "{query}"`.
  - If no `filterType` and no results → show only `Start new chat "{query}"`.
- Context-aware ranking boosts (based on current screen).
- “Show more” paging within sections.
- More advanced fuzzy scoring or indexing if needed.

---

**Open Questions / To Finalize**

- Exact list of screens/workspaces to include and their canonical labels.
- For prompts:
  - Should selection open editor, start chat, or prompt for choice?
- For flashcard collections:
  - Should selection open collection or immediately start a review flow in v1?
- Whether to persist per-user preferences for:
  - Default entity type (e.g., some users might search notes most).
  - Preferred action for certain types (e.g., prompts).
