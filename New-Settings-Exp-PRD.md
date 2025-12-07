# New Settings Experience – PRD

## 1. Overview

This document defines an improved Settings experience for the tldw Assistant browser extension.

The goals are to:

- Make Settings the clear “home” for configuring server connection, authentication, knowledge/RAG behavior, and advanced resources (World Books, Dictionaries).
- Provide clear structure and headings so users can quickly find what they need.
- Ensure every setting has an accessible label and clear save/feedback behavior.
- Expose health/diagnostics in a friendly, actionable way.

The new Settings experience must align with and be validated by existing Playwright tests, especially:

- `tests/e2e/ux-design-audit.spec.ts` (Settings Configuration UX, Error Recovery)
- `tests/e2e/tldw-auth-ux.spec.ts`
- `tests/e2e/knowledge-rag-ux.spec.ts`
- `tests/e2e/worldBooks.spec.ts`
- `tests/e2e/dictionaries.spec.ts`
- `tests/e2e/ux-validate.spec.ts` (Health & diagnostics section)


## 2. Goals & Non‑Goals

### 2.1 Goals

- Group settings into logical, clearly labeled categories (e.g., Connection, Knowledge, Chat & Models, Data & Content).
- Ensure all inputs have accessible labels and/or placeholders; address current gaps detected by UX audits.
- Make it obvious whether settings auto‑save or require a manual “Save/Apply,” and provide confirmation feedback.
- Provide rich but de‑jargonized explanatory copy for advanced areas (multi‑user auth, RAG workspace, Health & diagnostics).
- Maintain consistent navigational patterns across all settings subsections (breadcrumbs/back, headings, action buttons).

### 2.2 Non‑Goals

- Redesigning all non‑settings options pages (Media, Notes, Review, etc.).
- Changing the underlying configuration storage format or syncing behavior.
- Implementing new server capabilities (e.g., new RAG endpoints or auth providers) beyond what the UI already supports.
- Implementing analytics/telemetry; these can be layered on later.


## 3. Target Users & Scenarios

### 3.1 Personas

- **New self‑hosted user**  
  Needs a simple way to configure URL + API key and understand why connection fails.

- **Team admin**  
  Configures multi‑user auth, knowledge/RAG behavior, and shared resources (World Books, Dictionaries) for their team.

- **Power user / researcher**  
  Regularly tweaks RAG settings, dictionaries, and specialized content sources to improve retrieval.

### 3.2 Key Scenarios

1. **Configuring tldw_server connection and auth** from scratch, including handling login failures or invalid API keys.
2. **Understanding search/RAG behavior** and toggling per‑reply RAG on or off.
3. **Inspecting health & diagnostics** to troubleshoot connection, indexing, and knowledge status.
4. **Managing content sources** like World Books and Chat Dictionaries.
5. **General navigation**: moving between settings sections and returning back to main chat/media views.


## 4. Information Architecture

Settings is composed of:

1. **Settings root** – `#/settings`  
   - Overview with category tiles/cards linking into subsections.
2. **Connection & Auth** – `#/settings/tldw`  
   - Server URL, auth mode (single/multi‑user), API key/login.
3. **Knowledge & RAG** – `#/settings/knowledge`  
   - RAG workspace, auto‑RAG toggles, capability callouts.
4. **Health & Diagnostics** – `#/settings/health`  
   - Status overview, knowledge health, copy diagnostics, back to chat.
5. **World Books** – `#/settings/world-books`  
   - Table of World Books, create/import flows.
6. **Chat Dictionaries** – `#/settings/chat-dictionaries`  
   - Dictionary manager: create/import dictionaries, view entries.

All subsections share:

- A primary heading (`h1`/`h2`) describing the section.
- Clear labels for controls.
- Consistent navigation (breadcrumbs/back actions).


## 5. Detailed UX Design

### 5.1 Settings Root – `#/settings`

**Purpose:** Provide an at‑a‑glance map of configuration areas and help users orient themselves quickly.

**Layout**

- Page title: `Settings`
- Optional subtitle: “Configure connection, knowledge, chat, and advanced resources.”
- Category cards or sections (at least one heading per category):
  - **Connection**
    - Link to `tldw server` settings (`#/settings/tldw`).
    - Short description: “Connect to your tldw_server and configure authentication.”
  - **Knowledge**
    - Link to `Knowledge search & chat` (`#/settings/knowledge`).
    - Short description about RAG/search behavior.
  - **Diagnostics**
    - Link to `Health & diagnostics` (`#/settings/health`).
    - Short description: “Check connection status, knowledge health, and copy diagnostics.”
  - **Data & Content**
    - Link to `World Books` (`#/settings/world-books`).
    - Link to `Chat Dictionaries` (`#/settings/chat-dictionaries`).

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` expects:
  - At least some headings on the settings page: `h2, h3, [role="heading"]` count > 0.
  - Inputs to have labels or placeholders; missing labels are flagged as major issues.


### 5.2 Connection & Auth – `#/settings/tldw`

**Purpose:** Centralize all tldw_server connection and authentication configuration.

