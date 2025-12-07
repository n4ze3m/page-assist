# PRD: Remove LangChain Dependency

## Overview

Remove all LangChain packages (`langchain`, `@langchain/core`, `@langchain/community`, `@langchain/openai`) from the tldw Assistant browser extension and replace with lightweight, purpose-built alternatives.

## Motivation

1. **Bundle Size**: LangChain adds significant bundle weight for functionality we use minimally
2. **Complexity**: We only use a small subset of LangChain's features
3. **Maintenance**: Pinned version (`@langchain/core": "0.1.45"`) suggests compatibility issues
4. **Simplicity**: Custom types and simple implementations are easier to maintain

---

## Current LangChain Usage Analysis

### Category 1: Message Types (High Usage)
Used throughout the codebase as a standardized message format.

| File | Imports |
|------|---------|
| `src/utils/actor.ts` | `AIMessage`, `HumanMessage`, `SystemMessage`, `BaseMessage` |
| `src/utils/system-message.ts` | `SystemMessage` |
| `src/utils/human-message.tsx` | `HumanMessage`, `MessageContent` |
| `src/services/title.ts` | `HumanMessage` |
| `src/models/ChatTldw.ts` | `BaseMessage`, `AIMessage`, `HumanMessage`, `SystemMessage` |
| `src/models/ChatChromeAi.ts` | `BaseMessage`, `AIMessageChunk` |
| `src/models/CustomChatOpenAI.ts` | `AIMessage`, `BaseMessage`, `ChatMessage`, various chunk types |

### Category 2: Document Types (Medium Usage)
Simple data structure for representing parsed content.

| File | Imports |
|------|---------|
| `src/loader/html.ts` | `Document`, `BaseDocumentLoader` |
| `src/loader/pdf.ts` | `Document`, `BaseDocumentLoader` |
| `src/loader/pdf-url.ts` | `Document`, `BaseDocumentLoader` |
| `src/loader/csv.ts` | `Document`, `BaseDocumentLoader` |
| `src/utils/rerank.ts` | `Document` |
| `src/web/search-engines/*.ts` (13 files) | `Document` |
| `src/web/website/index.ts` | `Document` |

### Category 3: Vector Store (Medium Usage)
In-memory vector store for semantic search on web results.

| File | Imports |
|------|---------|
| `src/web/search-engines/google.ts` | `MemoryVectorStore` |
| `src/web/search-engines/bing.ts` | `MemoryVectorStore` |
| `src/web/search-engines/brave.ts` | `MemoryVectorStore` |
| `src/web/search-engines/brave-api.ts` | `MemoryVectorStore` |
| `src/web/search-engines/duckduckgo.ts` | `MemoryVectorStore` |
| `src/web/search-engines/searxng.ts` | `MemoryVectorStore` |
| `src/web/search-engines/sogou.ts` | `MemoryVectorStore` |
| `src/web/search-engines/startpage.ts` | `MemoryVectorStore` |
| `src/web/search-engines/stract.ts` | `MemoryVectorStore` |
| `src/web/search-engines/tavily-api.ts` | `MemoryVectorStore` |
| `src/web/search-engines/exa.ts` | `MemoryVectorStore` |
| `src/web/search-engines/firecrawl.ts` | `MemoryVectorStore` |
| `src/web/website/index.ts` | `MemoryVectorStore` |

### Category 4: Text Splitter (Low Usage)

| File | Imports |
|------|---------|
| `src/utils/text-splitter.ts` | `RecursiveCharacterTextSplitter`, `CharacterTextSplitter` |

### Category 5: LLM Base Classes (High Complexity - CRITICAL)
Used to create custom chat model wrappers that extend LangChain base classes.

| File | Imports |
|------|---------|
| `src/models/ChatChromeAi.ts` | `SimpleChatModel`, `BaseChatModelParams`, `CallbackManagerForLLMRun`, `ChatGenerationChunk`, `IterableReadableStream` |
| `src/models/CustomChatOpenAI.ts` | `BaseChatModel`, `BaseChatModelParams`, various parsers, runnables, callbacks, `@langchain/openai` types |
| `src/models/utils/ollama.ts` | `IterableReadableStream`, `StringWithAutocomplete`, `BaseLanguageModelCallOptions` |

