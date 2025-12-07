# New Onboarding Experience – PRD

## 1. Overview

This document defines a new onboarding experience for the tldw Assistant browser extension. The goal is to replace the current “form‑first” first‑run flow with a guided, multi‑step experience that:

- Explains what the extension is and how it relates to `tldw_server`.
- Helps users choose the right path (already have a server / need one / just exploring).
- Guides them through connecting and authenticating with clear feedback.
- Lands them in a confident “ready to use” state with obvious next actions.

The new flow should significantly reduce confusion around “Server URL” and “API key,” improve accessibility and UX audit scores, and align with existing Playwright onboarding and UX tests.


## 2. Goals & Non‑Goals

### 2.1 Goals

- Provide a clear, welcoming first‑run experience that explains the extension’s purpose.
- Make connecting to `tldw_server` understandable and low‑friction, even for non‑experts.
- Reduce misconfiguration risk for Server URL and API key via inline guidance and validation.
- Ensure users can reach a usable state quickly:
  - Connected to their own server, or
  - Exploring in a “demo/offline” mode with clear limitations.
- Satisfy UX requirements exercised by:
  - `tests/e2e/onboarding.spec.ts`
  - `tests/e2e/ux-design-audit.spec.ts` (Onboarding section).

### 2.2 Non‑Goals

- Designing or implementing the server‑side provisioning or hosting flow for `tldw_server`.
- Changing the underlying connection / auth model (single‑user vs multi‑user semantics).
- Redesigning the entire options UI; scope is first‑run onboarding screens and related entry points.
- Changing underlying storage or telemetry infrastructure.


## 3. Target Users & Scenarios

### 3.1 Personas

- **Self‑hosted tinkerer**  
  Runs `tldw_server` locally or on a VPS, is comfortable with URLs and API keys, but still benefits from guidance and validation.

- **Team power user / admin**  
  Configures `tldw_server` for a small team, needs clarity around multi‑user vs single‑user, wants a reliable, repeatable setup flow.

- **Curious new user without a server yet**  
  Installs the extension from a store but doesn’t have `tldw_server`. Needs to understand what it is and how to either set it up or try a safe “demo” mode.

### 3.2 Key Scenarios

1. **User already runs `tldw_server` locally** and quickly connects using `http://localhost:8000` and an API key.
2. **User has a remote/managed `tldw_server`** and connects via HTTPS with single‑user or multi‑user auth.
3. **User has no server** and:
   - Reads a concise explanation, follows a link to setup docs, or
   - Chooses a demo/offline mode to explore limited capabilities.
4. **User enters a bad URL** (invalid format or unreachable) and gets clear error and recovery options.
5. **User enters an invalid API key** and sees a helpful error plus a direct path to fix it.


## 4. Experience Architecture

High‑level onboarding flow (first run):

1. **Welcome (Step 1 of 4)** – Explain what tldw Assistant is and prompt user to choose a path.
2. **Connect Server (Step 2 of 4)** – Collect and validate `Server URL`.
3. **Authenticate (Step 3 of 4)** – Choose auth mode and configure API key / login.
4. **Confirm & Next Steps (Step 4 of 4)** – Show connection summary and first‑use shortcuts.

If user chose “No server yet,” the flow branches to a “No server / demo mode” experience instead of steps 2–3.


## 5. Detailed UX Flow

### 5.1 Step 1 of 4 – Welcome

**Trigger:** First run where `connection.state.hasCompletedFirstRun === false` and no configured `tldwConfig` is present.

**Layout & Content**

- Title: `Welcome — Let’s get you connected`
- Subtitle: One‑sentence value prop, e.g.  
  “tldw Assistant connects your browser to your self‑hosted AI server (tldw_server) so you can chat, ingest pages, and search your notes and media.”
- Secondary link: `Learn how tldw_server works` (opens docs in a new tab).

**Path selection (three options)**

- **Option A: “I already run tldw_server” (default recommended)**
  - Description: “I have a URL and can log in.”
