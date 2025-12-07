# New Navigation & Orientation Experience – PRD

## 1. Overview

This document defines an improved Navigation & Orientation experience for the tldw Assistant extension. It covers how users move between major views (Media, Notes, Review, Settings, etc.), how the current location is indicated, and how keyboard and screen‑reader users understand where they are.

The goals are to:

- Make the global navigation obvious and consistent.
- Clearly highlight the current section in navigation.
- Provide breadcrumbs or back affordances in nested settings/views.
- Ensure robust keyboard navigation and visible focus indicators.
- Use header shortcuts to surface “where to go next” in a lightweight way.

This experience must align with the following tests:

- `tests/e2e/ux-design-audit.spec.ts` (Main Navigation & Orientation, Accessibility, Sidepanel)
- `tests/e2e/ux-validate.spec.ts` (header shortcuts, Health navigation)
- `tests/e2e/headerActions.spec.ts` (sidepanel header actions)
- Other settings/health tests that depend on back navigation and Health links.


## 2. Goals & Non‑Goals

### 2.1 Goals

- Provide a clear, persistent navigation system in Options that:
  - Highlights the current section (Media, Notes, Review, Settings).
  - Exposes quick access to key settings subsections (Health, Knowledge, etc.).
- Ensure nested routes (e.g., `#/settings/knowledge`) show clear hierarchy (breadcrumbs/back button).
- Make keyboard navigation and focus behavior predictable and accessible.
- Integrate header‑level shortcuts for “jump to” navigation and ensure they behave consistently.

### 2.2 Non‑Goals

- Redesigning the entire visual theme or component library.
- Changing the core route structure (existing `#/media`, `#/notes`, `#/review`, `#/settings`, etc. remain).
- Implementing complex site‑wide search or command palette (can be added later).


## 3. Navigation Model & Routes

### 3.1 Primary Routes (Options)

The app exposes these top‑level sections under `options.html`:

- `#/media` – media ingestion and review.
- `#/notes` – notes workspace.
- `#/review` – review/flashcards section.
- `#/settings` – Settings root.

Nested settings routes:

- `#/settings/tldw` – tldw server connection & auth.
- `#/settings/knowledge` – Knowledge & RAG workspace.
- `#/settings/health` – Health & diagnostics.
- `#/settings/world-books` – World Books manager.
- `#/settings/chat-dictionaries` – Chat Dictionaries manager.

### 3.2 Sidepanel

Sidepanel has its own local header/navigation:

- Quick access to:
  - Health & diagnostics (opens `#/settings/health` in new tab).
  - Settings (`#/settings` or `#/settings/tldw`).
  - New chat / temporary chat toggles.

Navigation from sidepanel is primarily outbound (opening Options pages) rather than within the panel itself.


## 4. Global Navigation (Options Header)

### 4.1 Navigation Bar

**Location:** Top of Options layout (non‑onboarding).

**Contents:**

- Left: product name/logo.
- Navigation links:
  - `Media`
  - `Notes`
  - `Review`
  - `Settings`

Each link must:

- Use `<a>` or `button` with accessible name matching the section label.
- Update URL to the corresponding route.

### 4.2 Active State Indication

**Requirement:** At all times on Options pages, the current primary route must be clearly indicated in the navigation.

For each of `#/media`, `#/notes`, `#/review`, `#/settings`:

- The corresponding nav item MUST include:
  - Either a CSS class indicating active state (e.g., `.active`), or
  - `aria-current="page"`, or
  - `[data-active="true"]`.
- Visual treatment:
  - Different text color, background pill, underline, or icon to signal “current section.”

**Tests / Hooks:**

- `ux-design-audit.spec.ts` checks:
  - It queries `nav a, [role="navigation"] a, .nav-link, .menu-item`.
  - It expects at least one `.active`, `[aria-current="page"]`, or `[data-active="true"]` item for each of:
    - `#/media`
    - `#/notes`
    - `#/review`
    - `#/settings`
  - If absent, it logs: “No clear active state indicator on route …”.


## 5. Nested Navigation & Breadcrumbs

