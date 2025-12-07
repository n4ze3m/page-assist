# PRD: Remove OpenAI JS SDK

## Overview

The tldw Assistant browser extension should not ship the official `openai` JavaScript SDK. All OpenAI‑compatible traffic should flow through tldw_server via the existing `tldwClient` APIs.

This PRD defines the work required to:

- Remove the `openai` package from `package.json`.
- Remove or replace all code that imports from `openai`.
- Preserve chat and TTS functionality through tldw_server.

LangChain removal is covered by a separate PRD. This document only coordinates with it where strictly necessary.

## Scope

**In scope**

- Removing the `openai` dependency from the extension bundle.
- Deleting or refactoring extension code that uses the `openai` SDK.
- Using existing tldw_server chat and TTS endpoints for all LLM calls.

**Out of scope**

- Rewriting or removing LangChain packages (`langchain`, `@langchain/core`, `@langchain/community`, `@langchain/openai`) beyond what is required to drop the `openai` SDK.
- Changing tldw_server APIs; this PRD only depends on capabilities implemented and owned by the server team.
- Adding new user‑visible features.

## Current State

### RAG / Embeddings

Local RAG and embedding logic has already been removed. These files no longer exist:

- `src/models/OAIEmbedding.ts`
- `src/models/embedding.ts`
- `src/web/search-engines/*`
- `src/web/website/*`
- `src/loader/*`
- `src/utils/text-splitter.ts`

All RAG‑like behavior now goes through tldw_server RAG endpoints.

### OpenAI SDK Usage

The `openai` package is currently installed in `package.json`:

- `openai`: `^4.95.1` (`dependencies`)

The remaining imports from `openai` in the extension source are:

- `src/models/CustomChatOpenAI.ts`
  - Uses `OpenAI` from `openai` as the chat client, in combination with LangChain’s `BaseChatModel` and `@langchain/openai` types.
  - Powers custom OpenAI‑compatible providers (OpenRouter, generic OpenAI‑compatible configs) via `pageAssistModel`.

- `src/models/utils/openai.ts`
  - Wraps `openai` error types and defines `OpenAIToolChoice` helpers.
  - Only used by `CustomChatOpenAI`.

Supporting types used only by the OpenAI‑backed chat model:

- `src/models/CustomAIMessageChunk.ts`
  - Custom message chunk type carrying `reasoning_content` and other metadata.
  - Only used by `CustomChatOpenAI`.

- `src/models/types.ts`
  - `OpenAICoreRequestOptions` and `LegacyOpenAIInput`, used by `CustomChatOpenAI` as helper types.

### Chat Models

- **Non‑custom models**
  - `src/models/ChatTldw.ts` wraps `tldwChat` and sends chat completions to tldw_server using `TldwApiClient.createChatCompletion` / `streamChatCompletion`.
  - `pageAssistModel` uses `ChatTldw` for built‑in tldw_server models.

- **Custom OpenAI‑compatible models**
  - `src/models/CustomChatOpenAI.ts` uses the `openai` SDK and LangChain to call provider APIs directly from the extension.
  - `pageAssistModel` instantiates `CustomChatOpenAI` for OpenRouter and other user‑configured providers and passes provider‑specific headers and base URLs directly into the SDK.

- **Gemini**
  - `src/models/ChatGoogleAI.ts` extends `ChatOpenAI` from `@langchain/openai`.
  - This file does not import `openai` directly, but is relevant for LangChain cleanup.

### Text‑to‑Speech (TTS)

- `src/services/openai-tts.ts` implements the “OpenAI TTS” provider, but is already wired to tldw_server:
  - Calls `tldwClient.synthesizeSpeech(text, { model, voice })`.
  - Does not import `openai`.

- TTS hooks (`src/hooks/useTTS.tsx`, `src/hooks/useTtsPlayground.tsx`) call:
  - `generateOpenAITTS` for the “OpenAI” TTS provider, which internally delegates to `tldwClient.synthesizeSpeech`.
  - `tldwClient.synthesizeSpeech` directly for the “tldw” TTS provider.