- **Option B: “I don’t have a server yet”**
  - Description: “Show me how to set one up.”
- **Option C: “Just explore with a local demo”**
  - Description: “Try offline features and sample data (no server required).”

**Actions**

- Primary: `Get started`  
  - Proceeds to:
    - Step 1 (Connect Server) if user chose A.
    - “No server yet” branch if user chose B.
    - “Demo mode” confirmation if user chose C.

**Key Requirements**

- First‑run screen MUST contain text matching `/welcome|get started|let’s get you connected/i` for UX tests.
- User cannot accidentally skip onboarding without explicitly choosing a path.


### 5.2 Step 2 of 4 – Connect to your server

**Header**

- Title: `Step 2 of 4 — Connect to your tldw server`
- Supporting text: “Paste the URL where your tldw_server is running.”
- A simple progress indicator (“1 of 3” text or compact progress bar).

**Form**

- Field: `Server URL`
  - Placeholder: `e.g., http://localhost:8000` (must include `http`).
  - Inline helper text:
    - “This is the base URL of your tldw_server (the address you use to open its web UI).”
  - Link: `Where do I find this?` → popover with:
    - “Local install: usually http://localhost:8000”
    - “Remote: something like https://ai.yourdomain.com”

**Validation & Feedback**

- **Format validation** (on blur and on “Next”):
  - If not URL‑like: show small red error under field: “Enter a valid URL like http://localhost:8000.”
  - Apply red border to input.
- **Reachability / health check** (when user clicks `Test connection` or `Next`):
  - Show inline spinner and message: “Checking server…”
  - On failure (timeout / network error / non‑OK response):
    - Error banner:  
      Title: “Cannot reach this server”  
      Body: “Check that tldw_server is running and your URL is correct.”
      Actions:
        - `Retry` – re‑run health check.
        - `Troubleshooting guide` – open docs.
  - On success:
    - Inline success text near field: “Server responded successfully. You can continue.”
    - Optional detail: “tldw_server vX.Y” if available.

**Navigation**

- Primary: `Next` (enabled only if:
  - URL is valid, and
  - Last reachability check was successful).
- Secondary:
  - `Back` → returns to Welcome, preserving entered URL.
  - Optional `Skip for now` → branches to offline/demo experience, but clearly warns that many features require a server.

**Requirements / Test Hooks**

- When URL is clearly invalid, there MUST be either an inline error message or red border so the UX audit test detects validation feedback.
- When URL is a valid format but unreachable, UI MUST show language roughly matching `/cannot.*reach|unreachable|connection.*failed|offline/i`.
- When URL is reachable, UI MUST show positive feedback containing words like `/connected|reachable|success|ready/i`.


### 5.3 Step 3 of 4 – Authenticate

**Header**

- Title: `Step 3 of 4 — Choose how you sign in`
- Brief description: “Connect as a single user with an API key or log in to a shared server.”

**Auth mode selector**

- Two mutually exclusive options (cards or radios):
  - **Single User (API Key)**  
    Subtitle: “Best for personal or small‑team servers.” (Recommended badge).
  - **Multi‑User (Login)** (optional, v2)  
    Subtitle: “Use username/password or SSO on a shared deployment.”
- Helper copy beneath:
  - Explains when to use each mode (mirrors what UX tests look for with words like “recommended”, “choose”, “when to use”).

**Single User panel**

- Field: `API Key`
  - Input type: `password` by default.
  - Show/hide toggle icon.
  - Placeholder: `Enter your API key`.
- Help text:
  - “Find your API key in tldw_server → Settings → API Keys.”
  - Small `Where do I find this?` link with a short explanation of the path; can open docs/screenshot.
- Validation:
  - If blank on `Connect`: show error “API key is required.”
  - If server responds 401/403 on health or model list:
    - Show message: “Authentication failed. Please check your API key.”
    - Provide link/button: “Open tldw server settings” (to let the user verify).