### 5.1 Nested Settings Pages

Subroutes under `#/settings/*` (e.g., `#/settings/knowledge`) must provide orientation:

- **Breadcrumbs**:
  - Example text: `Settings > Knowledge`.
  - Can be simple text (no need for full breadcrumb component) but:
    - Must visually convey nesting (e.g., “Settings / Knowledge”).
    - Ideally clickable for “Settings” (back to `#/settings`).
- **Back button**:
  - Button with name matching `/back|←/i`.
  - Action: navigate up one level (e.g., `#/settings/knowledge` → `#/settings`).

**Tests / Hooks:**

- `ux-design-audit.spec.ts`:
  - Navigates to `#/settings/knowledge`.
  - Looks for either:
    - Text matching `/settings\s*[>\/]\s*knowledge/i`, or
    - A button with name `/back|←/i`.
  - If neither, it logs: “Nested settings pages lack breadcrumbs or back navigation.”


## 6. Header Shortcuts & Orientation Aids

### 6.1 Header Shortcuts Panel

**Context:** Options header can show a shortcuts tray that exposes quick links to key sections.

**Behavior:**

- Toggle button in header labeled `/Show shortcuts|Hide shortcuts/i`.
- When expanded:
  - Focus moves to the first shortcut link (e.g., `Review`, `Media`, `Settings`).
  - Links are standard anchors/buttons that navigate to their respective routes.
- When collapsed:
  - Toggle text changes back (Hide → Show).
  - Escape key pressed while focus is inside the shortcuts region should collapse the tray and restore focus to the toggle.

**Persistent state:**

- Whether shortcuts are shown/hidden should persist across:
  - Route transitions (e.g., `#/media` → `#/`).
  - Page reload within the same profile.

**Tests / Hooks:**

- `ux-validate.spec.ts`:
  - Clicks the `Show shortcuts` / `Hide shortcuts` button.
  - Expects after expanding:
    - First shortcut link (`Review|Media|Settings`) to be focused.
  - Navigates away and back to ensure state persists.
  - Uses Escape key from within the shortcuts region to collapse and expects the toggle text to update.


## 7. Keyboard Navigation & Focus

### 7.1 Tab Navigation

**Requirement:** Tabbing from the top of the page should focus interactive elements in a logical order:

1. Global navigation items / header actions.
2. Primary page content controls (e.g., main panel controls, important buttons).
3. Secondary controls (filters, toggles, etc.).

When a user presses Tab multiple times from the Options root:

- There MUST be at least one focused element (`:focus`) on the page.
- Focus MUST be on a focusable, interactive element (not the `<body>` alone).

**Tests / Hooks:**

- `ux-design-audit.spec.ts`:
  - Presses Tab 3×.
  - Checks `page.locator(':focus').count()`.
  - If 0, logs:
    - “Tab navigation does not focus interactive elements.”

### 7.2 Focus Visibility

**Requirement:** All focusable elements must have visible focus indicators.

- For focused element `:focus`:
  - CSS must expose:
    - A visible outline, OR
    - A visible box‑shadow/highlight.
- This must work across:
  - Light and dark themes.
  - Links, buttons, and custom components (switches, toggles, header shortcuts).

**Tests / Hooks:**

- UX audit calls `window.getComputedStyle` for the focused element:
  - Checks `styles.outline !== 'none'` OR `styles.boxShadow.includes('rgb')`.
  - If neither is true, logs:
    - “Focused elements lack visible focus indicator.”


## 8. Sidepanel Navigation & Orientation

While the Sidepanel has its own PRD, Navigation & Orientation touches:

### 8.1 Sidepanel Header Actions

- Buttons in sidepanel header must be:
  - Focusable.
  - Labeled (via text, `title`, or `aria-label`).
  - Visibly focused.

Key actions include:

- `Health & diagnostics`:
  - Opens a new tab pointing to `options.html#/settings/health`.
- Settings (gear icon):
  - Opens Options Settings.
- Temporary chat toggle:
  - Labeled `/toggle temporary chat/i`.
