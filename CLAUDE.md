# CLAUDE.md - tldw Assistant Browser Extension

This file provides context for Claude Code when working on this codebase.

## Quick Reference for Python Developers

If you're coming from Python, here are the key differences:

| Python Concept | JavaScript/TypeScript Equivalent |
|----------------|----------------------------------|
| `pip install` | `bun install` or `npm install` |
| `requirements.txt` | `package.json` (dependencies section) |
| `venv` | `node_modules/` (per-project by default) |
| `__init__.py` | `index.ts` / `index.tsx` |
| `def function():` | `function name() {}` or `const name = () => {}` |
| `async def` | `async function` |
| `await` | `await` (same!) |
| `dict` | `object` or `Record<K,V>` |
| `list` | `array` |
| `None` | `null` or `undefined` |
| `self` | `this` |
| Type hints (`x: int`) | TypeScript types (`x: number`) |
| `if __name__ == "__main__":` | Entry points defined in `wxt.config.ts` |

## Project Overview

**tldw Assistant** is a browser extension (Chrome/Firefox/Edge) that serves as a frontend for tldw_server - a unified AI assistant with RAG, media processing, and more.

**Tech Stack:**
- **Framework**: [WXT](https://wxt.dev/) - Modern browser extension framework (think of it as the "Django" of browser extensions)
- **UI Library**: React 18 with TypeScript
- **Styling**: TailwindCSS (utility-first CSS framework)
- **State Management**: Zustand (lightweight Redux alternative)
- **Build Tool**: Vite (fast bundler, similar to webpack but faster)
- **Package Manager**: Bun (fast npm alternative) or npm

## Project Structure

```
src/
├── entries/              # Chrome MV3 entry points (background script, options page, sidepanel)
├── entries-firefox/      # Firefox MV2 entry points (slightly different manifest)
├── components/           # React components (PascalCase: ModelSelect.tsx)
├── hooks/                # React hooks (useXxx.tsx pattern)
├── routes/               # Page components for routing (option-*.tsx, sidepanel-*.tsx)
├── services/             # Business logic & API calls (kebab-case: tldw-server.ts)
├── store/                # Zustand state stores (option.tsx, model.tsx, etc.)
├── utils/                # Utility functions (kebab-case: humanize-milliseconds.ts)
├── db/                   # Dexie (IndexedDB) database layer
├── assets/               # Icons, styles, fonts, locales
│   └── locale/           # i18n translation files (JSON)
├── libs/                 # Vendored/modified libraries
├── models/               # AI model provider configurations
├── parser/               # Content parsers (PDF, web, etc.)
└── types/                # TypeScript type definitions
```

**Key Config Files:**
- `wxt.config.ts` - Build configuration (entry points, permissions, manifest)
- `tailwind.config.js` - Tailwind CSS customization
- `tsconfig.json` - TypeScript compiler options
- `package.json` - Dependencies and scripts
- `playwright.config.ts` - E2E test configuration

## Common Commands

```bash
# Development (hot reload)
bun dev                 # Chrome (default)
bun run dev:firefox     # Firefox
bun run dev:edge        # Edge

# Type checking (run before commits)
bun run compile         # TypeScript --noEmit check

# Production builds
bun run build           # All browsers
bun run build:chrome    # Chrome only
bun run build:firefox   # Firefox only

# Create release archives
bun run zip             # Chrome
bun run zip:firefox     # Firefox

# E2E Tests (Playwright)
bun run test:e2e        # Run all tests
bun run test:e2e:ui     # Run with UI

# Documentation (VitePress)
bun run docs:dev        # Local dev server
bun run docs:build      # Build static docs

# Format code
bunx prettier --write .
```

**Build Output:** `.output/<browser>-mv3/` - Load this as an unpacked extension for testing.

## Extension Architecture

### Entry Points (like Python's `if __name__ == "__main__"`)

1. **Background Script** (`src/entries/background.ts`)
   - Service worker that runs in the background
   - Handles: context menus, keyboard shortcuts, message passing, model warmup
   - Think of it as a long-running daemon process

2. **Sidepanel** (`src/entries/sidepanel/`)
   - Chat interface that slides in from the side
   - Main user interaction point

3. **Options Page** (`src/entries/options/`)
   - Full settings UI (opens in a new tab)
   - Routes defined in `src/routes/option-*.tsx`

4. **Content Scripts** (`src/entries/hf-pull.content.ts`)
   - Injected into web pages to interact with page content

### State Management (Zustand)

Located in `src/store/`. Each store is like a Python singleton with state:

```typescript
// src/store/model.tsx - Example store
import { create } from 'zustand'

interface ModelState {
  selectedModel: string | null
  setSelectedModel: (model: string) => void
}

export const useModelStore = create<ModelState>((set) => ({
  selectedModel: null,
  setSelectedModel: (model) => set({ selectedModel: model })
}))
```

### Database Layer (Dexie/IndexedDB)

Located in `src/db/`. Uses Dexie.js as an IndexedDB wrapper:
- `models.ts` - AI model configurations
- `knowledge.ts` - RAG knowledge base
- `vector.ts` - Vector embeddings storage

### API Communication

- `src/services/tldw-server.ts` - Main tldw_server API client
- `src/services/api-send.ts` - Generic API sending utilities
- `src/services/ollama.ts` - Ollama local model integration
- `src/services/openai-tts.ts` - Text-to-speech services

## Coding Conventions

### File Naming
- **Components**: PascalCase (`ModelSelect.tsx`)
- **Hooks**: camelCase with `use` prefix (`useDarkmode.tsx`)
- **Utils/Services**: kebab-case (`humanize-milliseconds.ts`)

### TypeScript
- 2-space indentation
- Strict mode disabled (see `tsconfig.json`)
- Use `@/` alias for `src/` imports

### Styling
- Use TailwindCSS utility classes (e.g., `className="flex items-center gap-2"`)
- Custom colors defined in `tailwind.config.js` via CSS variables
- Dark mode: `darkMode: "class"` - toggle via `.dark` class on root

### Imports
- Sorted by Prettier with `@plasmohq/prettier-plugin-sort-imports`
- Run `bunx prettier --write .` to auto-format

## Testing

### E2E Tests (Playwright)
Located in `tests/e2e/`. Tests run against built extension:

```bash
# Build first, then test
bun run build:chrome
bun run test:e2e

# Or with UI for debugging
bun run test:e2e:ui
```

Key test files:
- `api-smoke.spec.ts` - API connectivity
- `chatStreaming.spec.ts` - Chat functionality
- `quick-ingest.spec.ts` - Content ingestion
- `media-ux.spec.ts` - Media handling

### Manual Testing
1. Build: `bun run build:chrome`
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode"
4. "Load unpacked" → Select `.output/chrome-mv3/`
5. Test options page, sidepanel, keyboard shortcuts

## Internationalization (i18n)

**Translation files:**
- `src/assets/locale/{lang}/*.json` - Component translations
- `src/public/_locales/{lang}/messages.json` - Chrome i18n messages

When adding new UI text, update relevant locale files.

## Security Notes

- **Never hardcode API keys** - Use Options pages and extension storage
- **Environment variables**: `VITE_TLDW_API_KEY` for local dev (create `.env` file)
- **XSS Protection**: `wxt.config.ts` includes `safeInnerHTMLPlugin` that auto-sanitizes with DOMPurify

## Common Gotchas for Python Developers

1. **Async/Await**: Works similarly to Python but callbacks are also common
2. **`null` vs `undefined`**: Both are "nothing" but slightly different
3. **`===` vs `==`**: Always use `===` (strict equality)
4. **Array methods**: `map`, `filter`, `reduce` instead of list comprehensions
5. **Destructuring**: `const { a, b } = obj` is very common (like Python's unpacking)
6. **Optional chaining**: `obj?.prop?.nested` (like Python 3.10+ `obj.prop` with None checks)
7. **Nullish coalescing**: `value ?? default` (like Python's `value or default` but only for null/undefined)

## Browser Extension Concepts

- **Manifest**: `wxt.config.ts` generates the manifest.json
- **Permissions**: Defined in `wxt.config.ts` (storage, activeTab, etc.)
- **Message Passing**: Background ↔ Content Script ↔ Popup communication
- **Service Worker**: Background script lifecycle (can be terminated/restarted)

## Debugging Tips

1. **Background script**: Open extension page → "Service Worker" link → DevTools
2. **Sidepanel/Options**: Right-click → Inspect
3. **Console logs**: Check both background console AND page console
4. **Storage**: DevTools → Application → IndexedDB / Local Storage

## Key Dependencies

- `react` / `react-dom` - UI framework
- `zustand` - State management
- `@tanstack/react-query` - Server state management
- `antd` - UI component library (Ant Design)
- `tailwindcss` - Utility CSS
- `dexie` - IndexedDB wrapper
- `axios` - HTTP client
- `i18next` - Internationalization
- `langchain` - LLM orchestration
- `openai` - OpenAI API client
- `wxt` - Extension framework

---

## Best Practices for Browser Extension Development

This section covers JavaScript/TypeScript patterns critical for browser extensions. Unlike Python scripts that run to completion, browser extensions have complex lifecycles where components can be terminated, restarted, or removed at any time.

### 1. Resource Cleanup & Memory Management

**Why it matters:** In Python, garbage collection handles most cleanup. In browser extensions, you must explicitly clean up event listeners, timers, and connections or face memory leaks.

**Pattern: useEffect Cleanup (Python analogy: context managers / `__exit__`)**

```typescript
// src/hooks/useBackgroundMessage.tsx - GOOD pattern
useEffect(() => {
  const messageListener = (request: Message) => {
    if (request.from === "background") {
      setMessage(request)
    }
  }
  browser.runtime.onMessage.addListener(messageListener)

  // This cleanup function runs when component unmounts (like __exit__)
  return () => {
    browser.runtime.onMessage.removeListener(messageListener)
  }
}, [])
```

**Pattern: Comprehensive Resource Cleanup**

```typescript
// src/hooks/useMicStream.ts - Multiple resources to clean up
const stop = () => {
  try { processorRef.current?.disconnect() } catch {}
  try { sourceRef.current?.disconnect() } catch {}
  try { ctxRef.current?.close() } catch {}
  mediaStreamRef.current?.getTracks().forEach(t => t.stop())
  // Nullify refs to help garbage collection
  processorRef.current = null
  sourceRef.current = null
  ctxRef.current = null
}

useEffect(() => () => stop(), [])  // Cleanup on unmount
```

**Anti-patterns to avoid:**
- Adding event listeners without corresponding removal
- Creating timers (`setInterval`) without `clearInterval` in cleanup
- Module-level singletons that hold state between component lifecycles

### 2. Async Patterns

**Pattern: AbortController for Cancellation (Python analogy: `asyncio.CancelledError`)**

```typescript
// Used throughout for streaming - allows cancellation
const controller = new AbortController()

try {
  const response = await fetch(url, { signal: controller.signal })
  // Process response...
} catch (e) {
  if (e.name === 'AbortError') {
    // Request was cancelled - not an error
    return
  }
  throw e
}

// To cancel:
controller.abort()
```

**Pattern: Single-Flight Promises (Prevent Duplicate Requests)**

```typescript
// src/entries/background.ts - Only one token refresh at a time
let refreshInFlight: Promise<void> | null = null

if (!refreshInFlight) {
  refreshInFlight = (async () => {
    try {
      await tldwAuth.refreshToken()
    } finally {
      refreshInFlight = null
    }
  })()
}
await refreshInFlight
```

**Pattern: AsyncGenerator for Streaming**

```typescript
// src/services/background-proxy.ts - Streaming with proper cleanup
export async function* bgStream<P extends AllowedPath>(
  { path, method, body, abortSignal }: BgStreamInit<P>
): AsyncGenerator<string> {
  const port = browser.runtime.connect({ name: 'tldw:stream' })

  try {
    for await (const chunk of readFromPort(port)) {
      if (abortSignal?.aborted) break
      yield chunk
    }
  } finally {
    port.disconnect()  // Always cleanup
  }
}
```

### 3. Error Handling

**Pattern: Graceful Degradation with Fallbacks**

```typescript
// src/services/background-helpers.ts - Try multiple approaches
export const ensureSidepanelOpen = async (windowId?: number) => {
  // Try Chrome API first
  try {
    await chrome.sidePanel.open({ windowId })
    return
  } catch {}

  // Fall back to Firefox approach
  try {
    await browser.sidebarAction.open()
    return
  } catch {}

  // Final fallback - open options page
  await browser.runtime.openOptionsPage()
}
```

**Pattern: Error Categorization for UI**

```typescript
// src/store/connection.tsx - Return specific error kinds
type ErrorKind = 'auth' | 'unreachable' | 'partial' | null

const categorizeError = (status: number | null, error: string | null): ErrorKind => {
  if (status === 401 || status === 403) return 'auth'
  if (!status && error) return 'unreachable'
  if (status && status >= 500) return 'partial'
  return null
}
```

**Anti-patterns:**
```typescript
// BAD - Swallows error context
try {
  await riskyOperation()
} catch (e) {
  console.log('Error')  // Lost the actual error!
}

// GOOD - Preserve error context
try {
  await riskyOperation()
} catch (e) {
  console.error('Operation failed:', e)
  throw new Error(`Operation failed: ${e.message}`, { cause: e })
}
```

### 4. Message Passing (Extension IPC)

Browser extensions have multiple isolated contexts (background, content scripts, UI). They communicate via message passing.

**Pattern: Typed Message Protocol**

```typescript
// Define message types (like Python dataclasses)
type Message =
  | { type: 'tldw:request'; payload: RequestPayload }
  | { type: 'tldw:models:refresh'; force?: boolean }
  | { type: 'tldw:debug'; payload: any }

// Handler with type discrimination
browser.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  switch (msg.type) {
    case 'tldw:request':
      handleRequest(msg.payload).then(sendResponse)
      return true  // Indicates async response
    case 'tldw:models:refresh':
      refreshModels(msg.force)
      return false
  }
})
```

**Pattern: Response Envelope**

```typescript
// Consistent response format
type Response<T> = {
  ok: boolean
  data?: T
  error?: string
  status?: number
}

// Usage
const resp = await browser.runtime.sendMessage({ type: 'tldw:request', payload })
if (!resp.ok) {
  throw new Error(resp.error || `Request failed: ${resp.status}`)
}
return resp.data
```

### 5. State Management (Zustand Best Practices)

**Pattern: Selectors to Prevent Re-renders**

```typescript
// src/hooks/useConnectionState.ts - Only subscribe to what you need
// BAD - Component re-renders on ANY store change
const store = useConnectionStore()

// GOOD - Only re-renders when `state` changes
const state = useConnectionStore((s) => s.state)

// GOOD - Group related actions (actions don't cause re-renders)
const actions = useConnectionStore((s) => ({
  checkOnce: s.checkOnce,
  setServerUrl: s.setServerUrl
}))
```

**Pattern: Immutable Updates**

```typescript
// src/store/quick-chat.tsx
addMessage: (role, content) => {
  const newMessage = {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now()
  }
  // Create new array, don't mutate existing
  set((state) => ({
    messages: [...state.messages, newMessage]
  }))
}
```

### 6. React Performance Patterns

**When to use `useCallback` and `useMemo`:**

| Use Case | Tool | Example |
|----------|------|---------|
| Event handler passed to child | `useCallback` | `onClick={handleClick}` |
| Expensive computation | `useMemo` | Filtering/sorting large lists |
| Object/array passed to child | `useMemo` | `options={computedOptions}` |
| Simple values | Neither | Premature optimization |

**Pattern: Lazy Loading for Code Splitting**

```typescript
// src/components/Common/QuickChatHelper/QuickChatHelperButton.tsx
import { lazy, Suspense } from 'react'

// Only loads when modal is opened
const QuickChatHelperModal = lazy(() =>
  import("./QuickChatHelperModal").then((m) => ({ default: m.QuickChatHelperModal }))
)

// Usage with Suspense fallback
{isOpen && (
  <Suspense fallback={<Spin />}>
    <QuickChatHelperModal open={isOpen} onClose={handleClose} />
  </Suspense>
)}
```

**Pattern: React Query for Server State**

```typescript
// Automatic caching, refetching, and loading states
const { data, isPending, error } = useQuery({
  queryKey: ['models', providerId],  // Cache key
  queryFn: () => fetchModels(providerId),
  enabled: !!providerId,  // Only fetch when we have an ID
  staleTime: 5 * 60 * 1000  // Cache for 5 minutes
})
```

### 7. Security Practices

**This codebase has strong security measures built-in:**

**Auto-Sanitization Plugin** (`wxt.config.ts:18-114`)

The `safeInnerHTMLPlugin` automatically transforms ALL `innerHTML` assignments at build time:
```typescript
// Your code:
element.innerHTML = userContent

// Becomes at build time:
__setSafeInnerHTML(element, userContent)  // Uses DOMPurify
```

**Content Security Policy** (`wxt.config.ts:216-223`)
- Production: `script-src 'self' 'wasm-unsafe-eval'`
- Development: Also allows localhost for hot reload
- No `unsafe-eval` or `unsafe-inline` in production

**Auth Header Protection** (`src/services/background-proxy.ts`)
```typescript
// Strips existing auth headers before adding new ones
// Prevents header injection attacks
for (const k of Object.keys(headers)) {
  if (k.toLowerCase() === 'authorization') delete headers[k]
}
```

**Guidelines:**
- Never hardcode API keys (use extension storage)
- Always validate data from external sources
- Use `bgRequest()` for API calls (handles auth safely)

### 8. TypeScript in This Codebase

**Config:** `strict: false` (see `tsconfig.json`) - allows flexibility but requires discipline.

**When to use `type` vs `interface`:**

```typescript
// Use `type` for:
// - Union types
type Status = 'loading' | 'success' | 'error'
// - Function signatures
type Handler = (event: Event) => void
// - Simple data shapes
type Point = { x: number; y: number }

// Use `interface` for:
// - Object shapes that might be extended
interface ComponentProps {
  className?: string
  children?: React.ReactNode
}
// - Class contracts
interface Service {
  start(): Promise<void>
  stop(): void
}
```

**Handling `any` appropriately:**

```typescript
// Acceptable uses of `any`:
// 1. External API responses with variable structure
const response: any = await fetchExternalApi()

// 2. Generic message passing
const sendMessage = (type: string, payload: any) => { ... }

// Better alternatives when possible:
// Use `unknown` and narrow the type
const data: unknown = JSON.parse(input)
if (isValidResponse(data)) {
  // Now TypeScript knows the type
}

// Use generics for type-safe flexibility
function request<T>(url: string): Promise<T> { ... }
```

### Quick Reference: Common Patterns

| Pattern | Python Equivalent | JS/TS Implementation |
|---------|-------------------|---------------------|
| Resource cleanup | `with` / `__exit__` | `useEffect` return function |
| Cancellation | `asyncio.CancelledError` | `AbortController` |
| Singleton state | Module-level variable | Zustand store |
| Type narrowing | `isinstance()` | Type guards / discriminated unions |
| Async iteration | `async for` | `for await...of` |
| Optional access | `getattr(obj, 'x', None)` | `obj?.x` |
| Default values | `x or default` | `x ?? default` (nullish only) |