- Env seeding:
  - If `VITE_TLDW_API_KEY` is detected, it may prefill but should still be editable; optional hint: “Loaded from your environment. You can change this at any time.”

**Multi‑User panel (if supported; optional v2)**

- Fields:
  - `Email or Username`
  - `Password`
  - Optional: “Sign in with SSO” button, depending on server capabilities.
- Copy:
  - “Your credentials are sent only to your tldw_server.”
- MVP behavior:
  - If the connected server does not advertise multi‑user capabilities (or if this feature is not yet implemented), the UI MAY hide the Multi‑User option entirely and only show the Single User (API Key) path.
  - Implementing the full multi‑user login flow (SSO, password forms, etc.) is out of scope for the initial release of this onboarding experience.

**Navigation**

- Primary: `Connect` (or `Continue`) triggers an authenticated health check.
- On success:
  - Inline summary: “You’re signed in to tldw_server” with server name/URL; proceeds to Step 3.

**Requirements / Test Hooks**

- The API key field MUST be `type="password"` by default to satisfy UX audit for masking.
- UI MUST contain copy explaining where to find/generate the API key (words like `where to find / how to get / generate`).


### 5.4 Step 4 of 4 – Confirm & Next Steps

**Header**

- Title: `Step 4 of 4 — You’re ready to go`

**Connection summary**

- Card summarizing:
  - `Connected to: <serverUrl>` (normalized).
  - `Authentication: Single User (API key …1234)` or `Multi‑User`.

**Next steps tiles**

- **Start chatting**
  - “Open the sidepanel and ask a question.”
  - Button: `Open sidepanel` (opens `sidepanel.html`).
- **Ingest your first page**
  - “Save the current tab on your server.”
  - Show shortcut if configured: e.g. `Cmd+Shift+Y`.
- **Explore media & notes**
  - “Visit Media and Notes in Options to see what’s stored and searchable.”

**Header shortcuts toggle**

- Checkbox or toggle: `Show quick shortcuts in the header`  
  - Integrates with existing shortcuts tray tested in `ux-validate.spec.ts`.

**Final action**

- Primary: `Finish`  
  - Marks `hasCompletedFirstRun = true` in connection store.
  - Navigates to the main Options root or Media view, not back into onboarding layout.

**Requirements / Test Hooks**

- After finishing, onboarding layout MUST NOT reappear unless explicitly reset (tests depend on this).
- Some form of “Back to chat / Media” navigation MUST exist from health/knowledge screens (already covered by other specs).


### 5.5 “No server yet” & Demo Mode Branch

**When user chooses “I don’t have a server yet” on Welcome:**

- Screen content:
  - Short explanation of `tldw_server`: self‑hosted, private, bring‑your‑own‑models.
  - Bulleted install options: local Docker, remote/VPS, managed deployments.
  - CTA buttons:
    - Primary: `Open setup guide` (docs).
    - Secondary: `Use local demo mode` and `Remind me later`.

**Demo mode behavior**

- Set connection store to a “demo” mode (re‑using or extending `setDemoMode()` in `src/store/connection.tsx`).
- Show a banner in core views:
  - “Demo mode — Some features are disabled until you connect to your own tldw_server.”
- Allow:
  - Local‑only UX flows (e.g., certain notes/media previews, flashcards UX, etc.).
  - Block or clearly warn for server‑dependent actions (RAG, server chat history).

**Requirements**

- “No server” flow MUST explicitly mention that a server is required for full functionality and link to docs.
- Demo mode MUST be visually and behaviorally distinguishable from a real connected state.

**Demo mode scope (enabled vs blocked)**

- Enabled views/actions:
  - Options UI loads normally, with demo‑mode banner visible.
  - Read‑only exploration of example or locally stored data where possible (e.g., notes/media previews, flashcards UX, header shortcuts).
  - Sidepanel chat UI may render, but should clearly indicate that messages will not be sent to a real server.
