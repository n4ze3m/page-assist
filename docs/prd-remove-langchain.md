# PRD: Remove LangChain Dependency

## Overview

Goal: fully decouple the tldw Assistant browser extension from LangChain.

As of the current codebase state, the extension already uses custom, lightweight
types and delegates RAG/text-processing logic to `tldw_server`. LangChain now
only appears as unused npm dependencies and in a few pieces of configuration
and documentation. This document captures the current state and the remaining
cleanup work needed to finish the deprecation.

---

## Current State (tldw-assistant repo)

- There are **no runtime imports** of `langchain`, `@langchain/core`,
  `@langchain/community`, or `@langchain/openai` anywhere under `src/`.
- Custom types and helpers have replaced LangChain primitives:
  - `src/types/document.ts` defines a local `Document` type and helper for
    representing parsed content.
  - `src/types/messages.ts` defines `BaseMessage`, `SystemMessage`,
    `HumanMessage`, `AIMessage`, `FunctionMessage`, `ToolMessage`, and
    `AIMessageChunk`. These preserve the previous `_getType()` behavior and
    `instanceof` checks that upstream code expects, without depending on
    LangChain classes.
  - `src/utils/format-docs.ts` implements the `formatDocs` helper used by RAG
    modes to format documents for prompting. This logic was previously coupled
    to LangChain chain files in another codebase.
  - `src/models/ChatTldw.ts` is a custom chat model that talks directly to
    `tldw_server` using the message types above. It no longer extends any
    LangChain base class.
- Chain, loader, vector store, and embedding classes mentioned in older plans
  (for example: `src/chain/chat-with-x.ts`, `src/chain/chat-with-website.ts`,
  `src/models/CustomChatOpenAI.ts`, `src/models/OAIEmbedding.ts`,
  `src/web/search-engines/*`) **do not exist in this repo**. Those belonged to
  a different extension codebase and are out of scope here.
- RAG configuration in the UI (splitting strategy, chunk size, overlap, etc.):
  - `src/components/Option/Settings/rag.tsx` exposes options such as
    `"RecursiveCharacterTextSplitter"` and `"CharacterTextSplitter"`.
  - These values are treated as configuration sent to `tldw_server`. The
    frontend does **not** implement its own text splitter or vector store; that
    logic lives server-side.

Summary: the browser extension’s runtime logic is already decoupled from
LangChain. Remaining work is about dependency/config cleanup and tightening up
documentation so it matches this architecture.

---

## Remaining LangChain Footprint

Even though the code no longer imports LangChain, a few references remain:

- `package.json`
  - `dependencies` still include:
    - `langchain`
    - `@langchain/community`
    - `@langchain/openai`
  - `resolutions` still defines a pinned version for:
    - `@langchain/core`
- `wxt.config.ts`
  - `rollupOptions.external` includes:
    - `"langchain"`
    - `"@langchain/community"`
  - These externals currently have no effect because nothing imports them.
- Configuration and docs
  - This PRD previously described rewriting a number of LangChain-based classes
    that do not exist in this repo.
  - UI and service code still use LangChain-style names such as
    `"RecursiveCharacterTextSplitter"` purely as string identifiers passed to
    `tldw_server`. They no longer correspond to frontend classes.

---

## Scope

In this repository, “removing LangChain” means:

- No runtime references to LangChain types, helpers, or base classes in the
  browser extension.
- No LangChain packages in `dependencies`, `devDependencies`, or
  `resolutions` in `package.json`.
- No bundler configuration that assumes LangChain is present (for example,
  `rollupOptions.external` entries that only exist to keep LangChain out of the
  bundle).
- Updated docs/UX so that any remaining LangChain terminology is clearly
  documented as **server-side behavior** (implemented in `tldw_server`) rather
  than a frontend implementation detail.

Out of scope for this PRD:

- Changes to `tldw_server` itself (RAG implementation, text-splitting
  strategies, embedding providers, indexing, etc.).
- Reintroducing client-side vector stores or text splitters in the extension.

---

## Current Risk Assessment

Because the extension no longer imports LangChain at runtime, the remaining
work is mostly dependency and configuration cleanup.

### Risks

- **Hidden import risk (Low)**
  - Removing LangChain packages could surface a hidden import if any exists.
  - Mitigation: run `bun run compile` and at least one build target
    (`bun run build:chrome`) after dependency removal.
- **Build configuration risk (Low)**
  - Changing `rollupOptions.external` could break builds if the entries are
    still needed (they are not, today).
  - Mitigation: rebuild for all targets (Chrome, Firefox, Edge) after
    adjusting the externals.
- **Behavioral risk (Already realized)**
  - Behavioral changes from removing LangChain base classes have already
    happened via the `ChatTldw`, `Document`, and `Message` migrations. Those
    changes should be validated via normal manual/E2E testing, but they are not
    part of the remaining cleanup.

Overall, the residual work is **low risk** and mainly concerns keeping
dependencies and documentation accurate.

---

