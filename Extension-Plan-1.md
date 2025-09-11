# tldw_server Browser Extension Integration Plan v3.0

## Progress Status (Last Updated: 2025-09-10)
### Phase 1: Foundation (COMPLETED ✅)
- ✅ Updated branding and package.json
- ✅ Created TldwApiClient with full API integration
- ✅ Implemented authentication (single/multi-user modes)
- ✅ Created settings UI for server configuration
- ✅ Fixed manifest loading issues

### Phase 2: Core Chat Integration (IN PROGRESS 🚧)
- ✅ Created TldwModels service for model management
- ✅ Created TldwChat service for chat completions
- ✅ Integrated ChatTldw LangChain-compatible model
- ✅ Modified model factory to support tldw models
- ✅ Updated model fetching to include tldw models
- ✅ Fixed model fetching to work independently of Ollama
- ⏳ Testing chat functionality with various models - NOT TESTED YET

### Phase 3: Upcoming
- ⏳ RAG search integration
- ⏳ Media ingestion features
- ⏳ STT/TTS capabilities

## Executive Summary
This document outlines a comprehensive plan to refactor the page-assist browser extension into a dedicated, whitelabeled frontend for tldw_server. The extension will leverage tldw_server as an API aggregator that handles multiple LLM providers, while maintaining model selection capabilities in the UI.

## Plan Review Summary (2025-09-11)
- Accuracy: Core endpoint mapping aligns with the provided OpenAPI (`tldw_API.json`). Chat, RAG, Media, Notes, Prompts, and Audio endpoints exist as planned.
- Status reality: Repo already contains tldw services (`TldwApiClient`, `TldwAuth`, `TldwModels`, `TldwChat`), a `ChatTldw` LangChain model, and an options page. However, Ollama code paths are still present across background, content, hooks, and web search modules and need removal or replacement.
- Authentication: API keys are supported (confirmed; doc incoming). Bearer (OAuth2 password flow) is also supported. We will keep both modes, but standardize header usage and token refresh behavior.
- Endpoint fidelity: Some endpoints in the OpenAPI include trailing slashes (e.g., `/api/v1/notes/search/`). Our current client uses some paths without trailing slashes. To avoid redirects and CORS complications, align client paths precisely to the API spec. See TODO under “Endpoints & Path Hygiene”.
- MV3/WebRequest: For Chrome MV3, avoid blocking `webRequest` for header manipulation; prefer direct fetches from the background/service worker with proper `host_permissions` or `optional_host_permissions`.
- Offscreen API: Chrome-only. Use feature detection; do not rely on it for core flows.
- Security: Do not roll custom crypto without a sound key strategy. Prefer in-memory access tokens, persist refresh tokens only when needed, and never log secrets. Implement robust 401 handling with single-flight refresh and retry.

## Corrections & Decisions
- Auth modes: Maintain both Single-User (API key) and Multi-User (Bearer) modes. Confirm API key header and scope (pending doc). Default to Bearer where possible; keep API key mode for server setups that issue keys.
- Background proxy: Centralize all network I/O in the background/service worker. Inject auth headers, manage SSE, handle retries/backoff, and perform 401-triggered refresh with a single-flight queue.
- Permissions: Allow users to specify their own endpoint. Use `optional_host_permissions` and request permission for the configured origin at runtime. Avoid `https://*/*` where feasible; for Firefox (MV2) where optional host permissions are limited, document the necessity of broader URL permissions while minimizing others.
- Ollama removal: Remove direct Ollama features and repurpose their UX to tldw_server (e.g., context-menu “Send to tldw_server” → `/api/v1/media/add` or `ingest-web-content`).
- SSE handling: Explicitly set `Accept: text/event-stream` for streaming chat and support keep-alives. Add AbortController-based timeouts and cancellation.

## Endpoints & Path Hygiene — TODO
- Verify every client path matches OpenAPI exactly, including trailing slashes, to avoid 307 redirects on POST and CORS edge cases.
  - Examples to double-check and align:
    - `/api/v1/notes/search/` (client currently uses `/api/v1/notes/search`)
    - Other trailing-slash paths under Notes, Prompts, RAG, and Characters.
- Confirm API key header name and any required query params or header shapes from the upcoming API key document; update client accordingly.

## Architecture Understanding
tldw_server acts as an **API aggregator/proxy** that:
- Manages multiple LLM providers configured on the backend
- Allows users to specify models in requests, routing to appropriate providers
- Provides unified authentication, rate limiting, and usage tracking
- Exposes available models via `/api/v1/llm/models` endpoint

