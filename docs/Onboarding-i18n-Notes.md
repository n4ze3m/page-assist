# Onboarding i18n Notes

This document is for translators and contributors who update the onboarding copy and locale files. It summarizes which strings are tied to automated UX tests so wording changes do not accidentally break Playwright selectors.

## 1. Files and Namespaces

- Core onboarding strings live in:
  - `src/assets/locale/<lang>/settings.json` under the `"onboarding"` object.
- Chrome `_locales` message keys under `src/public/_locales/*/messages.json` may reuse similar text, but **keys must only use ASCII `[a-zA-Z0-9_]`** to satisfy Chrome’s i18n rules.

## 2. Test-Sensitive Keys

The following keys (and their general meaning) are referenced by Playwright tests via `getByText` or related matchers. You can localize them freely, but keep the intent and surface visible somewhere in the UI.

### 2.1 Welcome and Progress

- `settings:onboarding.title`
  - Must include a welcoming phrase equivalent to “Welcome — Let’s get you connected”.
- `settings:onboarding.progress`
  - Used via `t('settings:onboarding.progress', 'Step {{current}} of {{total}}')`.
  - Tests look for text like “Step 1 of 4” or similar; keep the “Step X of Y” structure visible.
- `settings:onboarding.progressAria`
  - Accessible label for the visual stepper; feel free to localize, not test-critical.
- `settings:onboarding.stepLabel.*`
  - `welcome`, `url`, `auth`, `health` – labels for the four steps in the stepper.

### 2.2 Server URL and Connection Feedback

- `settings:onboarding.serverUrl.label`
  - Label for the “Server URL” input; tests also probe via `/Server URL/i`.
- `settings:onboarding.serverUrl.placeholder`
  - Should contain an example with `http`, e.g. `http://127.0.0.1:8000`.
- `settings:onboarding.serverUrl.invalid`, `.invalidProtocol`, `.emptyHint`
  - Shown when the URL is missing/invalid; tests only check that some visible text mentions an invalid/incorrect URL.
- `settings:onboarding.serverUrl.checking`
  - Shown while checking reachability; tests don’t depend on exact wording.
- `settings:onboarding.serverUrl.reachable`
  - Must convey success, e.g. “Server responded successfully. You can continue.”
  - Tests look for `/Server responded successfully\. You can continue\./i` or equivalent wording.
- `settings:onboarding.serverUrl.unreachable`
  - Must convey failure, e.g. “We couldn’t reach this address…”.
  - Tests match generic phrases like “Cannot reach / unreachable / connection failed / offline”.

### 2.3 Authentication and API Key

- `settings:onboarding.authMode.label`
  - Label for the auth mode selector; tests look for `/Authentication Mode/i`.
- `settings:onboarding.authMode.single`, `.multi`
  - Options “Single User (API Key)” and “Multi User (Login)”; the exact English wording is referenced in some tests.
- `settings:onboarding.apiKey.label`
  - Label for the API key field; tests also use `/API key/i`.
- `settings:onboarding.apiKey.placeholder`
  - Should include “Enter your API key” or equivalent so `getByPlaceholder(/Enter your API key/i)` still finds it.
- `settings:onboarding.apiKeyHelp`
  - Must explain where to obtain the API key (e.g. “tldw_server → Settings → API Keys”).
  - UX audit tests look for generic patterns like `where.*find|how.*get|generate` in the rendered text.
- `settings:onboarding.authModeHelp`
  - Explains when to use Single User vs Multi User; not strictly test-bound but important for clarity.

### 2.4 Path Choice and Demo Mode

- `settings:onboarding.path.heading`
  - Title above the three path options (has server / no server / demo).
- `settings:onboarding.path.hasServer`, `.noServer`, `.demo`
  - Labels for those options; these are not currently used by tests but should stay short and descriptive.
- Other `settings:onboarding.path.*` keys (like `noServerBody`, `demoBody`) describe the “no server yet” and demo mode flows; they can be localized freely as long as the meaning remains.

## 3. General Guidance

- When updating onboarding copy:
  - **Keep the same key structure** across all locale files, even if you only change English first. Other languages can temporarily fall back to English text.
  - After changing key names or removing text completely, update the corresponding Playwright tests under `tests/e2e/` (especially `onboarding.spec.ts` and `ux-design-audit.spec.ts`).
- Avoid adding periods/ellipsis inside regex-sensitive strings unless you also adjust the tests.
- For new onboarding strings, prefer adding them under `settings:onboarding.*` in `settings.json` rather than scattering them across multiple namespaces.

## 4. Where to Look in Tests

- `tests/e2e/onboarding.spec.ts`
  - Checks for the welcome title, server URL help/success/failure messages, and API key behavior.
- `tests/e2e/ux-design-audit.spec.ts` (Onboarding section)
  - Uses regular expressions over visible text to detect friendly placeholders, explanations for “tldw server”, URL validation feedback, and API key guidance.

If you change copy and aren’t sure whether it’s safe, search in `tests/e2e` for the corresponding phrase or key and update the test expectations along with the translation.