- Blocked or clearly warned:
  - Server‑dependent actions such as: RAG/knowledge search, server‑backed chat history, ingesting pages to a remote index, or running health checks.
  - When the user attempts these actions, show inline copy like: “This action requires connecting to your own tldw_server” with a primary action `Connect your server` that routes back into the onboarding/connection flow.
- Testing expectations:
  - Existing onboarding E2E tests will continue to exercise the **real‑server connection path** (Welcome → Connect → Authenticate → Confirm).
  - Demo‑mode behavior may be covered by separate tests in the future and should not change semantics expected by current onboarding specs.


### 5.6 Sidepanel behavior during onboarding

- When `hasCompletedFirstRun === false` and the user opens the sidepanel:
  - Show a focused empty state instead of the normal chat UI.
  - Copy example: “Finish setup to start chatting with tldw Assistant.”
  - Primary action: `Continue setup` → opens the Options onboarding tab at the current step (preferably in the same window).
  - Secondary action: `Learn about tldw_server` → opens docs (optional).
- The sidepanel MUST:
  - Preserve any partial onboarding state when the user returns (no data loss).
  - Provide accessible focus management so keyboard users land on the primary `Continue setup` button when the sidepanel opens in this state.


## 6. Functional Requirements

1. **Onboarding state management**
   - Persist `hasCompletedFirstRun` in connection store and avoid re‑showing onboarding screens once complete.
   - Support a “restart onboarding” action from Settings (for recovery / testability), optionally behind an advanced link.

2. **Path handling**
   - Welcome step MUST branch to:
     - Standard connect/auth flow when user already has a server.
     - “No server yet” flow with link to docs and demo option.
     - Direct demo mode when user explicitly chooses it.

3. **Validation & error mapping**
   - URL format validation must be client‑side and immediate.
   - Reachability and auth validation must map server/network errors into human‑readable banners/messages.
   - Use appropriate `ConnectionPhase` and `errorKind` from `src/store/connection.tsx` to keep state aligned.

4. **Accessibility**
   - All onboarding controls must be keyboard‑navigable with visible focus states.
   - Inputs must have proper `<label>` associations or ARIA labeling for screen readers.
   - Error banners should use `role="alert"` or equivalent to announce issues.
   - The stepper / progress indicator should use an accessible pattern (for example, a list of steps with `aria-current="step"` on the active step).
   - When navigating between steps, focus should move predictably (for example, to the step heading or first interactive control) to support keyboard and screen‑reader users.
   - “Checking server…” status text and failure banners should be exposed via a live region (for example, `role="status"` or `aria-live="polite"`) so changes are announced without requiring focus.

5. **Internationalization**
   - All new user‑facing strings must be added to `src/assets/locale/*` and Chrome `_locales` as appropriate, following existing keys and naming conventions.
   - Chrome `_locales` message keys MUST use only ASCII `[a-zA-Z0-9_]` (no dots or dashes) to comply with Chrome’s i18n constraints and avoid extension‑load failures.

6. **State & migration**
   - Existing installs:
     - On first launch after the new onboarding ships, if a stored `tldwConfig` already contains a non‑empty `serverUrl` and valid auth configuration, set `hasCompletedFirstRun = true` and do **not** show the onboarding wizard.
     - If no usable server configuration is present, treat the user as first‑run and show the onboarding wizard starting at Welcome.
   - Precedence when stored URL/API key exist but `hasCompletedFirstRun` is `false`:
     - Prefer the stored configuration as the source of truth: prefill the corresponding fields in the wizard and, as part of migration, mark `hasCompletedFirstRun = true` after the user successfully reaches the Confirm step.
     - For obviously broken/partial configs (for example, empty URL or missing API key when required), keep `hasCompletedFirstRun = false` and guide the user through the full wizard using any partial data as pre‑filled values.
   - “Restart onboarding” behavior (from Settings):
     - Resets `hasCompletedFirstRun` to `false` and navigates the Options UI back to the Welcome step.
     - Does **not** clear an existing, working `serverUrl` or API key by default; instead, prefill those values so the user can quickly review and confirm.
     - A separate “Reset connection configuration” control (if implemented) may clear all connection settings, including demo‑mode flags, but is not required for the initial onboarding release.