## Scope & Priorities (Updated)
- Core: Chat with model selection, RAG, Media Process/Ingest, Notes, Prompts, STT (transcribe).
- Next: TTS (speech synthesis), Multi-user authentication.
- Later: MCP integration and advanced studio/evaluation features.

## Core Endpoint Mapping
- Models: `/api/v1/llm/models` — fetch available models from tldw_server.
- Chat: `/api/v1/chat/completions` — streaming completions with model selection.
- RAG: `/api/v1/rag/{search|simple|advanced}` — retrieval with snippet insertion.
- Media: `/api/v1/media/add`, `process-{videos|audios|documents|pdfs|ebooks}`, `ingest-web-content` — capture and processing; versions under `/media/{media_id}`.
- Notes: `/api/v1/notes/`, `/notes/search/`, keywords under `/notes/keywords/*` — quick capture and organize.
- Prompts: `/api/v1/prompts/`, `/prompts/search`, `/prompts/export` — library and export.
- STT: `/api/v1/audio/v1/audio/transcriptions` (and `/translations`) — upload audio and get text.
- TTS: `/api/v1/audio/v1/audio/speech` — text-to-speech synthesis (if available).

## Critical Considerations & Solutions

### 1. Security Architecture
**Challenges:**
- Secure storage of API keys and JWT tokens
- Cross-origin requests to local/remote servers
- Content Security Policy restrictions
- Preventing credential leakage

**Solutions:**
- Use browser's encrypted storage API (`chrome.storage.local` with encryption)
- Implement secure credential manager with memory-only sensitive data
- Add origin validation for all API requests
- Implement request signing for additional security
- Use manifest V3 service workers for better security isolation

### 2. CORS & Network Configuration
**Challenges:**
- Browser extensions face CORS restrictions
- Local server access from extension
- Mixed content (HTTP/HTTPS) issues
- WebSocket connections from extension context

**Solutions:**
- Server-side: Configure CORS headers specifically for extension origin
- Add `host_permissions` in manifest for server URLs
- Implement proxy pattern through background service worker
- Use `chrome.webRequest` API for header manipulation if needed
- Fallback to polling if WebSocket fails

### 3. Performance & Resource Management
**Challenges:**
- Browser extension memory limits (typically ~2GB)
- Storage quota restrictions
- Large file handling for media uploads
- State synchronization across tabs

**Solutions:**
- Implement streaming upload for large files
- Use IndexedDB for temporary file storage with cleanup
- Implement LRU cache for API responses
- Use Chrome's `offscreen` API for heavy processing
- Centralized state management in service worker

### 4. Error Handling & Recovery
**Challenges:**
- Network failures and timeouts
- Token expiration and refresh
- Server unavailability
- Rate limiting

**Solutions:**
- Exponential backoff retry strategy
- Automatic token refresh with queue for pending requests
- Offline mode with request queuing
- User-friendly error messages with recovery actions
- Health check endpoint monitoring

## Phase 1: Foundation & MVP (Weeks 1-3)

### 1.1 Project Setup
```bash
# Repository structure
tldw-browser-extension/
├── src/
│   ├── background/       # Service worker
│   ├── content/          # Content scripts
│   ├── popup/            # Extension popup
│   ├── options/          # Settings page
│   ├── sidebar/          # Main UI panel
│   ├── shared/           # Shared utilities
│   │   ├── api/          # API client
│   │   ├── auth/         # Auth management
│   │   ├── storage/      # Storage abstraction
│   │   └── types/        # TypeScript definitions
│   └── tests/            # Test suites
├── manifest.v3.json      # Chrome/Edge
└── manifest.v2.json      # Firefox
```

### 1.2 Core Authentication Module
**Single-User Mode:**
```typescript
interface SingleUserAuth {
  apiKey: string;
  serverUrl: string;
  validateConnection(): Promise<boolean>;
}
```

**Multi-User Mode:**
```typescript
interface MultiUserAuth {
  serverUrl: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  autoRefresh(): void;
}
```

**Implementation:**
- Secure credential storage with encryption
- Auto-detection of auth mode from server
- Token refresh interceptor
- Session persistence across browser restarts

### 1.3 Basic API Client
```typescript
class TldwApiClient {
  constructor(config: TldwConfig);
  
  // Core methods
  chat(message: string, options?: ChatOptions): AsyncGenerator<ChatChunk>;
  search(query: string, options?: SearchOptions): Promise<SearchResults>;
  getServerInfo(): Promise<ServerInfo>;
  healthCheck(): Promise<boolean>;
}
```

