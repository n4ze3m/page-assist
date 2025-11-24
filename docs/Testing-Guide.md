# Testing Guide — tldw Assistant Extension

This document explains how to run and understand the test suite for this repo, and how it fits with manual QA.

---

## 1. Test Types & Overview

- **Type checking**
  - Command: `bun run compile` (or `npm run compile`)
  - Runs `tsc --noEmit` against the whole project.

- **End‑to‑end (E2E) tests with Playwright**
  - Command (all tests): `bun run test:e2e` or `npx playwright test`
  - Command (single file): `bun run test:e2e -- tests/e2e/knowledge-rag-ux.spec.ts`
  - UI mode: `bun run test:e2e:ui` for visual debugging.
  - Config: `playwright.config.ts`
    - `testDir: tests/e2e`
    - Browser: Chromium only (`chromium-extension` project) using a real unpacked extension.
    - Traces: `trace: 'on-first-retry'`, screenshots/videos on failure.
    - Global setup builds the extension once via `tests/e2e/setup/build-extension.ts`.

- **Manual smoke tests**
  - Used to validate behavior across Chrome / Firefox / Edge where automation doesn’t fully cover (see section 5).

---

## 2. Prerequisites

- **Node + bun**
  - Install dependencies: `bun install` (or `npm install`).
- **Playwright + Chromium**
  - If Chromium is not installed for Playwright, run: `npx playwright install chromium`.
- **Build tooling**
  - Global setup prefers `npm run build:chrome`; falls back to `cross-env TARGET=chrome wxt build` and then `bun run build:chrome`.
  - You do not need to build manually for E2E runs, but a local build can speed iteration.

---

## 3. Core Commands

From the repo root:

```bash
# TypeScript type check
bun run compile

# Build extension for all browsers (optional for tests)
bun run build

# Run all Playwright E2E tests
bun run test:e2e

# Run a single spec
bun run test:e2e -- tests/e2e/knowledge-rag-ux.spec.ts

# Open Playwright UI runner
bun run test:e2e:ui
```

Artifacts (traces, screenshots, videos) are written under `test-results/`.

---

## 4. E2E Test Suites (By Area)

All E2E tests live in `tests/e2e`. They load the unpacked extension either from `.output/chrome-mv3` (dev) or `build/chrome-mv3` (CI / fallback).

### 4.1 Connection, Onboarding, & Server Card

- `tests/e2e/options-first-run.spec.ts`
  - First‑run Options experience when no server is configured.
  - Verifies connection card copy and CTAs (connect vs retry).
- `tests/e2e/serverConnectionCard.spec.ts`
  - Detailed behavior of the connection card (connected, error, retry, Diagnostics).
  - Uses `MockTldwServer` to simulate healthy and failing servers.
- `tests/e2e/onboarding.spec.ts`
  - Multi‑step onboarding flow in Options, including server URL + API key setup.
- `tests/e2e/connection-loading-ctas.spec.ts`
  - Loading and retry CTAs while the connection check is in progress.
- `tests/e2e/pageAssistLoader.spec.ts`
  - Ensures the extension loads correctly and rebranded “tldw Assistant” assets are used.

### 4.2 Chat, Composer, Models, & Streaming

- `tests/e2e/composer-readiness.spec.ts`
  - Chat composer enabled/disabled states based on connection and server health.
- `tests/e2e/chat-models.spec.ts`
  - Model list loading, provider grouping, and selection UX in the header.
- `tests/e2e/chatStreaming.spec.ts`
  - SSE streaming behavior from the mock server; verifies incremental tokens and finalization.
- `tests/e2e/queued-messages.spec.ts`
  - Queued message UX while a prior message is still in flight.
- `tests/e2e/timeouts.spec.ts`
  - Behavior when requests time out or servers become unresponsive.
- `tests/e2e/errorBubble.spec.ts`
  - Inline error bubble UX in chat and how it clears.

All of these use `MockTldwServer` (`tests/e2e/utils/mock-server.ts`) to simulate tldw_server behavior without hitting a real backend.

### 4.3 Sidepanel & First‑Run

- `tests/e2e/sidepanel-first-run.spec.ts`
  - Sidepanel first‑run state for connected vs disconnected servers.
  - Ensures the connection card, disabled composer, and CTAs match the PRD.

### 4.4 Feature Views (Review, Media, Knowledge, Notes, Prompts, Dictionaries, World Books)

- `tests/e2e/review-ux.spec.ts`
  - Review view UX (navigation, empty state, initial flows).
- `tests/e2e/media-ux.spec.ts`
  - Media options UX: navigation, empty states, key actions.
- `tests/e2e/media-and-tts.spec.ts`
  - Media ingestion plus transcription / TTS controls with a mock server.
