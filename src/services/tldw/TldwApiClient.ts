import { Storage } from "@plasmohq/storage"
import { bgRequest, bgStream, bgUpload } from "@/services/background-proxy"

const DEFAULT_SERVER_URL = "http://127.0.0.1:8000"

export interface TldwConfig {
  serverUrl: string
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  authMode: 'single-user' | 'multi-user'
}

export interface TldwModel {
  id: string
  name: string
  provider: string
  description?: string
  capabilities?: string[]
  context_length?: number
  vision?: boolean
  function_calling?: boolean
  json_output?: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  messages: ChatMessage[]
  model: string
  stream?: boolean
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

type PromptPayload = {
  name?: string
  title?: string
  author?: string
  details?: string
  system_prompt?: string | null
  user_prompt?: string | null
  keywords?: string[]
  content?: string
  is_system?: boolean
}

export interface TldwEmbeddingModel {
  provider: string
  model: string
  allowed?: boolean
  default?: boolean
}

export interface TldwEmbeddingModelsResponse {
  data?: TldwEmbeddingModel[]
  allowed_providers?: string[] | null
  allowed_models?: string[] | null
}

export interface TldwEmbeddingProvidersConfig {
  default_provider: string
  default_model: string
  providers: {
    name: string
    models: string[]
  }[]
}

export class TldwApiClient {
  private storage: Storage
  private config: TldwConfig | null = null
  private baseUrl: string = ''
  private headers: HeadersInit = {}

  constructor() {
    this.storage = new Storage({
      area: "local"
    })
  }

  private getEnvApiKey(): string | null {
    try {
      const env: any = (import.meta as any)?.env || {}
      const raw =
        (env?.VITE_TLDW_API_KEY as string | undefined) ??
        (env?.VITE_TLDW_DEFAULT_API_KEY as string | undefined)
      const key = (raw || "").trim()
      return key || null
    } catch {
      return null
    }
  }

  private isDevMode(): boolean {
    try {
      const env: any = (import.meta as any)?.env || {}
      return Boolean(env?.DEV) || env?.MODE === "development"
    } catch {
      return false
    }
  }

  private isPlaceholderApiKey(key?: string | null): boolean {
    if (!key) return false
    const normalized = String(key).trim()
    if (!normalized) return false
    // Treat any key that still contains "REPLACE-ME" as a placeholder.
    return normalized.toUpperCase().includes("REPLACE-ME")
  }

  private getMissingApiKeyMessage(): string {
    return "tldw server API key is missing. Open Settings → tldw server and configure an API key before continuing."
  }

  private getPlaceholderApiKeyMessage(): string {
    return "tldw server API key is still set to the default demo value. Replace it with your real API key in Settings → tldw server before continuing."
  }

  private async ensureConfigForRequest(requireAuth: boolean): Promise<TldwConfig> {
    const cfg = (await this.getConfig()) || null
    if (!cfg || !cfg.serverUrl) {
      const msg =
        "tldw server is not configured. Open Settings → tldw server in the extension and set the server URL and API key."
      // eslint-disable-next-line no-console
      console.warn(msg)
      throw new Error(msg)
    }

    if (!requireAuth) {
      return cfg
    }

    if (cfg.authMode === "multi-user") {
      const token = (cfg.accessToken || "").trim()
      if (!token) {
        const msg =
          "Not authenticated. Please log in under Settings → tldw server before continuing."
        // eslint-disable-next-line no-console
        console.warn(msg)
        throw new Error(msg)
      }
      return cfg
    }

    // single-user auth
    const key = (cfg.apiKey || "").trim()
    if (!key) {
      const msg = this.getMissingApiKeyMessage()
      // eslint-disable-next-line no-console
      console.warn(msg)
      throw new Error(msg)
    }
    return cfg
  }

  private async request<T>(init: any, requireAuth = true): Promise<T> {
    await this.ensureConfigForRequest(requireAuth && !init?.noAuth)
    return await bgRequest<T>(init)
  }

  private async upload<T>(init: any, requireAuth = true): Promise<T> {
    await this.ensureConfigForRequest(requireAuth)
    return await bgUpload<T>(init)
  }

  private async *stream(init: any, requireAuth = true): AsyncGenerator<string> {
    await this.ensureConfigForRequest(requireAuth)
    for await (const line of bgStream(init)) {
      yield line as string
    }
  }