### 1.4 Minimal UI Components
- **Sidebar Panel**: Chat interface with streaming responses
- **Settings Page**: Server URL, authentication, basic preferences
- **Status Indicator**: Connection status in toolbar icon

### 1.5 Core MVP Feature Targets
- Chat (non-stream → stream) wired to `/chat/completions` via background proxy.
- RAG search (simple) UI and insertion using `/rag/{simple|search}`.
- Media: minimal ingest (page/URL) using `/media/add` and `ingest-web-content` with progress toasts.
- STT: upload mic/selected audio to `/audio/v1/audio/transcriptions` and render transcript.
 - Notes (MVP): quick capture from selection, tag organization, search, export.
 - Prompts (MVP): library browser, quick insertion toolbar, custom prompt creation, import/export.

## Phase 2: Essential Features (Weeks 4-6)

### 2.1 Enhanced Chat Module
- Character selection dropdown
- Chat history management
- Context window configuration
- Provider/model selection
- Message editing and regeneration

### 2.2 RAG Search Integration
- Quick search bar in sidebar
- Search result display with snippets
- Filter by media type/date/tags
- Click-to-insert in chat context

### 2.3 Media Ingestion
- Right-click context menu for URLs
- "Send to tldw_server" option
- Progress notification for processing
- Quick webpage capture and summary

### 2.4 Error Recovery System
- Automatic reconnection logic
- Request retry queue
- User notification system
- Diagnostic information collection

## Phase 3: Advanced Features (Weeks 7-9)

### 3.1 TTS (Next Priority)
- TTS synthesis via `/api/v1/audio/v1/audio/speech`.
- Voice management: list/upload/preview under `/audio/v1/audio/voices*`.
- UI: speak replies, voice picker, rate/pitch controls.

### 3.2 Batch Operations
- Multiple URL processing
- Bulk media upload
- Queue management UI
- Background processing status

### 3.3 WebSocket & Realtime
- Real-time transcription if supported; otherwise fallback to polling.
- Live streaming responses; collaborative features in multi-user mode.

### 3.4 MCP Integration
- Wire `/api/v1/mcp/{request|status}` for tool execution.
- Adapter to surface MCP tools inside chat with safe prompts and confirmations.

## Phase 4: Polish & Optimization (Weeks 10-12)

### 4.1 Performance Optimization
- Code splitting and lazy loading
- Request caching strategy
- Memory usage optimization
- Bundle size reduction

### 4.2 Advanced UI Features
- Keyboard shortcuts
- Custom themes
- Floating widget mode
- Multi-language support

### 4.3 Testing & QA
- Unit tests for all modules
- Integration tests with mock server
- End-to-end browser automation tests
- Performance benchmarking
- Security audit

### 4.4 Documentation
- User guide with screenshots
- API integration reference
- Troubleshooting guide
- Developer documentation

## Technical Implementation Details

### Manifest Configuration (V3)
```json
{
  "manifest_version": 3,
  "name": "tldw_server Assistant",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "notifications",
    "offscreen"
  ],
  "host_permissions": [
    "http://localhost:8000/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "side_panel": {
    "default_path": "sidebar.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### API Adapter Pattern
```typescript
// Abstract adapter interface
interface ApiAdapter {
  chat(request: ChatRequest): AsyncGenerator<ChatResponse>;
  search(query: SearchQuery): Promise<SearchResults>;
  ingestMedia(media: MediaInput): Promise<MediaResult>;
}

// tldw_server implementation
class TldwAdapter implements ApiAdapter {
  private client: TldwApiClient;
  
  async *chat(request: ChatRequest) {
    const stream = await this.client.post('/api/v1/chat/completions', {
      messages: request.messages,
      stream: true,
      model: request.model
    });
    
    for await (const chunk of stream) {
      yield this.transformResponse(chunk);
    }
  }
}
```

### State Management Architecture
```typescript
// Centralized state in service worker
class ExtensionState {
  private state: Map<string, any> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  
  async get(key: string): Promise<any>;
  async set(key: string, value: any): Promise<void>;
  subscribe(key: string, callback: Function): void;
  unsubscribe(key: string, callback: Function): void;
}

// Message passing for state sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STATE_UPDATE') {
    // Propagate state changes to all contexts
  }
});
```

### Security Measures
```typescript
// Credential encryption
class SecureStorage {
  private async encrypt(data: string): Promise<string> {
    const key = await this.getDerivedKey();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.getIV() },
      key,
      new TextEncoder().encode(data)
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
  
  private async decrypt(data: string): Promise<string> {
    // Reverse of encryption
  }
}

