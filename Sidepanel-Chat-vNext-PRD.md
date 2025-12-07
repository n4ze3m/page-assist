# Sidepanel Chat vNext – Stake PRD

> This document is an initial “stake in the ground” for the sidepanel chat experience. It is intentionally high‑level and will be refined and expanded as design and implementation proceed.

## 1. Overview

The sidepanel chat is the primary “always‑on” entry point to tldw Assistant while browsing. Today it is functional but feels closer to a thin wrapper around the main playground than a purpose‑built companion.

This vNext PRD stakes out a direction where the sidepanel becomes:

- A fast, context‑aware assistant anchored to the current page.
- A first‑class chat surface with clear persistence semantics and history.
- A discoverable hub for ingesting content and jumping into deeper tools (Media, Notes, Review, Settings).


## 2. Goals & Non‑Goals

### 2.1 Goals

- **Make sidepanel chat feel “always ready.”**  
  The composer should be visible, focused, and responsive whenever the panel opens, with minimal flicker or blocking states.

- **Clarify what’s happening and where things are saved.**  
  Persistence modes (temporary, local‑only, local+server) should be obvious, along with where to find a conversation later.

- **Tighten connection to the current page.**  
  It should be easy to ask “about this page,” ingest it, and see that the assistant is using that context.

- **Improve discoverability of key actions.**  
  Users should quickly find ingest, Health, Settings, and “New chat” without hunting.

- **Support power users without overwhelming casual usage.**  
  Advanced options (RAG toggles, model selection, dictionaries) should be reachable but not intrusive.

### 2.2 Non‑Goals

- Replacing the options playground as the full‑screen configuration/workbench.
- Implementing a complex multi‑panel layout inside the sidepanel.
- Solving every long‑term feature (tabs, workspaces, full bookmarks) in one iteration.


## 3. Design Principles

1. **Composer‑first**  
   The input area is the core affordance. It should always be visible, keyboard‑friendly, and clearly interactive.

2. **State is explicit, not surprising**  
   Connection state, persistence mode, and limitations (demo/offline) should be expressed in plain language, not inferred.

3. **Context is cheap to apply**  
   Bringing in the current page (or a selection) should take one click or less, with clear confirmation.

4. **Symmetry with the main chat, not duplication**  
   The sidepanel should share core semantics (streaming, persistence labels) with the main playground but be optimized for constrained space and quick tasks.

5. **Accessible by default**  
   Keyboard navigation, focus, ARIA labelling, and contrast must be first‑class considerations, not bolt‑ons.


## 4. Opportunity Areas

### 4.1 Composer & Message Flow

**Problems today (high‑level):**

- Composer can be hard to discover in some states.
- It’s not always obvious when the assistant is “thinking” vs idle.
- Enter‑to‑send is supported, but a visible send button is not always prominent.

**vNext direction:**

- Anchor a persistent composer at the bottom of the panel with:
  - Stable placeholder (“Type a message…”).
  - Visible `Send` button and hotkey affordance.
  - Clear disabled state when blocked (e.g., hard error) with explanatory text.
- Strengthen streaming UX:
  - Always show a transient “assistant is responding” state for in‑flight replies.
  - Animate token arrival without jank.


### 4.2 Persistence, History & “Where did my chat go?”

**Problems today:**

- Users may not understand whether a chat is saved, temporary, or server‑backed.
- It’s unclear where to reopen a conversation later (local vs server history).

**vNext direction:**

- Standardize three modes with explicit labels:
  - Temporary (ephemeral, not saved anywhere).
  - Local‑only (saved in this browser).
  - Local+Server (saved locally and on server).
- Make switching mode a conscious action:
  - A small mode switcher and one‑time explainer when promoting to server‑backed.
- Explore light‑weight recent‑chat access:
  - A simple “Recent chats…” link or dropdown that opens the main chat/Review view scoped to that conversation.


### 4.3 Page Context & Ingest

**Problems today:**

- Ingest is present but feels like a separate action rather than integral to chat.
- It’s not obvious when a response is grounded in the current page vs general knowledge.

**vNext direction:**

- Tighten the loop between page and chat:
  - Quick action: “Ask about this page” that:
    - Ingests (or references) the page.
    - Seeds the composer with a prompt like “Summarize this page.”
  - Clear confirmation that page context was captured (short status line).
- Make ingest more central:
  - Keep a compact ingest entry in the sidepanel header or near the composer.
  - Avoid overloading menus; favor a primary action + small dropdown for variants.


### 4.4 Navigation & Wayfinding from the Panel

**Problems today:**

- Health, Settings, and deeper tools are available but not always discoverable.
- It’s easy to lose track of where actions open (new tab vs current).

**vNext direction:**

- Standardize sidepanel header actions:
  - Health & diagnostics (consistent label and icon).
  - Settings (gear icon, well‑labelled).
  - New chat / clear conversation.
- Make transitions explicit:
  - Microcopy like “Settings open in a new browser tab.”
  - Use consistent animations or toasts when bridging from sidepanel → options.


### 4.5 Advanced Controls (RAG, Models, Dictionaries)

**Problems today:**

- Model selection and RAG controls are not always visible in the sidepanel context.
- It’s unclear how dictionaries/World Books affect the current conversation.

**vNext direction:**

- Provide a small “Chat settings” affordance near the composer:
  - Shows current model and RAG mode.
  - Offers a link to full Settings (Knowledge, Models, Dictionaries) rather than implementing complex pickers inline.
- Light inline hints:
  - When RAG is active for a response, add a subtle “Using your documents” tag with a link to more info.


## 5. Phase 1 – Minimal, High‑Impact Improvements

This first phase should focus on changes that materially improve UX and unblock existing tests, without large architectural churn:

1. **Composer visibility & focus**
   - Ensure the composer is always visible in connected and offline‑local states.
   - Auto‑focus the composer on panel open when appropriate.

2. **Persistence labelling**
   - Make the existing local‑only vs temporary labels more visually prominent and consistent with the main playground.

3. **Error & recovery copy**
   - Tighten sidepanel error messages for connection/auth failures and add clear buttons for Retry and Settings.

4. **Header actions polish**
   - Ensure Health, Settings, and ingest actions have labels/tooltips and visible focus states.

5. **Empty‑state guidance**
   - Add stronger empty‑state copy and example prompts in a fresh chat.


## 6. Phase 2 – Richer Functionality (Exploratory)

The second phase is exploratory and can be scoped later:

1. **Lightweight recent chat/history surface** in the sidepanel.
2. **Richer page‑aware workflows**, like “pin this page to a World Book” from the panel.
3. **Per‑page chat context**, where the panel remembers the last conversation per domain or per tab.
4. **Better multi‑device semantics** for server‑backed chats started from the sidepanel.

These should be treated as candidates, not commitments, until further design/engineering sizing.


## 7. Open Questions

1. How much history should the sidepanel expose before redirecting users to the full options playground?
2. Should sidepanel conversations be tied to the active tab, domain, or user‑selected “workspace”?
3. How aggressively should we surface model/RAG controls in the panel vs delegating them to Settings?
4. What is the right balance between persistent UI elements (toggles, labels) and keeping the sidepanel visually lightweight?

This PRD is a starting point; subsequent revisions should incorporate concrete design explorations, technical constraints, and feedback from real sidepanel usage.

