# PRD: Remove Direct OpenAI SDK Dependency

## Overview

Remove the `openai` npm package from the extension by routing all OpenAI-compatible API calls through tldw_server. This consolidates API communication through a single backend, simplifying authentication, error handling, and provider management.

**Related PRD:** LangChain removal (separate effort) - see [Dependencies](#dependencies) for coordination points.

## Problem Statement

The extension currently uses the `openai` package to directly call OpenAI-compatible APIs for:
- Chat completions
- Embeddings (for web search)
- Text-to-speech

This creates several issues:
1. **Duplicate authentication paths** - API keys managed both in extension storage and passed directly to OpenAI SDK
2. **Inconsistent error handling** - Different error formats from direct SDK calls vs tldw_server
3. **Provider fragmentation** - Some calls go through tldw_server, others bypass it
4. **Bundle size** - The `openai` package adds unnecessary weight when tldw_server already provides these endpoints

## Goals

1. Remove `openai` package from `package.json`
2. Route all LLM API calls through tldw_server
3. Maintain feature parity (chat, embeddings, TTS)
4. Reduce bundle size
5. Simplify provider configuration (single point: tldw_server)

## Non-Goals

- Removing `@langchain/openai` (separate PRD)
- Changing the tldw_server API
- Adding new features

## Current State

### Files Using `openai` Package

| File | Usage | tldw_server Equivalent |
|------|-------|------------------------|
| `src/services/openai-tts.ts` | `openai.audio.speech.create()` | `tldwClient.synthesizeSpeech()` exists |
| `src/models/CustomChatOpenAI.ts` | `openai.chat.completions.create()` | `tldwClient.streamChatCompletion()` exists |
| `src/models/OAIEmbedding.ts` | `openai.embeddings.create()` | Endpoint exists, method needs adding |
| `src/models/utils/openai.ts` | Error wrapping utilities | Can be removed/adapted |

### Files Using `@langchain/openai` (Coordination Required)

| File | Usage | Notes |
|------|-------|-------|
| `src/models/ChatGoogleAI.ts` | Extends `ChatOpenAI` | Blocked by LangChain PRD |

### Existing tldw_server Methods (in TldwApiClient.ts)

```typescript
// Already implemented
synthesizeSpeech(text, voice, model, responseFormat, speed): Promise<ArrayBuffer>
createChatCompletion(messages, model, options): Promise<ChatCompletion>
streamChatCompletion(messages, model, options): AsyncGenerator<string>

// Needs to be added
embedQuery(text, model?): Promise<number[]>
embedDocuments(texts, model?): Promise<number[][]>
```

### ChatTldw Feature Gap Analysis

Current `ChatTldw` is missing features that `CustomChatOpenAI` provides:

| Feature | CustomChatOpenAI | ChatTldw | Required |
|---------|------------------|----------|----------|
| Streaming | ✅ | ✅ | ✅ |
| Temperature/TopP | ✅ | ✅ | ✅ |
| Max tokens | ✅ | ✅ | ✅ |
| `reasoning_effort` | ✅ | ❌ | ✅ Must add |
| Multimodal (images) | ✅ | ❌ | ✅ Must add |
| Token counting | ✅ | ❌ | ⚠️ Nice to have |
| Custom headers | ✅ | ❌ | See note below |

**Note on custom headers:** Currently, custom providers (OpenRouter, etc.) pass headers directly to the OpenAI SDK. After migration, tldw_server must handle provider-specific headers.

## Architectural Decision: Custom Provider Routing

### Current Behavior

```
Custom Model (OpenRouter, Gemini, etc.)
    │
    ▼
pageAssistModel() checks isCustomModel()
    │
    ├─► CustomChatOpenAI ──► Direct API call with provider's baseUrl/apiKey
    │
Non-custom Model
    │
    ▼
ChatTldw ──► tldw_server ──► Provider
```

### Target Behavior (Option A - Recommended)

```
All Models
    │
    ▼
ChatTldw ──► tldw_server ──► Routes to correct provider
```

**Requirements for Option A:**
1. tldw_server must support dynamic provider configuration
2. Provider credentials stored in tldw_server (or passed per-request)
3. tldw_server handles provider-specific headers (e.g., OpenRouter's `HTTP-Referer`)

### Alternative (Option B - Interim)

Keep `openai` package for custom providers only, remove for tldw-native models. This is NOT recommended as it doesn't achieve the goal of removing the package.

**Decision:** Proceed with Option A. If tldw_server changes are needed, document them as blockers.

---

## Implementation Plan

### Prerequisites (Before Any Phase)

#### P0: Update ChatTldw for Feature Parity

**File:** `src/models/ChatTldw.ts`

Add missing capabilities:

```typescript
export interface ChatTldwOptions {
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
  streaming?: boolean
  reasoningEffort?: 'low' | 'medium' | 'high' | null  // ADD
}

// In convertToTldwMessages(), handle images:
if (item.type === 'image_url') {
  // Pass image data to tldw_server
  return { type: 'image_url', image_url: item.image_url }
}
```

**Acceptance Criteria:**
- [ ] `reasoningEffort` parameter supported and passed to tldw_server
- [ ] Image content in messages is preserved and sent to tldw_server
- [ ] tldw_server returns token usage in response (verify existing behavior)

---

### Phase 1: TTS Migration

**Effort:** Low
**Risk:** Low
**Blocked By:** None

#### Changes

1. **`src/services/openai-tts.ts`**
   - Replace OpenAI SDK instantiation with `tldwClient.synthesizeSpeech()`
   - Remove `import OpenAI from "openai"`

   ```typescript
   // Before
   const openai = new OpenAI({ baseURL, apiKey, dangerouslyAllowBrowser: true })
   const mp3 = await openai.audio.speech.create({ model, voice, input: text })

   // After
   import { tldwClient } from "@/services/tldw"
   const audio = await tldwClient.synthesizeSpeech(text, voice, model)
   ```

2. **`src/hooks/useTTS.tsx`** and **`src/hooks/useTtsPlayground.tsx`**
   - No changes needed if service layer handles migration

#### Acceptance Criteria
- [ ] TTS playback works in chat
- [ ] TTS playground generates audio
- [ ] No direct OpenAI SDK calls for audio

---

### Phase 2: Embeddings Migration

**Effort:** Medium
**Risk:** Low
**Blocked By:** LangChain PRD (partially - see note)

> **Note:** Web search engines use `MemoryVectorStore` from LangChain, which requires an `Embeddings` interface. Full removal of `OAIEmbedding` requires the LangChain PRD to address `MemoryVectorStore` replacement. However, we can still route the underlying API calls through tldw_server.

#### Changes

1. **`src/services/tldw/TldwApiClient.ts`**
   - Add embedding methods:

   ```typescript
   async embedQuery(text: string, model?: string): Promise<number[]> {
     const response = await this.request('/api/v1/embeddings', {
       method: 'POST',
       body: { input: text, model }
     })
     return response.data[0].embedding
   }

   async embedDocuments(texts: string[], model?: string): Promise<number[][]> {
     const response = await this.request('/api/v1/embeddings', {
       method: 'POST',
       body: { input: texts, model }
     })
     return response.data.map(d => d.embedding)
   }
   ```

2. **`src/models/OAIEmbedding.ts`**
   - Refactor to use `tldwClient` instead of OpenAI SDK:

   ```typescript
   // Before
   import { OpenAI as OpenAIClient } from "openai"
   this.client = new OpenAIClient(this.clientConfig)
   const res = await this.client.embeddings.create(request)

   // After
   import { tldwClient } from "@/services/tldw"
   const res = await tldwClient.embedQuery(text, this.model)
   ```

   > **Note:** Keep the class interface for LangChain compatibility until LangChain PRD completes.

3. **`src/models/embedding.ts`**
   - Update to use tldw-backed embedding wrapper

#### Acceptance Criteria
- [ ] Web search with embeddings works
- [ ] No direct OpenAI SDK calls for embeddings
- [ ] `OAIEmbedding` uses tldwClient internally

---

### Phase 3: Chat Completions Migration

**Effort:** High
**Risk:** Medium
**Blocked By:** P0 (ChatTldw updates), LangChain PRD (for ChatGoogleAI)

#### Changes

1. **`src/models/index.ts`** - `pageAssistModel()` function
   - Remove `CustomChatOpenAI` instantiation for all providers
   - Route all models through `ChatTldw`

   ```typescript
   // Before
   if (providerInfo.provider === "openrouter") {
     return new CustomChatOpenAI({
       modelName: modelInfo.model_id,
       openAIApiKey: providerInfo.apiKey,
       configuration: {
         baseURL: providerInfo.baseUrl,
         defaultHeaders: { "HTTP-Referer": "..." }
       },
       reasoning_effort: modelConfig?.reasoningEffort
     })
   }

   // After
   // All providers route through tldw_server
   return new ChatTldw({
     model: `${providerInfo.provider}/${modelInfo.model_id}`,
     temperature: modelConfig?.temperature,
     topP: modelConfig?.topP,
     maxTokens: modelConfig?.maxTokens,
     reasoningEffort: modelConfig?.reasoningEffort
   })
   ```

   > **Prerequisite:** tldw_server must support provider routing. The model identifier format (e.g., `openrouter/model-name`) tells tldw_server which provider to use.

2. **`src/models/CustomChatOpenAI.ts`**
   - Delete file after migration (~900 lines)

3. **`src/models/ChatGoogleAI.ts`**
   - **Blocked by LangChain PRD** - This file extends `ChatOpenAI` from `@langchain/openai`
   - Options:
     a. Route Gemini through tldw_server (requires tldw_server Gemini support)
     b. Keep until LangChain PRD addresses it

4. **`src/models/utils/openai.ts`**
   - Delete file (error wrapping utilities no longer needed)

5. **`src/models/CustomAIMessageChunk.ts`**
   - Delete if only used by CustomChatOpenAI

#### Acceptance Criteria
- [ ] Chat works with tldw-native models
- [ ] Chat works with OpenRouter models
- [ ] Chat works with custom OpenAI-compatible providers
- [ ] Streaming works for all providers
- [ ] Reasoning models (o1, DeepSeek-R1) work with `reasoning_effort`
- [ ] Vision/multimodal models work with image inputs
- [ ] No direct OpenAI SDK calls for chat
- [ ] `CustomChatOpenAI.ts` deleted
- [ ] `utils/openai.ts` deleted

---

## Migration Order

```
P0: ChatTldw Updates
    │
    ▼
Phase 1 (TTS) ──► Phase 2 (Embeddings) ──► Phase 3 (Chat)
     │                    │                      │
     │                    │                      ▼
     │                    │              Delete CustomChatOpenAI.ts
     │                    │              Delete utils/openai.ts
     │                    │              Delete CustomAIMessageChunk.ts
     │                    ▼
     │              Refactor OAIEmbedding.ts
     ▼                    │
Update openai-tts.ts      │
                          ▼
                    [LangChain PRD]
                          │
                          ▼
                    Delete OAIEmbedding.ts
                    Delete ChatGoogleAI.ts
```

After all phases complete:
```bash
bun remove openai
```

---

## Dependencies

### Blocked By
- **tldw_server provider routing** - Server must support routing requests to external providers (OpenRouter, Gemini, etc.) with proper header handling

### Blocks
- Final bundle size optimization

### Coordinates With: LangChain PRD

| This PRD | LangChain PRD | Coordination |
|----------|---------------|--------------|
| Phase 2: Embeddings | `MemoryVectorStore` removal | OAIEmbedding deletion blocked until MemoryVectorStore replaced |
| Phase 3: Chat | `BaseChatModel` interface | ChatTldw may need to implement interface if LangChain partially retained |
| Phase 3: ChatGoogleAI | `ChatOpenAI` base class | ChatGoogleAI deletion blocked until LangChain PRD addresses it |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature regression in chat | Medium | High | Test all provider types before migration |
| Reasoning models break | High | High | P0 adds `reasoning_effort` to ChatTldw |
| Vision/multimodal breaks | High | High | P0 adds image handling to ChatTldw |
| Streaming behavior differs | Low | Medium | Verify chunk format matches current |
| tldw_server missing provider support | Medium | High | Verify server capabilities before Phase 3 |
| Custom provider headers lost | Medium | Medium | Document required tldw_server changes |

---

## Testing Plan

### Unit Tests
- TldwApiClient embedding methods
- ChatTldw streaming with reasoning_effort
- ChatTldw multimodal message handling

### E2E Tests
- `chatStreaming.spec.ts` - verify streaming still works
- Add TTS test if not exists
- Web search with embedding test
- Add test for reasoning model (o1 or DeepSeek-R1)
- Add test for vision model with image input

### Manual Testing Checklist
- [ ] tldw-native model chat
- [ ] OpenRouter model chat
- [ ] Gemini model chat
- [ ] Custom OpenAI-compatible provider
- [ ] Reasoning model with effort setting
- [ ] Vision model with image upload
- [ ] TTS in chat
- [ ] TTS playground
- [ ] Web search "deep" mode (uses embeddings)

---

## Success Metrics

1. `openai` package removed from `package.json`
2. Bundle size reduced by ~200KB (estimated)
3. All existing E2E tests pass
4. No regression in chat/TTS/search functionality
5. Reasoning and vision models work correctly

---

## Timeline

| Phase | Estimated Effort | Dependencies |
|-------|------------------|--------------|
| P0: ChatTldw updates | 2-4 hours | None |
| Phase 1: TTS | 1-2 hours | None |
| Phase 2: Embeddings | 2-4 hours | Partial LangChain PRD |
| Phase 3: Chat | 4-8 hours | P0, tldw_server provider routing |
| Testing & Polish | 2-4 hours | All phases |

**Total:** 11-22 hours

---

## Appendix: Files to Modify

| File | Action | Phase |
|------|--------|-------|
| `src/models/ChatTldw.ts` | Add reasoning_effort, image support | P0 |
| `src/services/openai-tts.ts` | Replace with tldwClient | Phase 1 |
| `src/services/tldw/TldwApiClient.ts` | Add embedding methods | Phase 2 |
| `src/models/OAIEmbedding.ts` | Refactor to use tldwClient | Phase 2 |
| `src/models/embedding.ts` | Update to use tldw embeddings | Phase 2 |
| `src/models/index.ts` | Remove CustomChatOpenAI usage | Phase 3 |

## Appendix: Files to Delete

| File | Lines | Phase | Blocked By |
|------|-------|-------|------------|
| `src/models/CustomChatOpenAI.ts` | ~900 | Phase 3 | - |
| `src/models/utils/openai.ts` | ~50 | Phase 3 | - |
| `src/models/CustomAIMessageChunk.ts` | ~30 | Phase 3 | Verify not used elsewhere |
| `src/models/OAIEmbedding.ts` | ~170 | Post-LangChain | LangChain PRD |
| `src/models/ChatGoogleAI.ts` | ~12 | Post-LangChain | LangChain PRD |
| `src/models/types.ts` | ~20 | Phase 3 | Verify only contains LegacyOpenAIInput |

## Appendix: Package.json Change

```diff
  "dependencies": {
-   "openai": "^4.95.1",
    // ... other deps
  }
```

## Appendix: tldw_server Requirements

For Phase 3 to complete, tldw_server must support:

1. **Provider routing** - Accept model IDs like `openrouter/gpt-4` and route to correct provider
2. **Provider credentials** - Either:
   - Store provider API keys in server config, OR
   - Accept credentials per-request
3. **Provider-specific headers** - Handle headers like:
   - OpenRouter: `HTTP-Referer`, `X-Title`
   - Custom providers: User-defined headers
4. **Reasoning effort** - Pass through `reasoning_effort` parameter to supporting models
5. **Multimodal** - Handle image content in messages

If any of these are missing, document as blockers before starting Phase 3.