// Request signing
class RequestSigner {
  sign(request: Request, apiKey: string): Request {
    const timestamp = Date.now();
    const signature = this.generateHMAC(request.url + timestamp, apiKey);
    request.headers.set('X-Signature', signature);
    request.headers.set('X-Timestamp', timestamp.toString());
    return request;
  }
}
```

### Repository Integration Outline (page-assist)
- Api Layer: `src/services/api/{http,auth,chat,rag,media,audio,notes,prompts}.ts` with a `TldwAdapter` facade.
- Background Proxy: extend `src/entries-firefox/background.ts` to proxy fetch/streams, apply signing, retries.
- Stores: `src/store/auth.ts`, `src/store/api.ts` for auth/session, server health, feature flags; reuse existing model/settings stores.
- Options UI: add `src/routes/option-settings-server.tsx` for server URL, auth mode, credentials, health check.
- Sidepanel: wire chat to adapter; add RAG search bar, status indicator; STT upload widget; later TTS controls.
- Context Menus: register “Send to tldw_server” for media ingest and track progress via notifications.

### Background Proxy Design (MV3 + Firefox)
- Centralize network: Implement a background/service-worker fetch layer that proxies all extension API calls, including SSE streaming.
- Auth injection: Add auth headers per mode (API key or Bearer) in the proxy; never expose tokens to content scripts.
- SSE support: Use `Accept: text/event-stream`, parse SSE lines, support keep-alives, and expose a message port/stream to UI.
- Abort & timeouts: Use `AbortController` for cancellation and global per-request timeouts with exponential backoff retries.
- 401 handling: Single-flight token refresh; queue/retry one time after refresh; surface errors with actionable messages.
- CORS: Prefer background-origin fetch with `host_permissions`/`optional_host_permissions`; avoid blocking `webRequest` in MV3.

### Permissions Strategy
- User-defined endpoint: Users can set any `serverUrl`. Request runtime permission for that origin using `optional_host_permissions` on Chrome/Edge.
- Least privilege: Avoid `https://*/*` in `host_permissions` where possible; on Firefox MV2, document broader URL permission constraints.
- Safe defaults: Keep permissions minimal; elevate only when user config requires it and after user confirmation.

### Storage Policy
- Tokens: Keep access tokens in memory within the background context; persist only refresh tokens if necessary.
- No custom crypto: Do not attempt local encryption without a defensible key strategy; avoid storing API keys in plaintext where possible.
- Logging: Never log secrets or full request bodies. Redact sensitive fields in error telemetry.

### Ollama Removal/Replacement Plan
- Remove direct Ollama integrations and repurpose UX to tldw_server endpoints:
  - Replace “pull”/model actions with Media ingest: context menu → `/api/v1/media/add` or `/api/v1/media/ingest-web-content`.
  - Replace model selection to read from `/api/v1/llm/models` via `TldwModels`.
  - Swap LangChain chat model to `ChatTldw` as default model adapter.
- Code areas to update (high-level):
  - Background: remove Ollama pull/stream logic and utils, add tldw media ingest progress.
  - Entries/content: remove HF/Ollama pull content scripts; add minimal ingest helpers if needed.
  - Hooks: replace `~/services/ollama` usage in `useMessage` and search engines with tldw chat/RAG.
  - Utils/providers: remove Ollama provider entries and references in model factories.
- Migration note: Keep feature flags to temporarily hide removed paths, easing rollout/testing.

### Testing & Smoke Checks
- Connectivity: Health check, server info, and permission request flows.
- Auth flows: API key and Bearer login, token refresh on 401, retry behavior.
- Chat: Non-stream and SSE stream, cancel, and error recovery.
- Models: Fetch/render models from `/api/v1/llm/models`, selection flows.
- RAG: `/api/v1/rag/simple` and `/rag/search` basic queries, insert into chat.
- Media: `/api/v1/media/add` and `ingest-web-content` with progress notifications.
- Notes/Prompts: Create/search basic flows.
- STT: Upload/transcribe a short audio clip; verify multipart handling.

## Development Milestones

### Milestone 1: Basic Connectivity (Week 2)
- [x] Server connection established
- [x] Authentication working (both modes)
- [x] Simple chat request/response
- [x] Error handling for common failures

### Milestone 2: Core Features (Week 4)
- [x] Streaming chat responses
- [ ] RAG search integration
- [x] Settings persistence
- [ ] Basic media ingestion (URL/page)
- [ ] STT transcription (upload mic/file)
- [ ] Notes and Prompts (MVP):
  - Notes: quick capture from selection, tag organization, search, export
  - Prompts: library browser, quick insertion toolbar, create, import/export