**Sections**

1. **Server connection**
   - Heading: “tldw server connection” (or similar).
   - Fields:
     - `Server URL` with placeholder `e.g., http://localhost:8000`.
     - Helper text: “This is where your tldw_server is running.”
   - Actions:
     - `Test connection` button (optional), with inline feedback:
       - Success: “Server responded successfully. You can continue.”
       - Failure: “Cannot connect to server. Check your URL or open Health & diagnostics.”
     - Link/button: `Health & diagnostics` (navigates to `#/settings/health`).

2. **Authentication Mode**
   - Heading: “Authentication Mode”.
   - Options:
     - Single User (API Key) – recommended for personal use.
     - Multi‑User (Login) – for shared servers.
   - Single User panel:
     - Field: `API Key` (type `password`, with show/hide toggle).
     - Helper: “Find your API key in tldw_server → Settings → API Keys.”
   - Multi‑User panel:
     - Fields: `Username`, `Password`.
     - Optional SSO control if supported.

**Error Messaging**

- For single‑user invalid key:
  - Inline error: “Authentication failed. Please check your API key.”
  - Option to open Health & diagnostics or tldw_server settings.
- For multi‑user login failure (`tldw-auth-ux`):
  - Friendly error copy:
    - “Login failed. Check your username/password or confirm multi‑user auth is enabled on your tldw server.”
  - A visible “Health & diagnostics” button that navigates to `#/settings/health` to inspect deeper issues.

**Save & Feedback**

- If using explicit Save:
  - Button: `Save`
  - After click:
    - Show toast or inline success message: “Settings saved” (text containing `/saved|updated|success/i`).
- If using auto‑save:
  - No Save button; instead show copy: “Changes are saved automatically.”

**Requirements / Test Hooks**

- `tldw-auth-ux.spec.ts` expects:
  - Friendly multi‑user login error text.
  - A button labeled `/Health & diagnostics/i` that navigates to `#/settings/health`.
- UX audit expects:
  - API key input to be masked (`type="password"`).
  - Clear copy about where to find/generate the API key.
  - Clear indication of Save vs auto‑save behavior.


### 5.3 Knowledge & RAG – `#/settings/knowledge`

**Purpose:** Provide a “Knowledge workspace” that explains retrieval‑augmented generation and configures RAG behavior.

**Header**

- Title: `Knowledge search & chat`
- Supporting description:
  - “Retrieval‑augmented generation (RAG) lets the assistant ground answers in your notes, media, and other sources.”

**Content**

- If RAG endpoints are available:
  - Expose:
    - Toggle switch: `Use RAG for every reply`
      - Accessible name must match this pattern for tests.
      - Switch toggles `chatMode` between `normal` and `rag` in `useStoreMessageOption`.
    - Optional per‑section copy/microcopy describing implications.
- If RAG is unsupported:
  - Callout panel:
    - “RAG search is not available on this server.”
    - Suggests enabling or upgrading server features.
    - `Health & diagnostics` button to inspect details.

**Requirements / Test Hooks**

- `knowledge-rag-ux.spec.ts` expects:
  - Visible header containing “Knowledge search & chat”.
  - De‑jargonized explanatory text referencing RAG.
  - Switch labeled `/Use RAG for every reply/i` that flips `chatMode` between `normal` and `rag`.
  - Alternative “RAG unsupported” callout with a `Health & diagnostics` button.


### 5.4 Health & Diagnostics – `#/settings/health`

**Purpose:** Provide a single place to inspect connection status, knowledge indexing, and diagnostic details, and to copy/share environment data for support.

**Sections**

1. **Shared server overview**
   - Heading: “How tldw server fits into this extension”.
   - Copy explains:
     - Which features depend on the server (RAG, media processing, server‑backed chat).
     - Basic architecture (browser extension → tldw_server).

2. **Knowledge status**
   - Heading: “Knowledge search & retrieval”.
   - Content:
     - Text describing current knowledge/index health.
     - When `serverUrl` is empty:
       - Onboarding‑style banner:
         - “Server is not configured.”
         - Subtext: “Don’t have a server yet? Learn how to set one up.”
         - Link/button to docs.

3. **Diagnostics actions**
   - `Copy diagnostics` button:
     - Copies a JSON or text blob with key details (e.g., `serverUrl`, connection phase, knowledgeStatus).
     - For tests, the copied text MUST include the string `serverUrl`.
   - `Back to chat` button:
     - Navigates back to the main options root (URL equal to `optionsUrl`).

**Requirements / Test Hooks**

- `ux-validate.spec.ts` expects:
  - Text containing “Knowledge search & retrieval”.
  - Text containing “How tldw server fits into this extension”.
  - Conditional banner: “Server is not configured” and “Don’t have a server yet?” when `serverUrl` is empty.
  - A `Back to chat` button that returns to options root.
  - A `Copy diagnostics` button; clipboard text must include `serverUrl`.


### 5.5 World Books – `#/settings/world-books`

**Purpose:** Manage “World Books” content sets used for retrieval.

**Layout**