  async initialize(): Promise<void> {
    const stored = await this.storage.get<TldwConfig>('tldwConfig')
    const envApiKey = this.getEnvApiKey()

    // Seed a default local single-user config so first-run prefers the real server
    // before falling back to mocked/placeholder flows. API keys are never auto-filled;
    // users must explicitly configure credentials in Settings/Onboarding.
    if (!stored) {
      const seeded: TldwConfig = {
        serverUrl: DEFAULT_SERVER_URL,
        authMode: 'single-user'
      }
      if (envApiKey) {
        seeded.apiKey = envApiKey
      }
      await this.storage.set('tldwConfig', seeded)
      this.config = seeded
    } else {
      const hydrated: TldwConfig = {
        ...stored,
        serverUrl: stored.serverUrl || DEFAULT_SERVER_URL,
        authMode: stored.authMode || 'single-user'
      }
      if (!hydrated.apiKey && envApiKey) {
        hydrated.apiKey = envApiKey
      }
      this.config = hydrated
      // Persist any hydrated defaults for later reads (e.g., background proxy)
      await this.storage.set('tldwConfig', hydrated)
    }

    const config = this.config!
    this.baseUrl = (config.serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, '') // Remove trailing slash

    // Set up headers based on auth mode
    this.headers = {
      'Content-Type': 'application/json',
    }

    if (config.authMode === 'single-user' && config.apiKey) {
      const key = String(config.apiKey || '').trim()
      if (key) {
        this.headers['X-API-KEY'] = key
      }
    } else if (config.authMode === 'multi-user' && config.accessToken) {
      this.headers['Authorization'] = `Bearer ${config.accessToken}`
    }
  }

  async getConfig(): Promise<TldwConfig | null> {
    if (!this.config) {
      await this.initialize().catch(() => null)
    }
    return this.config
  }