## 7. Acceptance Criteria & QA

### 7.1 Automated Tests (Existing)

- `tests/e2e/onboarding.spec.ts`
  - Fresh install shows onboarding and can be completed to reach chat.
  - URL validation and auth steps behave correctly.
  - Knowledge/health explanations render as expected after onboarding.

- `tests/e2e/ux-design-audit.spec.ts`
  - **Onboarding section** must detect:
    - A clear welcome message on first run.
    - A visible progress indicator (text or progress bar).
    - Helpful Server URL placeholder and explanation of “tldw server.”
    - Immediate validation feedback for invalid URLs.
    - Reachability errors for unreachable URLs.
    - Positive feedback when server is reachable.
    - API key field masked and guidance for where to find the key.

The new flow must pass these tests without weakening other UX suites.

### 7.2 Manual QA Scenarios

- First install, local server at `http://localhost:8000`, successful connect and API key entry.
- First install, bad URL (invalid) then corrected.
- First install, valid but unreachable URL, user retries with correct one.
- First install, invalid API key then corrected.
- User choosing “No server yet” and then switching to demo mode.
- Returning user: onboarding not shown, but Settings offers “Restart onboarding.”


## 8. Analytics & Telemetry (Optional / Future)

If/when telemetry is available, consider tracking:

- Step drop‑off rates (Welcome → Step 1 → Step 2 → Step 3).
- Frequency of “No server yet” and “Demo mode” selections.
- Common failure reasons on connect/auth (masked; no secrets).

These are out of immediate scope but should be kept in mind for instrumenting the new flow later.


## 9. Open Questions

1. Should demo mode pre‑seed any local example data (notes/media/flashcards), or remain mostly empty?
2. Do we want an explicit “self‑host vs managed” choice in the “No server yet” branch, or keep it as doc‑only guidance?
3. Are there server capabilities (e.g., multi‑tenant auth providers) that we should surface on Step 2 when reading `/api/v1/health` or `/`?
4. Should we support importing connection settings (URL + API key) from another browser profile or a file?

These can be refined during implementation and UX design review.


## 10. Copy Contract for Tests

To keep Playwright E2E tests stable, the following phrases or close variants SHOULD remain present in the UI. If copy must change, update both the UI and the corresponding tests.

- **Welcome / onboarding**
  - A visible text node matching `/Let’s get you connected/i` or equivalent welcome copy.
  - A progress indicator showing text like `Step 1 of 4` (or `Step 1 of 3` if tests are updated accordingly) so that `/step\s*\d|1\s*of\s*\d/i` continues to match.
- **Server URL guidance**
  - Label or placeholder including “Server URL” and an example placeholder containing `http`, e.g. `e.g., http://localhost:8000`.
  - Helper text mentioning “tldw server” and/or where to find it, matching patterns like `/tldw.*server|what.*server|where.*find/i`.
- **URL validation and reachability**
  - Invalid URL feedback including words like “invalid”, “error”, or “not valid” to satisfy `/invalid|error|not.*valid/i`.
  - Unreachable URL feedback including words like “Cannot reach this server”, “unreachable”, “connection failed”, or “offline” to satisfy `/cannot.*reach|unreachable|connection.*failed|offline/i`.
  - Positive reachability feedback including “connected”, “reachable”, “success”, or “ready” to satisfy `/connected|reachable|success|ready/i`.
- **API key guidance**
  - API key field placeholder containing “Enter your API key”.
  - Helper text or links that mention where to find or generate the key, matching `/where.*find|how.*get|generate/i` and explicitly referencing tldw_server settings.

When adding or refactoring onboarding copy, verify that these phrases (or updated equivalents) remain discoverable via `getByText`/`getByPlaceholder` selectors used in `tests/e2e/onboarding.spec.ts` and `tests/e2e/ux-design-audit.spec.ts`.