- Title: `World Books`
- Primary actions:
  - `New World Book` button.
  - `Import` button (CSV/JSON or other supported formats).
- Table or list:
  - Columns: Name, Entries, Last updated, Actions.
  - For empty state:
    - Show guidance text: “No World Books yet. Create a new one or import an existing set.”

**Requirements / Test Hooks**

- `worldBooks.spec.ts` expects:
  - Buttons labeled `/New World Book/i` and `/Import/i`.
  - Text containing `/Entries/i` (table header).


### 5.6 Chat Dictionaries – `#/settings/chat-dictionaries`

**Purpose:** Manage dictionaries used to normalize or enrich chat vocabulary.

**Layout**

- Title: `Chat Dictionaries`
- Primary actions:
  - `New Dictionary` button.
  - `Import` button.
- Table or list:
  - Columns: Name, Entries, Last updated, Actions.
  - Empty state:
    - “No dictionaries yet. Create one to define custom vocabulary for your chats.”

**Requirements / Test Hooks**

- `dictionaries.spec.ts` expects:
  - Buttons labeled `/New Dictionary/i` and `/Import/i`.
  - Text containing `/Entries/i`.


## 6. Save Model & Feedback

Settings areas may use either:

1. **Explicit Save**
   - Section‑level or page‑level `Save` / `Apply` / `Update` button.
   - After a successful save:
     - Show toast or inline message:
       - E.g., “Settings saved successfully.”
       - Must match `/saved|updated|success/i` for audits.
2. **Auto‑Save**
   - No save button; instead:
     - Inline text: “Changes are saved automatically.”

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` checks:
  - If a save button exists, clicking it must be followed by visible success messaging or a semantic success indicator (`.toast`, `[role="alert"]`, or class containing “success”).
  - If no save button exists, there must be visible text indicating auto‑save behavior with wording like `auto save` or `changes saved automatically`.


## 7. Accessibility & Labels

**Form Inputs**

- Every visible `input`, `select`, and `textarea` in settings must have at least one of:
  - An associated `<label for="...">`,
  - A meaningful `aria-label`,
  - A descriptive `placeholder`.
- Exceptions for purely decorative inputs must not be focusable.

**Headings**

- Each settings page must have at least one visible heading (`h1`, `h2`, `h3`, or `[role="heading"]`).
- Subsections should use headings to clearly group controls (e.g., “Connection”, “Authentication”, “Knowledge”, “Diagnostics”).

**Keyboard Navigation**

- All interactive elements (buttons, links, switches) must be reachable by Tab/Shift+Tab.
- Focus indicators (outline/box‑shadow) must be visible in both light/dark modes.

**Requirements / Test Hooks**

- `ux-design-audit.spec.ts` flags:
  - Lack of headings on settings page as minor issue.
  - Inputs without label/placeholder/aria‑label as major issue.


## 8. Functional Requirements

1. **Routing**
   - All settings routes (`#/settings`, `#/settings/tldw`, `#/settings/knowledge`, `#/settings/health`, `#/settings/world-books`, `#/settings/chat-dictionaries`) must work via direct URL navigation and via internal links.

2. **State Consistency**
   - Settings changes must update shared stores (e.g., connection store, message options) and be reflected in dependent UIs (sidepanel, main chat, media, etc.).

3. **Error Handling**
   - Connection/auth failures should not leave the settings page in an ambiguous state; they must surface user‑friendly errors and guidance.

4. **Integration with Playwright Test Hooks**
   - Existing test hooks (`__tldw_useConnectionStore`, `__tldw_useStoreMessageOption`) must remain functional to allow tests to simulate connected/unconfigured states.

5. **Internationalization**
   - All new strings must be added to `src/assets/locale/*` and `_locales/*` where relevant, following existing naming conventions.


## 9. Acceptance Criteria & QA

### 9.1 Automated Tests

The new Settings experience should:

- Pass all relevant tests:
  - `ux-design-audit.spec.ts` sections for Settings and Error Recovery.
  - `tldw-auth-ux.spec.ts`.
  - `knowledge-rag-ux.spec.ts`.
  - `worldBooks.spec.ts`.
  - `dictionaries.spec.ts`.
  - `ux-validate.spec.ts`.

### 9.2 Manual QA Scenarios

- Configure server and auth from scratch via `#/settings/tldw`.
- Trigger multi‑user login failure and verify friendly error + Health link.
- Toggle RAG behavior and confirm it affects chat mode.
- Use Health & diagnostics to copy diagnostics and navigate back to chat.
- Create and import a World Book and a Chat Dictionary.
- Navigate Settings entirely via keyboard and verify focus states.


## 10. Open Questions

1. Should the Settings root show “last updated” or “status” summaries for key sections (e.g., connection OK, RAG enabled)?
2. Should we introduce search/filter within Settings to quickly jump to a particular control?
3. Should we provide “Reset to defaults” per section, and how should that interact with auto‑save?
4. Are there additional advanced sections (e.g., Appearance, Shortcuts, Telemetry) we want to add in the near future?

These can be refined during design review and implementation planning.