## Implementation Summary vs. Original Plan

An earlier PRD (for a different, LangChain-heavy extension) proposed six phases:

1. Replace LangChain `Document` and loader classes.
2. Re-implement text splitters (`RecursiveCharacterTextSplitter`, etc.).
3. Rewrite vector store and embedding classes (`MemoryVectorStore`,
   `OAIEmbedding`) used for web search.
4. Replace LangChain message classes with custom implementations while
   preserving `_getType()` and `instanceof` behavior.
5. Rewrite several LangChain-based chat models (`CustomChatOpenAI`,
   `ChatChromeAi`, etc.) to call OpenAI-style APIs directly.
6. Delete chain files (`chat-with-x.ts`, `chat-with-website.ts`) and remove all
   LangChain dependencies from `package.json` and bundler config.

For this `tldw-assistant` repo:

- Many of the modules mentioned above **never existed** here:
  - There is no `src/chain` directory.
  - There is no `src/web/search-engines` directory.
  - There are no `CustomChatOpenAI.ts`, `ChatChromeAi.ts`, or `OAIEmbedding.ts`
    files.
  - Vector store and web search concerns have been pushed into `tldw_server`.
- The parts of that plan that **are relevant** have already been implemented
  in a simpler way:
  - Document types: replaced by `src/types/document.ts`.
  - Message types: replaced by `src/types/messages.ts`.
  - Chain utilities: `formatDocs` extracted into `src/utils/format-docs.ts`.
  - Chat models: `src/models/ChatTldw.ts` talks directly to `tldw_server`
    without any LangChain base classes.

As a result, the remaining work for this repo is much smaller than the original
six-phase proposal and is focused on cleanup rather than core behavior changes.

---

## Remaining Tasks

These are the concrete tasks needed to fully complete “LangChain removal” for
this repository.

### 1. Remove unused LangChain dependencies

- [ ] Delete `langchain`, `@langchain/community`, and `@langchain/openai` from
      `dependencies` in `package.json`.
- [ ] Remove the `resolutions` entry for `@langchain/core` from `package.json`.
- [ ] Run `bun install` to refresh the lockfile and `node_modules`.
- [ ] Run `bun run compile` to ensure there are no missing imports.
- [ ] Run `bun run build:chrome` (and optionally `build:firefox`, `build:edge`)
      to verify builds still succeed without LangChain.

### 2. Clean up bundler configuration

- [ ] In `wxt.config.ts`, remove `"langchain"` and `"@langchain/community"`
      from `rollupOptions.external`.
- [ ] Rebuild all targets and confirm there is no change in behavior or
      bundle output other than the absence of those externals.

### 3. Doc and UX alignment

- [ ] Audit the UI and docs for remaining LangChain-specific implementation
      language that no longer applies to this repo (for example, references to
      `CustomChatOpenAI` or client-side vector stores).
- [ ] Where LangChain terminology is still used as a **configuration value**
      (for example, `"RecursiveCharacterTextSplitter"` in
      `src/components/Option/Settings/rag.tsx`), ensure it is documented as:
      - A server-side strategy name understood by `tldw_server`.
      - Not a local class or dependency.
- [ ] Update any developer-facing docs that still describe rewriting large
      LangChain-based model classes that don’t exist in this codebase, or
      explicitly label those sections as legacy context.

### 4. Validation

- [ ] `bun run compile`
- [ ] `bun run build:chrome`
- [ ] `bun run build:firefox`
- [ ] `bun run build:edge`
- [ ] `bun run test:e2e` (or at minimum, manual smoke tests of:
      - Chat flows using `tldw_server`.
      - RAG/document chat flows.
      - Web search flows, if configured against `tldw_server`.
      - Options/Settings pages related to RAG configuration.)

---

## Acceptance Criteria

The LangChain removal work is considered complete when all of the following are
true:

- [ ] `rg "@langchain|langchain" src` only returns references inside comments
      or string literals that are explicitly documented as server-side strategy
      names.
- [ ] `package.json` contains no LangChain packages and no `@langchain/core`
      resolution overrides.
- [ ] `wxt.config.ts` has no LangChain entries in `rollupOptions.external`.
- [ ] All builds (`bun run compile`, `bun run build:chrome`, `bun run build:firefox`,
      `bun run build:edge`) succeed.
- [ ] Chat and RAG features work end-to-end via `tldw_server` across supported
      browsers (Chrome/Firefox/Edge).

---

## Notes for Future Maintainers

- If the extension ever reintroduces client-side embeddings, text splitting, or
  vector search, prefer small, purpose-built utilities (similar in spirit to
  `src/types/messages.ts`, `src/types/document.ts`, and `src/utils/format-docs.ts`)
  instead of pulling in a large orchestration framework.
- Keep the responsibility boundary clear:
  - The browser extension should focus on UX, local storage, and lightweight
    orchestration.
  - Heavy lifting (RAG pipelines, embeddings, indexing, long-running
    processing) should remain in `tldw_server` or other backend services.