Net: TTS no longer uses the OpenAI SDK; only chat still depends on it.

## Goals

1. Remove the `openai` package from `package.json`.
2. Eliminate all imports from `openai` in the extension source.
3. Route all chat and TTS calls through tldw_server (`tldwClient`), including custom providers.
4. Maintain behavioral parity for:
   - Streaming chat
   - Custom OpenAI‑compatible providers (OpenRouter, user‑defined)
   - Reasoning‑style models where feasible
   - TTS playback and playground flows
5. Keep LangChain removal logically separate and avoid adding new LangChain dependencies.

## Non‑Goals

- Re‑architecting the chat pipeline beyond what is necessary to remove the `openai` SDK.
- Changing tldw_server contracts; where extra server behavior is needed (provider routing, headers, reasoning, multimodal), we treat it as a dependency on the server, not something this PRD specifies in detail.
- Implementing precise token accounting on the client; rough estimates are acceptable if needed.

## High‑Level Design

### Direction

All models — built‑in and custom — should be served via tldw_server. The extension becomes a thin client that:

- Chooses a model ID and options (temperature, max tokens, etc.).
- Sends chat requests through `tldwChat` / `TldwApiClient`.
- Receives streamed or non‑streamed responses and adapts them to the UI.

Custom providers (OpenRouter, generic OpenAI‑compatible endpoints) become configuration in tldw_server rather than being called directly from the extension.

### Key Changes

1. **ChatTldw as the single chat implementation**

   Extend `ChatTldw` so it can carry the options we need to replace `CustomChatOpenAI`:

   ```ts
   export interface ChatTldwOptions {
     model: string
     temperature?: number
     maxTokens?: number
     topP?: number
     frequencyPenalty?: number
     presencePenalty?: number
     systemPrompt?: string
     streaming?: boolean
     reasoningEffort?: "low" | "medium" | "high"
   }
   ```

   - When present, `reasoningEffort` is passed through the `ChatCompletionRequest` and forwarded by tldw_server to providers that support it.
   - For multimodal models, `ChatTldw.convertToTldwMessages` should preserve image content in a form tldw_server accepts instead of flattening to plain text. The exact wire format is owned by the server; on the client we ensure we do not silently drop images.

2. **Custom models routed through tldw_server**

   - `pageAssistModel` stops instantiating `CustomChatOpenAI` and, instead, always returns a `ChatTldw` instance for OpenAI‑compatible providers.
   - The model identifier encodes the provider and model ID in whatever format tldw_server expects (for example, `openrouter/<model_id>` or a plain server model ID if the server already exposes them).
   - Provider‑specific headers and API keys are moved to tldw_server configuration. The extension no longer sends them directly to provider APIs via the OpenAI SDK.

3. **TTS stays as‑is, with minor cleanup**

   - Keep using `tldwClient.synthesizeSpeech` from `openai-tts.ts` and TTS hooks.
   - Optionally, rename “OpenAI” TTS configuration fields to make clear they are “server‑backed OpenAI‑compatible TTS” if/when the UI copy is updated. This is cosmetic and not required to remove the SDK.

## Implementation Plan

### Phase 0 – Prep and API Alignment

**Objective:** Align `ChatTldw` / `TldwApiClient` with the server features needed to replace `CustomChatOpenAI`.

1. **Update `ChatTldw` options and request payload**

   - File: `src/models/ChatTldw.ts`
   - Tasks:
     - Add optional `reasoningEffort` to `ChatTldwOptions` and store it on the instance.
     - When calling `tldwChat.sendMessage` / `tldwChat.streamMessage`, include `reasoningEffort` in the options.
   - Acceptance:
     - `ChatTldw` compiles and existing non‑reasoning models behave unchanged.
     - New option is ignored by models / server that do not support it.