- `tests/e2e/knowledge-rag-ux.spec.ts`
  - Knowledge page RAG workspace:
    - Auto‑RAG toggle wiring to `chatMode`.
    - Capability callout when RAG endpoints are unavailable.
- `tests/e2e/feature-empty-states.spec.ts`
  - Connection‑aware empty states for Notes and Knowledge:
    - Offline: “Connect to use …” + “Connect to server” CTA.
    - Connected but no data: feature‑specific “No … yet” empty state.
- `tests/e2e/notes-ux.spec.ts`
  - Notes list and detail UX, including create/edit flows.
- `tests/e2e/prompts-ux.spec.ts`
  - Prompt library UX, search, and basic CRUD.
- `tests/e2e/dictionaries.spec.ts`
  - Dictionaries feature behavior (list, add, delete).
- `tests/e2e/worldBooks.spec.ts`
  - World Books API and UI flows.

### 4.5 RAG & Search

- `tests/e2e/ragSearch.spec.ts`
  - End‑to‑end RAG search behavior via the mock server’s `/api/v1/rag/search` endpoint.
- `tests/e2e/knowledge-rag-ux.spec.ts`
  - (See above) UI/UX for the Knowledge RAG workspace.

### 4.6 API & Validation Smoke Tests

- `tests/e2e/api-smoke.spec.ts`
  - Minimal smoke coverage for key proxy endpoints (Notes, Prompts, World Books).
  - Uses an inline HTTP server to check that the extension calls the right paths.
- `tests/e2e/apiKeyValidation.spec.ts`
  - API key validation UX (valid vs invalid keys) against `MockTldwServer`.

### 4.7 Header, Navigation, & Global UX

- `tests/e2e/headerActions.spec.ts`
  - Header shortcuts, toolbar actions, and More/Menu behavior.
- `tests/e2e/ux-validate.spec.ts`
  - Higher‑level UX validation:
    - Sticky header + shortcuts behavior and focus management.
    - Sidepanel “quick ingest” accessibility.
    - Health Status “Copy diagnostics” behavior.
  - Optionally uses real server config:
    - `TLDW_URL` (e.g. `http://127.0.0.1:8000`)
    - `TLDW_API_KEY` (single‑user key)
    - If these aren’t set or the server is unreachable, tests fall back to seeding config via `chrome.storage`.
- `tests/e2e/options-first-run.spec.ts` and `tests/e2e/serverConnectionCard.spec.ts`
  - Also relevant for global navigation (Options home vs Settings).

---

## 5. Manual Smoke Testing

Automation covers a lot of the UX, but the repo still expects manual smoke tests before major changes, especially for layout and browser quirks.

Recommended manual pass (per browser: Chrome, Firefox, Edge):

- **Options Home**
  - First‑run (no server configured): connection card, “Set up server”, Diagnostics link.
  - Connected state: “Start chatting” focuses the composer; shortcuts grid behaves correctly.
- **Chat (Options + Sidepanel)**
  - Composer enable/disable states align with connection status.
  - Streaming responses render progressively; queued messages behave as expected.
  - Error bubbles appear for network/API errors and clear on retry.
- **Feature views**
  - Review, Media, Knowledge, Notes, Prompts, Flashcards:
    - Empty states and CTAs make sense when connected vs disconnected.
    - Primary actions actually start the relevant flows (upload, create, generate).
- **Knowledge page**
  - RAG workspace:
    - Cannot search until a finished knowledge base is selected.
    - Auto‑RAG toggle affects chat behavior.
    - RAG error callouts point to Diagnostics.
  - Knowledge sources table:
    - Add/Update modals behave as expected for both uploads and text input.
    - Deleting a knowledge base or a single source shows clear, contextual confirmation.
- **Settings**
  - tldw server settings: save behavior, inline errors, and connection status copy.
  - Health Status: “Recheck” and “Copy diagnostics” work and show fresh data.

---

## 6. Tips & Troubleshooting

- **“Browser specified in your config is not installed”**
  - Run `npx playwright install chromium` once locally.
- **Extension build issues in tests**
  - Ensure `npm` is available (global setup uses `npm run build:chrome` first).
  - If `npm` is not installed, run `bun run build:chrome` manually before `bun run test:e2e`.
- **Flaky connection‑dependent tests**
  - Many suites use `MockTldwServer`; check console output and ensure no other process is using the chosen port.
  - For tests that use a real server (`ux-validate.spec.ts` with `TLDW_URL` / `TLDW_API_KEY`), confirm the server is reachable and CORS is configured for `http://127.0.0.1`.

If you add new tests, keep them under `tests/e2e/`, prefer using `MockTldwServer` or similar harnesses, and update this guide with a one‑line description and the primary command to run that area.