- Kebab / “More options” menu:
  - Button labeled `/more options/i`.
  - Menu items that perform ingest actions:
    - “Save current page on server”.
    - “Process current page locally”.

**Tests / Hooks:**

- `headerActions.spec.ts`:
  - Looks for `toggle temporary chat` button with `aria-pressed` update on click.
  - Looks for `more options` button opening ingest menu.
  - Expects ingestion actions and resulting status messages (e.g., “Sent to tldw_server”, “Processed locally”).
- `ux-design-audit.spec.ts`:
  - Expects sidepanel to have:
    - Ingest/import action.
    - Settings access.
    - New chat / clear/reset button.
  - Checks that icon buttons have either `title`, `aria-label`, or visible text; otherwise logs “Icon button lacks tooltip or accessible label.”


## 9. Orientation in Error & Health States

### 9.1 Connection Errors on Landing

If the root Options page (`optionsUrl` without hash) or a landing route detects a connection error (unreachable server, auth error), navigation must still orient the user:

- Show:
  - Global navigation header (so user can reach Settings/Health).
  - Error banner with:
    - Clear message (cannot connect, etc.).
    - Buttons:
      - `Retry` – re‑run connection check.
      - `Open settings` – navigate to `#/settings/tldw`.

**Tests / Hooks:**

- `ux-design-audit.spec.ts` “Error States & Recovery”:
  - Expects:
    - An error message containing `/cannot.*connect|connection.*failed|offline|unreachable|error/i`.
    - A `Retry` button.
    - A settings link/button.

### 9.2 Health & Diagnostics Back Navigation

In `#/settings/health`:

- Provide `Back to chat` button:
  - Clearly labeled.
  - Navigates back to the main options root (`optionsUrl`).

**Tests / Hooks:**

- `ux-validate.spec.ts`:
  - Expects `Back to chat` button to be visible and functional.


## 10. Functional Requirements

1. **Route Consistency**
   - Navigation must always reflect the current URL.
   - Direct deep‑linking to any route (e.g., `options.html#/settings/knowledge`) must correctly set active nav and breadcrumbs.

2. **Shared Navigation Components**
   - Where possible, use shared components/hooks for navigation state to avoid divergence between header, breadcrumbs, and sidepanel links.

3. **Resilience**
   - Navigation must remain usable even when certain data loads fail (e.g., health check, model list).

4. **Internationalization**
   - All visible navigation labels, breadcrumbs, tooltip text, and headings must be localizable via existing locale infrastructure.


## 11. Acceptance Criteria & QA

### 11.1 Automated Tests

The Navigation & Orientation experience is considered acceptable when:

- `tests/e2e/ux-design-audit.spec.ts` no longer logs:
  - “No clear active state indicator on route …”
  - “Nested settings pages lack breadcrumbs or back navigation”
  - “Tab navigation does not focus interactive elements”
  - “Focused elements lack visible focus indicator”
  - Sidepanel‑related navigation issues (missing settings access, missing labels on icon buttons).
- `tests/e2e/ux-validate.spec.ts` passes header shortcut and Health navigation checks.
- `tests/e2e/headerActions.spec.ts` passes for sidepanel header actions.

### 11.2 Manual QA Scenarios

- Navigate between Media, Notes, Review, Settings using:
  - Mouse clicks.
  - Keyboard (Tab + Enter/Space).
- Deep‑link to nested settings and return via breadcrumb/back.
- Confirm that:
  - Active nav state matches the route.
  - Focus order is logical.
  - Focus indicators are visible.
- From sidepanel:
  - Open Health, Settings, and ingest actions and confirm orientation in the new tabs.


## 12. Open Questions

1. Should we add a top‑level breadcrumb on non‑settings routes (e.g., `Home > Media`) or is the active nav state sufficient?
2. Should we include keyboard shortcuts (e.g., `g m` for Media) and how should those be exposed for discoverability?
3. Should the header shortcuts tray be configurable (e.g., allow users to pin favorite sections)?
4. Do we want persistent “You are here” hints (e.g., small subtitles under main heading) in addition to nav highlighting and breadcrumbs?

These can be refined in design review and implementation planning.