  async updateConfig(config: Partial<TldwConfig>): Promise<void> {
    const currentConfig = (await this.getConfig()) || {}
    const newConfig = { ...(currentConfig as any), ...config } as TldwConfig
    await this.storage.set('tldwConfig', newConfig)
    this.config = newConfig
    await this.initialize().catch(() => null)
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Prefer background proxy (extension messaging)
      // @ts-ignore
      if (typeof browser !== 'undefined' && browser?.runtime?.sendMessage) {
        // Use authenticated health check so deployments that protect
        // /api/v1/health still work. Auth headers are injected by the
        // background proxy from tldwConfig (API key / access token).
        await bgRequest<{ status?: string; [k: string]: any }>({
          path: '/api/v1/health',
          method: 'GET'
        })
        return true
      }
    } catch {}
    // Fallback: direct fetch in dev/non-extension contexts
    try {
      if (!this.baseUrl) await this.initialize()
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/health`, { credentials: 'include' })
      return res.ok
    } catch (error) {
      // Swallow errors to avoid noisy console during first-run
      return false
    }
  }

  async getServerInfo(): Promise<any> {
    return await bgRequest<any>({ path: '/', method: 'GET' })
  }

  private buildQuery(params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return ''
    }
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue
      if (Array.isArray(value)) {
        value.forEach((entry) => search.append(key, String(entry)))
        continue
      }
      search.append(key, String(value))
    }
    const query = search.toString()
    return query ? `?${query}` : ''
  }

  async getOpenAPISpec(): Promise<any | null> {
    try {
      // Prefer background proxy in extension context. Use absolute URL to satisfy
      // the OpenAPI path/method guard ("/openapi.json" is not a declared API path).
      if (!this.baseUrl) await this.initialize()
      if (this.baseUrl) {
        return await bgRequest<any>({ path: `${this.baseUrl.replace(/\/$/, '')}/openapi.json` as any, method: 'GET' as any })
      }
    } catch {}
    try {
      if (!this.baseUrl) await this.initialize()
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/openapi.json`, { credentials: 'include' })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  async getModels(): Promise<TldwModel[]> {
    // Prefer flattened metadata endpoint when available
    try {
      const meta = await this.getModelsMetadata().catch(() => null)
      const list =
        Array.isArray(meta) && meta.length > 0
          ? meta
          : meta && typeof meta === "object" && Array.isArray((meta as any).models)
            ? (meta as any).models
            : null

      if (list && list.length > 0) {
        // Normalize fields to TldwModel
        return list.map((m: any) => ({
          id: String(m.id || m.model || m.name),
          name: String(m.name || m.id || m.model),
          provider: String(m.provider || "unknown"),
          description: m.description,
          capabilities: Array.isArray(m.capabilities)
            ? m.capabilities
            : Array.isArray(m.features)
              ? m.features
              : undefined,
          context_length:
            typeof m.context_length === "number"
              ? m.context_length
              : typeof m.context_window === "number"
                ? m.context_window
                : typeof m.contextLength === "number"
                  ? m.contextLength
                  : undefined,
          vision: Boolean(
            (m.capabilities && m.capabilities.vision) ?? m.vision
          ),
          function_calling: Boolean(
            (m.capabilities &&
              (m.capabilities.function_calling || m.capabilities.tool_use)) ??
              m.function_calling
          ),
          json_output: Boolean(
            (m.capabilities && m.capabilities.json_mode) ?? m.json_output
          )
        }))
      }
    } catch {}

    // Next: use providers endpoint for richer info when available
    try {
      const providers = await this.getProviders().catch(() => null)
      if (providers && typeof providers === "object") {
        // Newer tldw_server builds return { providers: [...], ... }.
        // Older builds may return a plain array or other shapes. Prefer the
        // documented shape first and fall back to a legacy extractor.
        const providerList = Array.isArray((providers as any).providers)
          ? (providers as any).providers
          : Array.isArray(providers)
            ? (providers as any)
            : null

        if (providerList && providerList.length > 0) {
          const models: TldwModel[] = []

          for (const p of providerList as any[]) {
            const providerName = String(p.name || p.provider || "unknown")

            const modelsInfo = Array.isArray(p.models_info) ? p.models_info : []
            const simpleModels = Array.isArray(p.models) ? p.models : []

            if (modelsInfo.length > 0) {
              for (const mi of modelsInfo) {
                const id = String(mi.id || mi.name || mi.model)
                const name = String(mi.name || id)
                const caps = mi.capabilities || {}
                models.push({
                  id,
                  name,
                  provider: providerName,
                  description: mi.notes || mi.description,
                  capabilities: Array.isArray(caps) ? caps : undefined,
                  context_length:
                    typeof mi.context_length === "number"
                      ? mi.context_length
                      : typeof mi.context_window === "number"
                        ? mi.context_window
                        : typeof mi.contextLength === "number"
                          ? mi.contextLength
                          : undefined,
                  vision: Boolean(caps.vision),
                  function_calling: Boolean(
                    caps.function_calling ?? caps.tool_use
                  ),
                  json_output: Boolean(caps.json_mode)
                })
              }
            } else {
              for (const m of simpleModels) {
                const id = String(m)
                models.push({
                  id,
                  name: id,
                  provider: providerName
                })
              }
            }
          }

          const uniq = new Map<string, TldwModel>()
          for (const m of models) {
            uniq.set(`${m.provider}:${m.id}`, m)
          }
          const list = Array.from(uniq.values())
          if (list.length > 0) return list
        }

        // Legacy fallback: tolerate older/non-standard shapes by walking
        // arbitrary object structures looking for model-like values.
        const models: TldwModel[] = []

        const pushModel = (providerName: string, id: any, value?: any) => {
          const modelId =
            typeof id === "string" ? id : id?.id || id?.name || id?.model
          if (!modelId) return
          const name =
            typeof id === "string" ? id : id?.name || modelId
          const meta =
            typeof id === "object"
              ? id
              : typeof value === "object"
                ? value
                : {}
          models.push({
            id: String(modelId),
            name: String(name),
            provider: providerName,
            description: meta?.description,
            capabilities: Array.isArray(meta?.capabilities)
              ? meta.capabilities
              : undefined,
            context_length:
              typeof meta?.context_length === "number"
                ? meta.context_length
                : typeof meta?.contextLength === "number"
                  ? meta.contextLength
                  : undefined,
            vision: Boolean(meta?.vision),
            function_calling: Boolean(meta?.function_calling),
            json_output: Boolean(meta?.json_output)
          })
        }

        const extract = (providerName: string, info: any) => {
          if (!info) return
          if (Array.isArray(info)) {
            for (const item of info) pushModel(providerName, item)
            return
          }
          if (Array.isArray(info?.models)) {
            for (const item of info.models) pushModel(providerName, item)
          }
          if (info && typeof info === "object") {
            for (const [k, v] of Object.entries(info)) {
              if (k === "models") continue
              if (Array.isArray(v)) {
                for (const item of v) pushModel(providerName, item)
              } else if (v && typeof v === "object") {
                for (const [mk, mv] of Object.entries<any>(v)) {
                  if (typeof mv === "object") pushModel(providerName, mk, mv)
                  else pushModel(providerName, mk)
                }
              } else if (typeof v === "string") {
                pushModel(providerName, v)
              }
            }
          }
        }

        for (const [providerName, info] of Object.entries<any>(providers)) {
          extract(String(providerName), info)
        }

        const uniq = new Map<string, TldwModel>()
        for (const m of models) {
          uniq.set(`${m.provider}:${m.id}`, m)
        }
        const list = Array.from(uniq.values())
        if (list.length > 0) return list
      }
    } catch {}

    // Fallback to flat list of model IDs
    const data = await bgRequest<any>({ path: '/api/v1/llm/models', method: 'GET' })
    let list: { id: string; provider: string; name?: string }[] = []
    if (Array.isArray(data)) {
      // Assume plain model ids, possibly prefixed like "provider/model" or "provider/a/b"
      list = data.map((m: any) => {
        const s = String(m)
        const parts = s.split('/')
        const provider = parts.length > 1 ? parts[0] : 'unknown'
        const rest = parts.length > 1 ? parts.slice(1).join('/') : s
        return { id: s, provider, name: rest }
      }) as any
    } else if (data && typeof data === 'object') {
      // Maybe { provider: [models...] }
      for (const [providerName, arr] of Object.entries<any>(data)) {
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const s = String(item)
            const parts = s.split('/')
            const rest = parts.length > 1 ? parts.slice(1).join('/') : s
            list.push({ id: s, provider: String(providerName), name: rest })
          }
        }
      }
      if (list.length === 0 && Array.isArray((data as any).models)) {
        list = (data as any).models.map((m: any) => {
          const s = String(m)
          const parts = s.split('/')
          const provider = parts.length > 1 ? parts[0] : 'unknown'
          const rest = parts.length > 1 ? parts.slice(1).join('/') : s
          return { id: s, provider, name: rest }
        })
      }
    }
    return list.map((m: any) => ({ id: String(m.id), name: String(m.name || m.id), provider: String(m.provider) }))
  }

  async getProviders(): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/llm/providers', method: 'GET' })
  }

  async getModelsMetadata(): Promise<any> {
    // tldw_server returns either an array or an object
    // of the form { models: [...], total: N }.
    return await bgRequest<any>({ path: '/api/v1/llm/models/metadata', method: 'GET' })
  }

  // Embeddings - Models & Providers
  async getEmbeddingModelsList(): Promise<TldwEmbeddingModel[]> {
    try {
      const data = await bgRequest<TldwEmbeddingModelsResponse | TldwEmbeddingModel[]>({
        path: "/api/v1/embeddings/models",
        method: "GET"
      })

      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as TldwEmbeddingModelsResponse)?.data)
          ? (data as TldwEmbeddingModelsResponse).data!
          : []

      return list
        .map((item) => ({
          provider: String((item as any).provider || "unknown"),
          model: String((item as any).model || ""),
          allowed:
            typeof (item as any).allowed === "boolean"
              ? Boolean((item as any).allowed)
              : true,
          default: Boolean((item as any).default)
        }))
        .filter((m) => m.model.length > 0)
    } catch (e) {
      if (import.meta.env?.DEV) {
        console.warn("tldw_server: GET /api/v1/embeddings/models failed", e)
      }
      return []
    }
  }

  async getEmbeddingProvidersConfig(): Promise<TldwEmbeddingProvidersConfig | null> {
    try {
      const cfg = await bgRequest<TldwEmbeddingProvidersConfig>({
        path: "/api/v1/embeddings/providers-config",
        method: "GET"
      })
      return cfg
    } catch (e) {
      if (import.meta.env?.DEV) {
        console.warn(
          "tldw_server: GET /api/v1/embeddings/providers-config failed",
          e
        )
      }
      return null
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<Response> {
    // Non-stream request via background
    const res = await bgRequest<Response>({ path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request })
    // bgRequest returns parsed data; for non-streaming chat we expect a JSON structure or text. To keep existing consumers happy, wrap as Response-like
    // For simplicity, return a minimal object with json() and text()
    const data = res as any
    return new Response(typeof data === 'string' ? data : JSON.stringify(data), { status: 200, headers: { 'content-type': typeof data === 'string' ? 'text/plain' : 'application/json' } })
  }

  async *streamChatCompletion(request: ChatCompletionRequest, options?: { signal?: AbortSignal; streamIdleTimeoutMs?: number }): AsyncGenerator<any, void, unknown> {
    request.stream = true
    for await (const line of bgStream({ path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request, abortSignal: options?.signal, streamIdleTimeoutMs: options?.streamIdleTimeoutMs })) {
      try {
        const parsed = JSON.parse(line)
        yield parsed
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
  }

  // RAG Methods
  async ragHealth(): Promise<any> {
    try {
      // @ts-ignore
      if (typeof browser !== 'undefined' && browser?.runtime?.sendMessage) {
        return await bgRequest<any>({ path: '/api/v1/rag/health', method: 'GET' })
      }
    } catch {}
    // Fallback direct fetch
    if (!this.baseUrl) await this.initialize().catch(() => null)
    if (!this.baseUrl) throw new Error('Not configured')
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/v1/rag/health`, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }

  async ragSearch(query: string, options?: any): Promise<any> {
    const { timeoutMs, ...rest } = options || {}
    return await bgRequest<any>({ path: '/api/v1/rag/search', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query, ...rest }, timeoutMs })
  }

  async ragSimple(query: string, options?: any): Promise<any> {
    const { timeoutMs, ...rest } = options || {}
    return await bgRequest<any>({ path: '/api/v1/rag/simple', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query, ...rest }, timeoutMs })
  }

  // Media Methods
  async addMedia(url: string, metadata?: any): Promise<any> {
    const { timeoutMs, ...rest } = metadata || {}
    return await bgRequest<any>({ path: '/api/v1/media/add', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url, ...rest }, timeoutMs })
  }

  async addMediaForm(fields: Record<string, any>): Promise<any> {
    // Multipart form for rich ingest parameters
    // Accepts a flat fields map; callers may pass booleans/strings and they will be converted
    const normalized: Record<string, any> = {}
    for (const [k, v] of Object.entries(fields || {})) {
      if (typeof v === 'undefined' || v === null) continue
      if (typeof v === 'boolean') normalized[k] = v ? 'true' : 'false'
      else normalized[k] = v
    }
    return await bgUpload<any>({ path: '/api/v1/media/add', method: 'POST', fields: normalized })
  }

  async uploadMedia(file: File, fields?: Record<string, any>): Promise<any> {
    const data = await file.arrayBuffer()
    const name = file.name || 'upload'
    const type = file.type || 'application/octet-stream'
    const normalized: Record<string, any> = {}
    for (const [k, v] of Object.entries(fields || {})) {
      if (typeof v === 'undefined' || v === null) continue
      if (typeof v === 'boolean') normalized[k] = v ? 'true' : 'false'
      else normalized[k] = v
    }
    return await bgUpload<any>({ path: '/api/v1/media/add', method: 'POST', fields: normalized, file: { name, type, data } })
  }

  // Notes Methods
  async createNote(content: string, metadata?: any): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/notes/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { content, ...metadata } })
  }

  async searchNotes(query: string): Promise<any> {
    // OpenAPI uses trailing slash for this path
    return await bgRequest<any>({ path: '/api/v1/notes/search/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query } })
  }
  // Prompts Methods
  async getPrompts(): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/prompts/', method: 'GET' })
  }

  async searchPrompts(query: string): Promise<any> {
    // TODO: confirm trailing slash per OpenAPI (`/api/v1/prompts/search` exists without slash)
    return await bgRequest<any>({ path: '/api/v1/prompts/search', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query } })
  }

  async createPrompt(payload: PromptPayload): Promise<any> {
    const name = payload.name || payload.title || 'Untitled'
    const system_prompt = payload.system_prompt ?? (payload.is_system ? payload.content : undefined)
    const user_prompt = payload.user_prompt ?? (!payload.is_system ? payload.content : undefined)
    const keywords = payload.keywords
    const normalized: Record<string, any> = {
      name,
      author: payload.author,
      details: payload.details,
      system_prompt,
      user_prompt,
      keywords
    }

    Object.keys(normalized).forEach((key) => {
      if (typeof normalized[key] === 'undefined') delete normalized[key]
    })

    try {
      return await bgRequest<any>({ path: '/api/v1/prompts/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: normalized })
    } catch (e) {
      // Some servers may use a different path without trailing slash
      try {
        return await bgRequest<any>({ path: '/api/v1/prompts', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: normalized })
      } catch (err) {
        throw err
      }
    }
  }

  async updatePrompt(id: string | number, payload: PromptPayload): Promise<any> {
    const pid = String(id)
    const name = payload.name || payload.title || 'Untitled'
    const system_prompt = payload.system_prompt ?? (payload.is_system ? payload.content : undefined)
    const user_prompt = payload.user_prompt ?? (!payload.is_system ? payload.content : undefined)
    const keywords = payload.keywords

    const normalized: Record<string, any> = {
      name,
      author: payload.author,
      details: payload.details,
      system_prompt,
      user_prompt,
      keywords
    }

    Object.keys(normalized).forEach((key) => {
      if (typeof normalized[key] === 'undefined') delete normalized[key]
    })

    // Path per OpenAPI: /api/v1/prompts/{prompt_identifier}
    return await bgRequest<any>({ path: `/api/v1/prompts/${pid}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: normalized })
  }

  // Characters API
  async listCharacters(params?: Record<string, any>): Promise<any[]> {
    const query = this.buildQuery(params)
    try {
      return await bgRequest<any[]>({ path: `/api/v1/characters/${query}`, method: 'GET' })
    } catch {
      return await bgRequest<any[]>({ path: `/api/v1/characters${query}`, method: 'GET' })
    }
  }

  async getCharacter(id: string | number): Promise<any> {
    const cid = String(id)
    try {
      return await bgRequest<any>({ path: `/api/v1/characters/${cid}`, method: 'GET' })
    } catch {
      return await bgRequest<any>({ path: `/api/v1/characters/${cid}/`, method: 'GET' })
    }
  }

  async createCharacter(payload: Record<string, any>): Promise<any> {
    try {
      return await bgRequest<any>({ path: '/api/v1/characters/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
    } catch {
      return await bgRequest<any>({ path: '/api/v1/characters', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
    }
  }

  async updateCharacter(id: string | number, payload: Record<string, any>, expectedVersion?: number): Promise<any> {
    const cid = String(id)
    const qp = expectedVersion != null ? `?expected_version=${encodeURIComponent(String(expectedVersion))}` : ''
    return await bgRequest<any>({ path: `/api/v1/characters/${cid}${qp}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async deleteCharacter(id: string | number): Promise<void> {
    const cid = String(id)
    await bgRequest<void>({ path: `/api/v1/characters/${cid}`, method: 'DELETE' })
  }

  // Character chat sessions
  async listCharacterChatSessions(): Promise<any[]> {
    // Try common variants
    try {
      return await bgRequest<any[]>({ path: '/api/v1/character-chat/sessions', method: 'GET' })
    } catch {}
    try {
      return await bgRequest<any[]>({ path: '/api/v1/character_chat_sessions/', method: 'GET' })
    } catch {}
    return await bgRequest<any[]>({ path: '/api/v1/character_chat_sessions', method: 'GET' })
  }

  async createCharacterChatSession(character_id: string): Promise<any> {
    const body = { character_id }
    try {
      return await bgRequest<any>({ path: '/api/v1/character-chat/sessions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    } catch {}
    try {
      return await bgRequest<any>({ path: '/api/v1/character_chat_sessions/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    } catch {}
    return await bgRequest<any>({ path: '/api/v1/character_chat_sessions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  }

  async deleteCharacterChatSession(session_id: string | number): Promise<void> {
    const sid = String(session_id)
    try {
      await bgRequest<void>({ path: `/api/v1/character-chat/sessions/${sid}`, method: 'DELETE' })
      return
    } catch {}
    try {
      await bgRequest<void>({ path: `/api/v1/character_chat_sessions/${sid}`, method: 'DELETE' })
      return
    } catch {}
    await bgRequest<void>({ path: `/api/v1/character_chat_sessions/${sid}/`, method: 'DELETE' })
  }

  // Character messages
  async listCharacterMessages(session_id: string | number): Promise<any[]> {
    const sid = String(session_id)
    // Prefer nested session path if available
    try {
      return await bgRequest<any[]>({ path: `/api/v1/character-chat/sessions/${sid}/messages`, method: 'GET' })
    } catch {}
    // Fallback to flat endpoint
    const query = this.buildQuery({ session_id: sid })
    try {
      return await bgRequest<any[]>({ path: `/api/v1/character-messages${query}`, method: 'GET' })
    } catch {}
    return await bgRequest<any[]>({ path: `/api/v1/character_messages${query}`, method: 'GET' })
  }

  async sendCharacterMessage(session_id: string | number, content: string, options?: { extra?: Record<string, any> }): Promise<any> {
    const sid = String(session_id)
    const body = { content, session_id: sid, ...(options?.extra || {}) }
    // Non-streaming create
    try {
      return await bgRequest<any>({ path: `/api/v1/character-chat/sessions/${sid}/messages`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    } catch {}
    try {
      return await bgRequest<any>({ path: '/api/v1/character_messages', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    } catch {}
    return await bgRequest<any>({ path: '/api/v1/character-messages', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
  }

  async * streamCharacterMessage(session_id: string | number, content: string, options?: { extra?: Record<string, any> }): AsyncGenerator<any> {
    const sid = String(session_id)
    const body = { content, session_id: sid, ...(options?.extra || {}) }
    // Try nested stream path first
    try {
      for await (const line of bgStream({ path: `/api/v1/character-chat/sessions/${sid}/messages/stream`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body })) {
        try { yield JSON.parse(line) } catch {}
      }
      return
    } catch {}
    // Fallback to flat stream
    try {
      for await (const line of bgStream({ path: '/api/v1/character_messages/stream', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })) {
        try { yield JSON.parse(line) } catch {}
      }
      return
    } catch {}
    for await (const line of bgStream({ path: '/api/v1/character-messages/stream', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })) {
      try { yield JSON.parse(line) } catch {}
    }
  }

  // Chats API (resource-based)
  async listChats(params?: Record<string, any>): Promise<any[]> {
    const query = this.buildQuery(params)
    return await bgRequest<any[]>({ path: `/api/v1/chats/${query}`, method: 'GET' })
  }

  async createChat(payload: Record<string, any>): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/chats/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async getChat(chat_id: string | number): Promise<any> {
    const cid = String(chat_id)
    return await bgRequest<any>({ path: `/api/v1/chats/${cid}`, method: 'GET' })
  }

  async updateChat(chat_id: string | number, payload: Record<string, any>): Promise<any> {
    const cid = String(chat_id)
    return await bgRequest<any>({ path: `/api/v1/chats/${cid}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async deleteChat(chat_id: string | number): Promise<void> {
    const cid = String(chat_id)
    await bgRequest<void>({ path: `/api/v1/chats/${cid}`, method: 'DELETE' })
  }

  async listChatMessages(chat_id: string | number, params?: Record<string, any>): Promise<any[]> {
    const cid = String(chat_id)
    const query = this.buildQuery(params)
    return await bgRequest<any[]>({ path: `/api/v1/chats/${cid}/messages${query}`, method: 'GET' })
  }

  async addChatMessage(chat_id: string | number, payload: Record<string, any>): Promise<any> {
    const cid = String(chat_id)
    return await bgRequest<any>({ path: `/api/v1/chats/${cid}/messages`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async searchChatMessages(chat_id: string | number, query: string, limit?: number): Promise<any> {
    const cid = String(chat_id)
    const qp = `?query=${encodeURIComponent(query)}${typeof limit === 'number' ? `&limit=${encodeURIComponent(String(limit))}` : ''}`
    return await bgRequest<any>({ path: `/api/v1/chats/${cid}/messages/search${qp}`, method: 'GET' })
  }

  async completeChat(chat_id: string | number, payload?: Record<string, any>): Promise<any> {
    const cid = String(chat_id)
    return await bgRequest<any>({ path: `/api/v1/chats/${cid}/complete`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload || {} })
  }

  async * streamCompleteChat(chat_id: string | number, payload?: Record<string, any>): AsyncGenerator<any> {
    const cid = String(chat_id)
    for await (const line of bgStream({ path: `/api/v1/chats/${cid}/complete`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload || {} })) {
      try { yield JSON.parse(line) } catch {}
    }
  }

  // Message (single) APIs
  async getMessage(message_id: string | number): Promise<any> {
    const mid = String(message_id)
    return await bgRequest<any>({ path: `/api/v1/messages/${mid}`, method: 'GET' })
  }

  async editMessage(message_id: string | number, content: string, expectedVersion: number): Promise<any> {
    const mid = String(message_id)
    const qp = `?expected_version=${encodeURIComponent(String(expectedVersion))}`
    return await bgRequest<any>({ path: `/api/v1/messages/${mid}${qp}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: { content } })
  }

  async deleteMessage(message_id: string | number, expectedVersion: number): Promise<void> {
    const mid = String(message_id)
    const qp = `?expected_version=${encodeURIComponent(String(expectedVersion))}`
    await bgRequest<void>({ path: `/api/v1/messages/${mid}${qp}`, method: 'DELETE' })
  }

  // World Books
  async listWorldBooks(include_disabled?: boolean): Promise<any> {
    const qp = include_disabled ? `?include_disabled=true` : ''
    return await bgRequest<any>({ path: `/api/v1/characters/world-books${qp}`, method: 'GET' })
  }

  async createWorldBook(payload: Record<string, any>): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/characters/world-books', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async updateWorldBook(world_book_id: number | string, payload: Record<string, any>): Promise<any> {
    const wid = String(world_book_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/${wid}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async deleteWorldBook(world_book_id: number | string): Promise<any> {
    const wid = String(world_book_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/${wid}`, method: 'DELETE' })
  }

  async listWorldBookEntries(world_book_id: number | string, enabled_only?: boolean): Promise<any> {
    const wid = String(world_book_id)
    const qp = enabled_only ? `?enabled_only=true` : ''
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/${wid}/entries${qp}`, method: 'GET' })
  }

  async addWorldBookEntry(world_book_id: number | string, payload: Record<string, any>): Promise<any> {
    const wid = String(world_book_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/${wid}/entries`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async updateWorldBookEntry(entry_id: number | string, payload: Record<string, any>): Promise<any> {
    const eid = String(entry_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/entries/${eid}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async deleteWorldBookEntry(entry_id: number | string): Promise<any> {
    const eid = String(entry_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/entries/${eid}`, method: 'DELETE' })
  }

  async attachWorldBookToCharacter(character_id: number | string, world_book_id: number | string): Promise<any> {
    const cid = String(character_id)
    return await bgRequest<any>({ path: `/api/v1/characters/${cid}/world-books`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { world_book_id: Number(world_book_id) } })
  }

  async detachWorldBookFromCharacter(character_id: number | string, world_book_id: number | string): Promise<any> {
    const cid = String(character_id)
    const wid = String(world_book_id)
    return await bgRequest<any>({ path: `/api/v1/characters/${cid}/world-books/${wid}`, method: 'DELETE' })
  }

  async listCharacterWorldBooks(character_id: number | string): Promise<any> {
    const cid = String(character_id)
    return await bgRequest<any>({ path: `/api/v1/characters/${cid}/world-books`, method: 'GET' })
  }

  async exportWorldBook(world_book_id: number | string): Promise<any> {
    const wid = String(world_book_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/${wid}/export`, method: 'GET' })
  }

  async importWorldBook(request: { world_book: Record<string, any>; entries?: any[]; merge_on_conflict?: boolean }): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/characters/world-books/import', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request })
  }

  async worldBookStatistics(world_book_id: number | string): Promise<any> {
    const wid = String(world_book_id)
    return await bgRequest<any>({ path: `/api/v1/characters/world-books/${wid}/statistics`, method: 'GET' })
  }

  // Chat Dictionaries
  async createDictionary(payload: Record<string, any>): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/chat/dictionaries', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async listDictionaries(include_inactive?: boolean): Promise<any> {
    const qp = include_inactive ? `?include_inactive=true` : ''
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries${qp}`, method: 'GET' })
  }

  async getDictionary(dictionary_id: number | string): Promise<any> {
    const id = String(dictionary_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}`, method: 'GET' })
  }

  async updateDictionary(dictionary_id: number | string, payload: Record<string, any>): Promise<any> {
    const id = String(dictionary_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async deleteDictionary(dictionary_id: number | string, hard_delete?: boolean): Promise<any> {
    const id = String(dictionary_id)
    const qp = hard_delete ? `?hard_delete=true` : ''
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}${qp}`, method: 'DELETE' })
  }

  async listDictionaryEntries(dictionary_id: number | string, group?: string): Promise<any> {
    const id = String(dictionary_id)
    const qp = group ? `?group=${encodeURIComponent(group)}` : ''
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}/entries${qp}`, method: 'GET' })
    }

  async addDictionaryEntry(dictionary_id: number | string, payload: Record<string, any>): Promise<any> {
    const id = String(dictionary_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}/entries`, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async updateDictionaryEntry(entry_id: number | string, payload: Record<string, any>): Promise<any> {
    const eid = String(entry_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/entries/${eid}`, method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload })
  }

  async deleteDictionaryEntry(entry_id: number | string): Promise<any> {
    const eid = String(entry_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/entries/${eid}`, method: 'DELETE' })
  }

  async exportDictionaryMarkdown(dictionary_id: number | string): Promise<any> {
    const id = String(dictionary_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}/export/markdown`, method: 'GET' })
  }

  async exportDictionaryJSON(dictionary_id: number | string): Promise<any> {
    const id = String(dictionary_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}/export/json`, method: 'GET' })
  }

  async importDictionaryJSON(data: any, activate?: boolean): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/chat/dictionaries/import/json', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { data, activate: !!activate } })
  }

  async dictionaryStatistics(dictionary_id: number | string): Promise<any> {
    const id = String(dictionary_id)
    return await bgRequest<any>({ path: `/api/v1/chat/dictionaries/${id}/statistics`, method: 'GET' })
  }

  // STT Methods
  async transcribeAudio(audioFile: File | Blob, options?: any): Promise<any> {
    await this.ensureConfigForRequest(true)
    const fields: Record<string, any> = {}
    if (options?.model) fields.model = options.model
    if (options?.language) fields.language = options.language
    const data = await audioFile.arrayBuffer()
    const name = (typeof File !== 'undefined' && audioFile instanceof File && (audioFile as File).name) ? (audioFile as File).name : 'audio'
    const type = (audioFile as any)?.type || 'application/octet-stream'
    return await this.upload<any>({ path: '/api/v1/audio/transcriptions', method: 'POST', fields, file: { name, type, data } })
  }

  async synthesizeSpeech(
    text: string,
    options?: { voice?: string; model?: string; responseFormat?: string; speed?: number }
  ): Promise<ArrayBuffer> {
    await this.ensureConfigForRequest(true)
    if (!this.baseUrl) await this.initialize()
    const base = this.baseUrl.replace(/\/$/, '')
    const url = `${base}/api/v1/audio/speech`
    const body: Record<string, any> = { input: text, text }
    if (options?.voice) body.voice = options.voice
    if (options?.model) body.model = options.model
    if (options?.responseFormat) body.response_format = options.responseFormat
    if (options?.speed != null) body.speed = options.speed
    const headers: HeadersInit = {
      ...this.headers,
      Accept: 'audio/mpeg'
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    if (!resp.ok) {
      let detail: string | undefined
      try {
        const data = await resp.json()
        detail = data?.detail || data?.error || data?.message
      } catch {
        // ignore JSON parse failures; fall back to status text
      }
      throw new Error(detail || `TTS failed (HTTP ${resp.status})`)
    }
    return await resp.arrayBuffer()
  }
}

// Singleton instance
export const tldwClient = new TldwApiClient()