2. **Preserve multimodal content**

   - File: `src/models/ChatTldw.ts`
   - Tasks:
     - Update `convertToTldwMessages` so that array content items are not reduced to text only. At minimum, treat `{ type: "image_url", image_url: ... }` as structured content and pass it through to tldw_server rather than discarding it.
   - Acceptance:
     - Vision / multimodal models still receive their image data via tldw_server.

### Phase 1 – Route Custom Providers Through ChatTldw

**Objective:** Replace `CustomChatOpenAI` usage with `ChatTldw` so that all chat goes through tldw_server.

1. **Refactor `pageAssistModel`**

   - File: `src/models/index.ts`
   - Tasks:
     - For custom providers (OpenRouter and other OpenAI‑compatible configs), stop returning `CustomChatOpenAI`.
     - Build an appropriate `model` string and options object and return `new ChatTldw({ ... })` instead.
     - Preserve temperature/topP/maxTokens and reasoning settings when available.
   - Acceptance:
     - Chat continues to work for:
       - Built‑in tldw_server models.
       - OpenRouter models.
       - Other user‑configured OpenAI‑compatible providers supported by tldw_server.
     - Streaming behavior remains intact for all these models.

2. **Keep `ChatGoogleAI` as a LangChain concern**

   - File: `src/models/ChatGoogleAI.ts`
   - Tasks:
     - No functional change in this PRD.
     - Document that `ChatGoogleAI` is a LangChain‑specific implementation owned by the LangChain cleanup PRD.

### Phase 2 – Remove OpenAI SDK and Supporting Types

**Objective:** Delete all remaining `openai` imports and remove the package.

1. **Delete OpenAI‑specific model and helpers**

   - Files:
     - `src/models/CustomChatOpenAI.ts`
     - `src/models/utils/openai.ts`
     - `src/models/CustomAIMessageChunk.ts`
     - `src/models/types.ts` (only if it is no longer referenced elsewhere)
   - Preconditions:
     - `pageAssistModel` no longer references `CustomChatOpenAI` or its helper types.
   - Acceptance:
     - Project builds and extension runs without these files.
     - `rg "openai\""` in `src/` returns no application code imports.

2. **Remove the `openai` dependency**

   - File: `package.json`
   - Tasks:
     - Remove `"openai": "^4.95.1"` from `dependencies`.
   - Acceptance:
     - `bun install` / `npm install` completes without pulling `openai` into the bundle.
     - Bundle size decreases thanks to removal of the SDK and `CustomChatOpenAI.ts`.

## Dependencies

- **tldw_server capabilities**
  - Provider routing for external OpenAI‑compatible providers (OpenRouter, etc.).
  - Ability to attach provider‑specific headers and credentials on the server side.
  - Optional: support for `reasoning_effort` and multimodal message formats for models that understand them.

- **LangChain removal PRD**
  - Owns:
    - Removal or rewrite of `ChatGoogleAI` (`@langchain/openai`).
    - Removal of LangChain packages from `package.json`.
  - Coordination:
    - Once `CustomChatOpenAI` is deleted here, a significant portion of LangChain usage disappears automatically.
    - `ChatTldw` does not need to extend LangChain base types.

## Testing

At minimum:

- **Regression tests (manual or E2E)**
  - Chat with a tldw_server native model.
  - Chat with an OpenRouter model.
  - Chat with a user‑configured OpenAI‑compatible provider.
  - Streaming chat across all of the above.
  - TTS in chat and TTS playground for:
    - tldw_server TTS provider.
    - “OpenAI” TTS provider (now just a tldw_server call).

- **Targeted checks**
  - Reasoning‑style models (e.g., o‑series, DeepSeek‑like) continue to work when configured server‑side.
  - Vision / multimodal models receive image inputs correctly via tldw_server.

## Success Criteria

1. No code in `src/` imports from `"openai"`.
2. `openai` is removed from `package.json` dependencies.
3. Chat and TTS functionality are unchanged from a user perspective for supported models and providers.
4. Custom provider traffic (OpenRouter, generic OpenAI‑compatible) flows through tldw_server, not directly from the extension.
5. This PRD reduces, rather than increases, LangChain and provider‑specific complexity in the extension.