### Category 6: Embeddings (Medium Complexity)

| File | Imports |
|------|---------|
| `src/models/OAIEmbedding.ts` | `Embeddings`, `EmbeddingsParams` (extends base class), `chunkArray` |
| `src/utils/rerank.ts` | `EmbeddingsInterface` |

### Category 7: Chain/Runnable System (ACTIVELY USED)
**NOTE: These files ARE used despite being marked `@ts-nocheck`**

| File | Used By | Imports |
|------|---------|---------|
| `src/chain/chat-with-x.ts` | `src/hooks/useMessage.tsx`, `src/hooks/chat-modes/ragMode.ts`, `src/hooks/chat-modes/documentChatMode.ts` | Full chain system |
| `src/chain/chat-with-website.ts` | Documented feature | Full chain system |

---

## Critical Issues with Original PRD

### Issue 1: Chain Files Are NOT Unused

The original PRD incorrectly stated that `src/chain/chat-with-website.ts` and `src/chain/chat-with-x.ts` are "potentially unused legacy code."

**Reality:** These files are actively used:
- `formatDocs()` from `chat-with-x.ts` is imported by:
  - `src/hooks/useMessage.tsx`
  - `src/hooks/chat-modes/ragMode.ts`
  - `src/hooks/chat-modes/documentChatMode.ts`
- The "Chat with Website" feature is documented and referenced in `/docs/features/Sidebar-Features.md`

**Good news:** Only `formatDocs()` is imported - the chain creator functions (`createChatWithXChain`, `createChatWithWebsiteChain`) are NOT used elsewhere.

