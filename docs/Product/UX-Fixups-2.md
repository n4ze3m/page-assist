# UX Fixups 2 — Connection Card, Sidepanel First‑Run, and Discoverability

This document tracks a second pass of UX polish on the connection experience (Options + Sidepanel) and on the discoverability of core tools, building on `New-Views-PRD.md` and `UX-Fixups-1.md`.

Status tags: (TODO) not started, (IN‑PROGRESS) actively working, (VERIFY) needs manual QA, (DONE) merged & smoke‑tested. Update tags as PRs land so this file stays current.

All copy changes described below should update i18n keys in `src/assets/locale/**` and `_locales/**` in the same PR (not just English).

---

## 1. Diagnostics Visibility & Connection Card Content

- (TODO) Promote Diagnostics to a primary entry point on the connection card
  - In `src/components/Common/ServerConnectionCard.tsx`:
    - Add a secondary button in the main action row labeled `Diagnostics` (or localized equivalent) that opens `#/settings/health`.
    - Keep the small text link below as optional, but ensure the button is prominent in **First‑run**, **Searching**, and **Error** states.
  - In `src/components/Layouts/Header.tsx`:
    - Ensure the header link label matches the card (`Diagnostics`) and is clearly navigational, not the only troubleshooting affordance.
  - Re‑use the existing `settings:healthSummary.diagnostics` key for user‑visible “Diagnostics” labels rather than introducing new variants like “Troubleshooting”.
- (TODO) Make the central card explain what happens when connected
  - Expand the description into a short list (2–3 bullets) of capabilities unlocked by a healthy server:
    - e.g., “Review media & transcripts”, “Search your knowledge”, “Manage notes, prompts, and flashcards”.
  - In the **Connected** state, add a short caption like “Chat and tools are now available in Options and the sidepanel.”
  - Localize new copy under `option:connectionCard.*` and mirror to all locales.
- (VERIFY) Extend `tests/e2e/serverConnectionCard.spec.ts`
  - Assert that non‑connected states render a visible Diagnostics button on the card.
  - Assert that the header Diagnostics link label is present and routes to `/settings/health`.

---

## 2. Sidepanel First‑Run & Composer Behavior

- (TODO) Avoid competing CTAs on sidepanel first‑run
  - In `src/routes/sidepanel-chat.tsx` and `src/components/Sidepanel/Chat/body.tsx`:
    - When connection state is **not** `CONNECTED`, keep the composer visible but clearly disabled and de‑emphasized (textarea + toolbar), in line with `New-Views-PRD.md` §5.3 (disabled / “Not Ready” state).
    - Render a shared connection card / banner above the composer with a single clear primary action:
      - “Open tldw Settings” or “Connect to server” (which uses `chrome.runtime.openOptionsPage`).
  - Remove any large “Start chatting” button from the sidepanel first‑run view in favor of the shared card.
- (TODO) Make connected sidepanel focus the composer, not show another CTA
  - When the connection transitions to **Connected**:
    - Ensure the sidepanel composer becomes active and is focused (reuse the `tldw:focus-composer` event as needed).
    - Avoid showing an extra “Start chatting” button — the composer itself should be the obvious next step.
- (VERIFY) Extend `tests/e2e/sidepanel-first-run.spec.ts` and `tests/e2e/composer-readiness.spec.ts`
  - Disconnected:
    - Composer textarea is visible but disabled and visually de‑emphasized, with a connection‑aware placeholder and helper banner.
    - A clear primary button is visible on the connection card (“Open settings” / “Connect to server”).
  - Connected:
    - Composer placeholder is the normal one (“Type a message…”).
    - Textarea is focused and the Send button is enabled.

---

## 3. Plain‑Language Copy for Server URLs

