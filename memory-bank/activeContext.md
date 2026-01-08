# Active Context: Page Assist

Last updated: 2026-01-07

1) Current Work Focus
- Resolve “Chat with Page” occasionally losing context or not sending/showing responses, especially in Firefox.
- Harden content acquisition from current tab to prevent hangs on Firefox (PDF viewer, restricted contexts).
- Eliminate duplicated or prematurely-triggered background actions that interfere with streaming in the sidepanel.
- Ensure correct embedding cache reuse on first turn to avoid silent context resets.

2) Recent Changes (this session)
- Robust tab content retrieval fallback (prevents hangs)
  - File: src/libs/get-html.ts
  - Change: Ensure getDataFromCurrentTab always resolves even if browser.scripting.executeScript returns no/undefined result or throws.
  - Chrome path: fallback to { url: tab.url, content: "", type: "html" }.
  - Firefox path: infer type from URL (pdf/html) and resolve; accounts for built-in PDF viewer limitations.
  - Effect: Prevents UI from appearing stuck when starting a “chat with page” on Firefox.

- Correct embedding reuse keying on first turn
  - File: src/hooks/useMessage.tsx
  - Change: When messages.length === 0, use keepTrackOfEmbedding[websiteUrl] instead of keepTrackOfEmbedding[currentURL], since setCurrentURL is async and may be stale.
  - Effect: Avoids context mismatch or reset on initial turns; improves stability of RAG context across messages.

- Dedupe and gate background-triggered submissions
  - File: src/routes/sidepanel-chat.tsx
  - Change: Added lastBgKeyRef and streaming guard; avoid re-submitting the same background message and do not submit while a stream is active.
  - Effect: Prevents duplicate or colliding submissions (more frequent in Firefox due to sidebar open/toggle timing).

3) Next Steps (short-term)
- Manual QA
  - Firefox:
    - Regular HTML page: verify one clean generation and that response references page content.
    - PDF viewer page: verify no hang; response is produced; context fallback behaves safely.
    - YouTube summarize via context menu: exactly one request fired, no duplicates; runs after any current stream completes.
  - Chromium:
    - Verify same flows to ensure cross-browser parity and no regressions.
- Optional hardening
  - useBackgroundMessage: store Port from browser.runtime.connect({ name: "pgCopilot" }) and disconnect on cleanup to avoid zombie ports on rapid mount/unmount cycles.
  - Add short debounce (250–500ms) for background-triggered submissions.

4) Active Decisions and Preferences
- Retrieval fallback pattern:
  - Always resolve getDataFromCurrentTab to avoid deadlocks; infer type from URL if necessary (Firefox PDF viewer constraint).
- Streaming integrity:
  - Do not start new submissions while streaming; dedupe background-triggered events using a deterministic key (type:text).
- Embedding cache correctness:
  - Reuse vector store keyed by the freshly detected websiteUrl on first turn to avoid stale state race with setCurrentURL.
- Privacy-first remains unchanged; all processing local unless user configures otherwise.

5) Learnings & Insights
- Firefox scripting and PDF viewer can return no result, leading to unresolved Promises and stalled UX; explicit fallbacks are required.
- Background messages can arrive during sidebar lifecycle transitions; explicit gating and deduping stabilizes UX.
- React state updates (setCurrentURL) are async; do not use soon-to-be-updated state for cache lookups on the same tick.

6) Open Questions / To Clarify
- Should we add telemetry (local-only logs) for frequency of fallback paths and deduped events to guide future improvements?
- Do we want queueing for background requests during streaming (process after stream ends) or continue to drop duplicates?

7) Update Triggers
- Any regression in “chat with page” streaming or context reuse.
- Changes to browser.scripting or PDF viewer behavior in Firefox/Chromium.
- Adjustments to background-triggered workflows (YouTube summarize, custom copilot menus).

Appendix: Reference Pointers
- Fallbacks: src/libs/get-html.ts
- Embedding reuse: src/hooks/useMessage.tsx
- Background gating/dedupe: src/routes/sidepanel-chat.tsx