**Impact:**
- Extract `formatDocs()` to a standalone utility (trivial - it's just a simple function)
- The rest of the chain files can be deleted

### Issue 2: CustomChatOpenAI is Heavily LangChain-Coupled (927 lines)

`src/models/CustomChatOpenAI.ts` is a **927-line file** that:
- Extends `BaseChatModel` from LangChain
- Uses 15+ LangChain imports including:
  - Message chunk types (`HumanMessageChunk`, `SystemMessageChunk`, `FunctionMessageChunk`, `ToolMessageChunk`)
  - Output types (`ChatGenerationChunk`, `ChatResult`)
  - Callback system (`CallbackManagerForLLMRun`)
  - Tool conversion (`convertToOpenAITool`)
  - Runnables (`RunnablePassthrough`, `RunnableSequence`)
  - Parsers (`JsonOutputParser`, `StructuredOutputParser`, `JsonOutputKeyToolsParser`)
  - Types from `@langchain/openai` (`ChatOpenAICallOptions`, `getEndpoint`, `OpenAIChatInput`)
- Implements complex LangChain lifecycle methods (`_generate`, `_streamResponseChunks`, `withStructuredOutput`)
- Has token counting logic tied to LangChain's `getNumTokens`

**Impact:** This is not a simple "swap imports" task. This is a **full rewrite** of an 927-line OpenAI client wrapper.

### Issue 3: Message Types Have Methods, Not Just Data

LangChain messages are classes with methods, not plain objects:
- `message._getType()` is used throughout to determine message role
- `instanceof SystemMessage` checks are used in `src/utils/actor.ts`
- `BaseMessage` is a class with specific behavior

**Impact:** Simple type aliases won't work. Need either:
1. Create class implementations that mimic LangChain behavior
2. Refactor all code that uses `_getType()` and `instanceof` checks

### Issue 4: Embedding Classes Extend LangChain

`src/models/OAIEmbedding.ts` **extends** `Embeddings` from LangChain:
```typescript
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings"
import { chunkArray } from "@langchain/core/utils/chunk_array"

export class OAIEmbedding extends Embeddings {
  // ...uses this.caller.call() from base class
}
```

This is used by `pageAssistEmbeddingModel()` which is called by all 13 search engine files.

**Impact:**
- Must rewrite `OAIEmbedding` without extending `Embeddings`
- The `this.caller` pattern from LangChain provides retry/concurrency logic
- Custom vector store must accept the new embedding interface

### Issue 5: Underestimated Scope

| Original Estimate | Actual Scope |
|-------------------|--------------|
| "Rewrite `CustomChatOpenAI.ts`" | 927-line full rewrite with complex OpenAI streaming, token counting, structured output |
| "Delete chain files" | Actively used - need to extract or rewrite |
| "Simple type aliases" | Need class implementations with methods |
| ~35 files | 35+ files but several are complex rewrites, not simple import swaps |

---

## Revised Risk Assessment

| Risk | Severity | Notes |
|------|----------|-------|
| Breaking OpenAI/custom provider chat | **HIGH** | `CustomChatOpenAI` is complex and heavily used |
| Breaking RAG/document chat modes | **HIGH** | Chain files are actively used |
| Breaking Chrome AI | **MEDIUM** | `ChatChromeAI` is simpler (160 lines) |
| Breaking web search | **MEDIUM** | Vector store + embeddings coupling |
| Breaking message handling | **MEDIUM** | Need to preserve `_getType()` behavior |
| Type errors cascade | **MEDIUM** | Many files depend on LangChain types |

---

## Revised Recommendation

## Selected Approach: Option A - Phased Removal

Remove LangChain in 6 phases, validating after each phase to catch regressions early.

---

## Phase 1: Document Types & Loaders (Low Risk)

**Goal:** Replace `Document` type and `BaseDocumentLoader` with custom implementations.

### Files to Modify

| File | Change |
|------|--------|
| `src/types/document.ts` | **CREATE** - Custom Document type |
| `src/loader/html.ts` | Remove `BaseDocumentLoader` extension |
| `src/loader/pdf.ts` | Remove `BaseDocumentLoader` extension |
| `src/loader/pdf-url.ts` | Remove `BaseDocumentLoader` extension |
| `src/loader/csv.ts` | Remove `BaseDocumentLoader` extension |

### Implementation

```typescript
// src/types/document.ts
export interface DocumentMetadata {
  url?: string
  source?: string
  [key: string]: any
}

export interface Document {
  pageContent: string
  metadata: DocumentMetadata
}
```

```typescript
// src/loader/html.ts - BEFORE
import { BaseDocumentLoader } from "langchain/document_loaders/base"
import { Document } from "@langchain/core/documents"

export class PageAssistHtmlLoader extends BaseDocumentLoader {
  // ...
}

// src/loader/html.ts - AFTER
import type { Document } from "@/types/document"

export class PageAssistHtmlLoader {
  // Same implementation, just remove "extends BaseDocumentLoader"
}
```

### Validation
```bash
bun run compile
# Verify no import errors for Document type
```

---

## Phase 2: Text Splitter (Low Risk)

**Goal:** Replace LangChain's `RecursiveCharacterTextSplitter` with custom implementation.

### Files to Modify

| File | Change |
|------|--------|
| `src/utils/text-splitter.ts` | Rewrite without LangChain |

### Implementation

```typescript
// src/utils/text-splitter.ts
import type { Document } from "@/types/document"

export interface TextSplitterOptions {
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
}

export class RecursiveTextSplitter {
  private chunkSize: number
  private chunkOverlap: number
  private separators: string[]

  constructor(options: TextSplitterOptions = {}) {
    this.chunkSize = options.chunkSize ?? 1000
    this.chunkOverlap = options.chunkOverlap ?? 200
    this.separators = options.separators ?? ['\n\n', '\n', ' ', '']
  }

  splitText(text: string): string[] {
    return this.recursiveSplit(text, this.separators)
  }

  private recursiveSplit(text: string, separators: string[]): string[] {
    if (text.length <= this.chunkSize) {
      return [text]
    }

    const [sep, ...rest] = separators
    if (sep === undefined || sep === '') {
      // Character-level split with overlap
      const chunks: string[] = []
      let start = 0
      while (start < text.length) {
        chunks.push(text.slice(start, start + this.chunkSize))
        start += this.chunkSize - this.chunkOverlap
      }
      return chunks
    }

    const parts = text.split(sep)
    const chunks: string[] = []
    let current = ''

    for (const part of parts) {
      const candidate = current ? current + sep + part : part
      if (candidate.length <= this.chunkSize) {
        current = candidate
      } else {
        if (current) chunks.push(current)
        if (part.length > this.chunkSize) {
          chunks.push(...this.recursiveSplit(part, rest))
          current = ''
        } else {
          current = part
        }
      }
    }
    if (current) chunks.push(current)
    return chunks
  }

  splitDocuments(docs: Document[]): Document[] {
    return docs.flatMap(doc =>
      this.splitText(doc.pageContent).map(chunk => ({
        pageContent: chunk,
        metadata: { ...doc.metadata }
      }))
    )
  }
}

// Keep the same export name for compatibility
export const getPageAssistTextSplitter = async () => {
  // Read settings and return configured splitter
  return new RecursiveTextSplitter({ chunkSize: 1000, chunkOverlap: 200 })
}
```

### Validation
```bash
bun run compile
# Manual test: verify text splitting produces similar chunks
```

---

## Phase 3: Embeddings & Vector Store (Medium Risk)

**Goal:** Replace `OAIEmbedding` (extends LangChain) and `MemoryVectorStore`.

### Files to Modify

| File | Change |
|------|--------|
| `src/types/embedding.ts` | **CREATE** - Embedding interface |
| `src/utils/memory-vector-store.ts` | **CREATE** - Custom vector store |
| `src/models/OAIEmbedding.ts` | Rewrite without extending `Embeddings` |
| `src/web/search-engines/*.ts` (13 files) | Update imports |
| `src/web/website/index.ts` | Update imports |
| `src/utils/rerank.ts` | Update `EmbeddingsInterface` usage |

### Implementation

```typescript
// src/types/embedding.ts
export interface EmbeddingModel {
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
}
```

```typescript
// src/utils/memory-vector-store.ts
import type { Document } from "@/types/document"
import type { EmbeddingModel } from "@/types/embedding"

export class MemoryVectorStore {
  private documents: Document[] = []
  private embeddings: number[][] = []

  constructor(private embeddingModel: EmbeddingModel) {}

  async addDocuments(docs: Document[]): Promise<void> {
    const texts = docs.map(d => d.pageContent)
    const newEmbeddings = await this.embeddingModel.embedDocuments(texts)
    this.documents.push(...docs)
    this.embeddings.push(...newEmbeddings)
  }

  async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
    if (this.documents.length === 0) return []

    const queryEmb = await this.embeddingModel.embedQuery(query)
    const scored = this.embeddings.map((emb, i) => ({
      doc: this.documents[i],
      score: this.cosine(queryEmb, emb)
    }))

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(s => s.doc)
  }

  private cosine(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
  }
}
```

```typescript
// src/models/OAIEmbedding.ts - Rewrite
import { OpenAI as OpenAIClient } from "openai"
import type { EmbeddingModel } from "@/types/embedding"

export class OAIEmbedding implements EmbeddingModel {
  private client: OpenAIClient
  private model: string
  private batchSize: number

  constructor(options: {
    modelName: string
    openAIApiKey: string
    configuration?: { baseURL?: string; apiKey?: string }
    batchSize?: number
  }) {
    this.model = options.modelName
    this.batchSize = options.batchSize ?? 512
    this.client = new OpenAIClient({
      apiKey: options.openAIApiKey,
      baseURL: options.configuration?.baseURL,
      dangerouslyAllowBrowser: true
    })
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = []
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize)
      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
        encoding_format: "float"
      })
      results.push(...response.data.map(d => d.embedding))
    }
    return results
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      encoding_format: "float"
    })
    return response.data[0].embedding
  }
}
```

### Validation
```bash
bun run compile
bun run test:e2e  # Test web search functionality
```

---

## Phase 4: Message Types & Utilities (Medium Risk)

**Goal:** Replace LangChain message classes with custom classes that preserve `_getType()` and `instanceof` behavior.

### Files to Modify

| File | Change |
|------|--------|
| `src/types/messages.ts` | **CREATE** - Message classes |
| `src/utils/actor.ts` | Update imports |
| `src/utils/system-message.ts` | Update imports |
| `src/utils/human-message.tsx` | Update imports |
| `src/services/title.ts` | Update imports |
| `src/models/ChatTldw.ts` | Update imports |
| `src/chain/chat-with-x.ts` | Extract `formatDocs()`, delete rest |

### Implementation

```typescript
// src/types/messages.ts
export type MessageRole = 'system' | 'human' | 'ai' | 'function' | 'tool'

export type MessageContent = string | Array<{
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}>

export abstract class BaseMessage {
  content: MessageContent
  additional_kwargs: Record<string, any>

  constructor(content: MessageContent, kwargs: Record<string, any> = {}) {
    this.content = content
    this.additional_kwargs = kwargs
  }

  abstract _getType(): MessageRole
}

export class SystemMessage extends BaseMessage {
  constructor(fields: { content: MessageContent } | MessageContent) {
    const content = typeof fields === 'string' || Array.isArray(fields)
      ? fields
      : fields.content
    super(content)
  }
  _getType(): MessageRole { return 'system' }
}

export class HumanMessage extends BaseMessage {
  constructor(fields: { content: MessageContent } | MessageContent) {
    const content = typeof fields === 'string' || Array.isArray(fields)
      ? fields
      : fields.content
    super(content)
  }
  _getType(): MessageRole { return 'human' }
}

export class AIMessage extends BaseMessage {
  constructor(fields: { content: MessageContent } | MessageContent) {
    const content = typeof fields === 'string' || Array.isArray(fields)
      ? fields
      : fields.content
    super(content)
  }
  _getType(): MessageRole { return 'ai' }
}

export class AIMessageChunk extends AIMessage {
  constructor(fields: { content: MessageContent; additional_kwargs?: Record<string, any> }) {
    super(fields.content)
    this.additional_kwargs = fields.additional_kwargs ?? {}
  }
}
```

```typescript
// src/utils/format-docs.ts - Extract from chain file
import type { Document } from "@/types/document"

export const formatDocs = (docs: Document[]) => {
  return docs
    .filter((doc, i, self) =>
      self.findIndex((d) => d.pageContent === doc.pageContent) === i
    )
    .map((doc, i) => `<doc id='${i}'>${doc.pageContent}</doc>`)
    .join("\n")
}
```

### Validation
```bash
bun run compile
# Test chat functionality manually
bun run test:e2e
```

---

## Phase 5: Model Classes (HIGH RISK)

**Goal:** Rewrite `ChatChromeAI`, `ChatTldw`, and `CustomChatOpenAI` without LangChain base classes.

### Priority Order
1. `ChatTldw` - Already mostly custom, lowest risk
2. `ChatChromeAI` - 160 lines, medium complexity
3. `CustomChatOpenAI` - 927 lines, highest complexity

### Files to Modify

| File | Change | Effort |
|------|--------|--------|
| `src/models/ChatTldw.ts` | Update message imports | Low |
| `src/models/ChatChromeAi.ts` | Remove `SimpleChatModel` extension | Medium |
| `src/models/CustomChatOpenAI.ts` | Full rewrite | **HIGH** |
| `src/models/CustomAIMessageChunk.ts` | Update or remove | Medium |
| `src/models/utils/ollama.ts` | Remove LangChain utils | Low |

### Implementation Strategy for CustomChatOpenAI

The 927-line `CustomChatOpenAI` is the hardest part. Strategy:

1. **Keep the OpenAI client logic** - This is independent of LangChain
2. **Replace base class methods** with direct implementations:
   - `_generate` → `generate()`
   - `_streamResponseChunks` → `streamResponse()`
3. **Remove unused features**:
   - `withStructuredOutput` (uses Runnables) - likely unused
   - Token counting via `getNumTokens` - can simplify or remove
4. **Preserve the public API** that `src/models/index.ts` uses

```typescript
// Simplified CustomChatOpenAI structure
export class CustomChatOpenAI {
  private client: OpenAIClient
  // ... config fields ...

  constructor(options: OpenAIChatOptions) {
    // Same initialization
  }

  async *stream(
    messages: BaseMessage[],
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<string> {
    // Streaming implementation using OpenAI client directly
  }

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    // Non-streaming implementation
  }
}
```

### Validation
```bash
bun run compile
# Test with each provider type:
# - Chrome AI (gemini-nano)
# - tldw_server
# - OpenRouter
# - Custom OpenAI-compatible
bun run test:e2e
```

---

## Phase 6: Cleanup & Dependency Removal (Final)

**Goal:** Remove all LangChain packages and verify build.

### Files to Modify

| File | Change |
|------|--------|
| `package.json` | Remove: `langchain`, `@langchain/community`, `@langchain/openai` |
| `package.json` (resolutions) | Remove: `@langchain/core` |
| `wxt.config.ts` | Remove from `external` array |
| `src/chain/chat-with-website.ts` | **DELETE** |
| `src/chain/chat-with-x.ts` | **DELETE** (after extracting `formatDocs`) |

### Validation
```bash
rm -rf node_modules bun.lockb
bun install
bun run compile
bun run build:chrome
bun run test:e2e

# Measure bundle size
ls -la .output/chrome-mv3/
```

---

## Implementation Tasks Checklist

### Phase 1: Document Types & Loaders
- [ ] Create `src/types/document.ts`
- [ ] Update `src/loader/html.ts` - remove BaseDocumentLoader
- [ ] Update `src/loader/pdf.ts` - remove BaseDocumentLoader
- [ ] Update `src/loader/pdf-url.ts` - remove BaseDocumentLoader
- [ ] Update `src/loader/csv.ts` - remove BaseDocumentLoader
- [ ] Run `bun run compile` ✓

### Phase 2: Text Splitter
- [ ] Rewrite `src/utils/text-splitter.ts`
- [ ] Run `bun run compile` ✓

### Phase 3: Embeddings & Vector Store
- [ ] Create `src/types/embedding.ts`
- [ ] Create `src/utils/memory-vector-store.ts`
- [ ] Rewrite `src/models/OAIEmbedding.ts`
- [ ] Update 13 search engine files
- [ ] Update `src/web/website/index.ts`
- [ ] Update `src/utils/rerank.ts`
- [ ] Run `bun run compile` ✓
- [ ] Run `bun run test:e2e` ✓

### Phase 4: Message Types
- [ ] Create `src/types/messages.ts`
- [ ] Create `src/utils/format-docs.ts`
- [ ] Update `src/utils/actor.ts`
- [ ] Update `src/utils/system-message.ts`
- [ ] Update `src/utils/human-message.tsx`
- [ ] Update `src/services/title.ts`
- [ ] Update imports in chat mode files
- [ ] Run `bun run compile` ✓
- [ ] Run `bun run test:e2e` ✓

### Phase 5: Model Classes
- [ ] Update `src/models/ChatTldw.ts`
- [ ] Rewrite `src/models/ChatChromeAi.ts`
- [ ] Rewrite `src/models/CustomChatOpenAI.ts` ⚠️ HIGH EFFORT
- [ ] Update `src/models/CustomAIMessageChunk.ts`
- [ ] Update `src/models/utils/ollama.ts`
- [ ] Run `bun run compile` ✓
- [ ] Run `bun run test:e2e` ✓

### Phase 6: Cleanup
- [ ] Delete `src/chain/chat-with-website.ts`
- [ ] Delete `src/chain/chat-with-x.ts`
- [ ] Remove LangChain from `package.json`
- [ ] Remove from `wxt.config.ts` externals
- [ ] Fresh install and build
- [ ] Run `bun run compile` ✓
- [ ] Run `bun run test:e2e` ✓
- [ ] Measure bundle size reduction

---

## Complete File List by Phase

### Phase 1 Files
- `src/types/document.ts` - **CREATE**
- `src/loader/html.ts` - Remove BaseDocumentLoader
- `src/loader/pdf.ts` - Remove BaseDocumentLoader
- `src/loader/pdf-url.ts` - Remove BaseDocumentLoader
- `src/loader/csv.ts` - Remove BaseDocumentLoader

### Phase 2 Files
- `src/utils/text-splitter.ts` - Rewrite

### Phase 3 Files
- `src/types/embedding.ts` - **CREATE**
- `src/utils/memory-vector-store.ts` - **CREATE**
- `src/models/OAIEmbedding.ts` - Rewrite
- `src/utils/rerank.ts` - Update imports
- `src/web/website/index.ts` - Update imports
- `src/web/search-engines/google.ts` - Update imports
- `src/web/search-engines/bing.ts` - Update imports
- `src/web/search-engines/brave.ts` - Update imports
- `src/web/search-engines/brave-api.ts` - Update imports
- `src/web/search-engines/duckduckgo.ts` - Update imports
- `src/web/search-engines/searxng.ts` - Update imports
- `src/web/search-engines/sogou.ts` - Update imports
- `src/web/search-engines/startpage.ts` - Update imports
- `src/web/search-engines/stract.ts` - Update imports
- `src/web/search-engines/tavily-api.ts` - Update imports
- `src/web/search-engines/exa.ts` - Update imports
- `src/web/search-engines/firecrawl.ts` - Update imports
- `src/web/search-engines/baidu.ts` - Update imports

### Phase 4 Files
- `src/types/messages.ts` - **CREATE**
- `src/utils/format-docs.ts` - **CREATE** (extract from chain file)
- `src/utils/actor.ts` - Update imports
- `src/utils/system-message.ts` - Update imports
- `src/utils/human-message.tsx` - Update imports
- `src/services/title.ts` - Update imports
- `src/hooks/useMessage.tsx` - Update formatDocs import
- `src/hooks/chat-modes/ragMode.ts` - Update formatDocs import
- `src/hooks/chat-modes/documentChatMode.ts` - Update formatDocs import

### Phase 5 Files
- `src/models/ChatTldw.ts` - Update imports
- `src/models/ChatChromeAi.ts` - Rewrite (160 lines)
- `src/models/CustomChatOpenAI.ts` - Rewrite (927 lines) ⚠️ **HIGH EFFORT**
- `src/models/CustomAIMessageChunk.ts` - Update
- `src/models/utils/ollama.ts` - Update imports
- `src/models/ChatGoogleAI.ts` - Check for LangChain usage

### Phase 6 Files
- `package.json` - Remove dependencies
- `wxt.config.ts` - Remove externals
- `src/chain/chat-with-website.ts` - **DELETE**
- `src/chain/chat-with-x.ts` - **DELETE**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking web search | High | Test all 13 search engines after Phase 3 |
| Breaking chat streaming | High | Test with each provider after Phase 5 |
| Text splitting produces different chunks | Medium | Compare outputs before/after |
| `instanceof` checks break | Medium | Custom classes preserve behavior |
| Hidden LangChain usage | Medium | Run `bun run compile` after each phase |

---

## Success Criteria

1. ✅ All LangChain packages removed from `package.json`
2. ✅ `bun run compile` passes with no errors
3. ✅ All E2E tests pass
4. ✅ Bundle size reduced (measure before/after)
5. ✅ Chat works with: tldw_server, OpenRouter, custom providers, Chrome AI
6. ✅ Web search works with all 13 search engines
7. ✅ Document loading works (PDF, HTML, CSV)