- (TODO) Lead with human language, demote raw URLs
  - In `ServerConnectionCard.tsx` and sidepanel first‑run copy:
    - Update headlines/descriptions so they *first* explain what the tldw server is (“your private AI workspace”) before mentioning `http://127.0.0.1:8000`.
    - Move `http://127.0.0.1:8000` into a “Default address” subline or tooltip.
  - In `src/assets/locale/en/option.json` (and other locales):
    - Ensure no first sentence begins with a bare URL; URLs should appear only as examples or hints.
- (VERIFY) Manual copy sweep
  - Scan Options home + sidepanel first‑run for English copy:
    - Confirm the first sentence is understandable to non‑technical users.
    - Spot‑check a few non‑EN locales to ensure meaning remains intact.

---

## 4. Icon‑Only Controls: Labels & A11y

- (TODO) Add visible labels or robust aria for icon buttons
  - In `src/components/Layouts/Header.tsx`:
    - Bottom “scroll to bottom” chevron, model settings, quick ingest, and any other icon‑only controls:
      - Prefer adding short visible text labels at ≥sm breakpoints (“More tools”, “Model settings”).
      - At minimum, ensure `title` and `aria-label` are descriptive (not just “button”).
  - In `src/components/Sidepanel/Chat/header.tsx` and `src/components/Sidepanel/Chat/form.tsx`:
    - For ingest, RAG search, model/prompt selectors, and other icon buttons:
      - Add visible text where layout allows.
      - Otherwise, ensure accessible labels (`aria-label`, `title`) describe the action (“Toggle RAG search”, “Open ingest menu”, etc.).
      - Keep `aria-label` / tooltip wording consistent between Options and Sidepanel for equivalent actions (“Open ingest menu”, “Model settings”, etc.) to reduce confusion.
- (VERIFY) Extend `tests/e2e/headerActions.spec.ts` and `tests/e2e/ux-validate.spec.ts`
  - Assert that key toolbar buttons either:
    - Have visible text matching expectations, or
    - Have non‑empty `aria-label` attributes.
  - Optionally, check that focus indicators appear when tabbing through header/toolbar controls.

---

## 5. Clear Primary Action on Options Home

- (TODO) Ensure a single obvious primary button on the Options home view in each state
  - In `src/routes/option-index.tsx` and `ServerConnectionCard.tsx` (Options view):
    - Disconnected / first‑run:
      - The card’s main primary button should be `Set up server` (or equivalent) styled as the single primary action.
      - Inline “Set up server” text links are fine as secondary cues.
    - Connected:
      - “Start chatting” should remain the primary CTA and be rendered as a primary button (`.ant-btn-primary` or equivalent).
  - Avoid multiple visually‑primary buttons at the same hierarchy level on initial load.
- (VERIFY) Extend `tests/e2e/options-first-run.spec.ts` and `tests/e2e/serverConnectionCard.spec.ts`
  - Disconnected:
    - Expect a primary button labeled “Set up server” on the connection card, and assert it navigates to `/settings/tldw`.
  - Connected:
    - Expect “Start chatting” to be visible and styled as primary, and that clicking it focuses the composer (already covered, just keep the assertion valid).

---

## 6. Implementation & QA Notes

- Keep all new copy behind i18n keys in:
  - `src/assets/locale/en/option.json` and sibling locale files.
  - `src/assets/locale/en/settings.json` where Diagnostics/Health labels live.
- Re‑use the shared connection store and `ServerConnectionCard` in both Options and Sidepanel to prevent divergence.
- After changes:
  - Run the existing Playwright suite, paying attention to:
    - `tests/e2e/options-first-run.spec.ts`
    - `tests/e2e/sidepanel-first-run.spec.ts`
    - `tests/e2e/serverConnectionCard.spec.ts`
    - `tests/e2e/composer-readiness.spec.ts`
    - `tests/e2e/headerActions.spec.ts`
    - `tests/e2e/ux-validate.spec.ts`
  - Perform manual smoke tests on:
    - Chrome: Options + Sidepanel first‑run, error, and connected.
    - Firefox/Edge: at least first‑run and connected, to confirm layouts and labels hold up at narrow widths.