### Milestone 3: Enhanced UX (Week 6)
- [ ] Polished sidebar UI
- [ ] Context menu integration
- [ ] Keyboard shortcuts
- [ ] Progress indicators

### Milestone 4: TTS & Advanced UX (Week 9)
- [ ] TTS playback and voices
- [ ] Batch operations
- [ ] WebSocket/realtime features

### Milestone 5: MCP & Production Ready (Week 12)
- [ ] MCP request/status integration
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Performance optimized
- [ ] Security audit passed

## Risk Mitigation

### Technical Risks
1. **WebSocket Compatibility**: Fallback to polling if WebSocket fails
2. **Large File Handling**: Implement chunked upload with resume capability
3. **Token Expiration**: Proactive refresh before expiration
4. **API Version Mismatch**: Version negotiation on connection

### User Experience Risks
1. **Complex Setup**: Provide setup wizard with auto-detection
2. **Performance Issues**: Progressive loading and lazy initialization
3. **Error Messages**: Clear, actionable error messages with solutions
4. **Feature Discovery**: Interactive tutorial on first launch

## Testing Strategy

### Unit Tests
- API client methods
- Authentication flows
- State management
- Utility functions

### Integration Tests
- Server communication
- Authentication scenarios
- Error recovery
- State synchronization

### E2E Tests
- Complete user workflows
- Multi-tab scenarios
- Extension installation/upgrade
- Permission handling

### Performance Tests
- Memory usage monitoring
- Request latency measurement
- Bundle size optimization
- Render performance

## Deployment Strategy

### Phase 1: Alpha Release
- Internal testing only
- Feature flags for experimental features
- Detailed logging for debugging
- Manual installation via developer mode

### Phase 2: Beta Release
- Limited user group
- Feedback collection system
- Automated error reporting
- Chrome Web Store unlisted

### Phase 3: Public Release
- Full feature set
- Polished UI/UX
- Complete documentation
- Published to Chrome Web Store and Firefox Add-ons

## Success Metrics

### Technical Metrics
- < 2 second connection time
- < 100ms chat response latency
- < 50MB memory footprint
- > 99% uptime for background service

### User Metrics
- > 80% successful setup completion
- < 5% error rate in normal operation
- > 90% feature utilization
- > 4.0 star rating in store

## Maintenance Plan

### Regular Updates
- Security patches within 24 hours
- Feature updates monthly
- Performance improvements quarterly
- Major version annually

### Support Structure
- GitHub issues for bug reports
- Discord/Forum for community support
- Documentation wiki
- Video tutorials

## Implementation Progress Tracker

### Current Status: Active Development
**Branch**: `tldw-refactor`
**Started**: 2025-09-09

### ✅ Completed - Phase 1 Foundation
- [x] Created git branch for tldw refactoring
- [x] Updated package.json with tldw branding
- [x] Updated wxt.config.ts manifest details (fixed 'action' permission issue)
- [x] Created tldw services directory structure
- [x] Implemented TldwApiClient base class with:
  - Health check
  - Server info
  - Models fetching
  - Chat completions with streaming
  - RAG search methods
  - Media ingestion
  - Notes management
  - Prompts library
  - STT transcription
- [x] Implemented TldwAuth service with:
  - Single-user (API key) authentication
  - Multi-user (JWT) authentication
  - Login/logout
  - Token refresh
  - User info
- [x] Created tldw settings UI component with:
  - Server URL configuration
  - Auth mode selection (single/multi-user)
  - API key input for single-user
  - Login form for multi-user
  - Connection testing
- [x] Added tldw settings route to both Chrome and Firefox
- [x] Updated settings navigation menu with tldw server as primary option
- [x] Fixed locale messages for proper branding
- [x] Successfully loaded extension in Chrome
- [x] Tested connection interface loads correctly

### 🚧 In Progress - Phase 2 Core Chat Integration
1. [ ] Update model fetching to use tldw `/api/v1/llm/models`
2. [ ] Modify chat to use tldw `/api/v1/chat/completions`
3. [ ] Implement streaming response handler
4. [ ] Update background service for CORS proxy
5. [ ] Test chat functionality with various models

### Next Immediate Steps
- Create TldwModels service to fetch available models
- Update model store to use tldw models
- Modify chat hooks to use tldw API
- Test streaming chat responses

## Conclusion

This improved plan addresses the major challenges of integrating page-assist with tldw_server while maintaining security, performance, and user experience. The phased approach allows for iterative development with clear milestones and risk mitigation strategies. The emphasis on MVP features ensures a functional product early while building toward a comprehensive solution.
