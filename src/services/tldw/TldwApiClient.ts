import { Storage } from "@plasmohq/storage"
import { bgRequest, bgStream, bgUpload } from "@/services/background-proxy"

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

  async initialize(): Promise<void> {
    const config = await this.storage.get<TldwConfig>('tldwConfig')
    if (!config) {
      throw new Error('tldw server not configured')
    }
    this.config = config
    this.baseUrl = config.serverUrl.replace(/\/$/, '') // Remove trailing slash
    
    // Set up headers based on auth mode
    this.headers = {
      'Content-Type': 'application/json',
    }

    if (config.authMode === 'single-user' && config.apiKey) {
      this.headers['X-API-KEY'] = config.apiKey
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
    const currentConfig = await this.getConfig()
    const newConfig = { ...currentConfig, ...config } as TldwConfig
    await this.storage.set('tldwConfig', newConfig)
    this.config = newConfig
    await this.initialize()
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await bgRequest<{ status?: string; [k: string]: any }>({ path: '/api/v1/health', method: 'GET' })
      return true
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  async getServerInfo(): Promise<any> {
    return await bgRequest<any>({ path: '/', method: 'GET' })
  }

  async getModels(): Promise<TldwModel[]> {
    // Prefer flattened metadata endpoint when available
    try {
      const meta = await this.getModelsMetadata().catch(() => null)
      if (Array.isArray(meta) && meta.length > 0) {
        // Normalize fields to TldwModel
        return meta.map((m: any) => ({
          id: String(m.id || m.model || m.name),
          name: String(m.name || m.id || m.model),
          provider: String(m.provider || 'unknown'),
          description: m.description,
          capabilities: Array.isArray(m.capabilities) ? m.capabilities : (Array.isArray(m.features) ? m.features : undefined),
          context_length: typeof m.context_length === 'number' ? m.context_length : (typeof m.contextLength === 'number' ? m.contextLength : undefined),
          vision: Boolean(m.vision),
          function_calling: Boolean(m.function_calling),
          json_output: Boolean(m.json_output)
        }))
      }
    } catch {}

    // Next: use providers endpoint for richer info when available
    try {
      const providers = await this.getProviders().catch(() => null)
      if (providers && typeof providers === 'object') {
        const models: TldwModel[] = []

        const pushModel = (providerName: string, id: any, value?: any) => {
          const modelId = typeof id === 'string' ? id : (id?.id || id?.name || id?.model)
          if (!modelId) return
          const name = (typeof id === 'string') ? id : (id?.name || modelId)
          const meta = (typeof id === 'object') ? id : (typeof value === 'object' ? value : {})
          models.push({
            id: String(modelId),
            name: String(name),
            provider: providerName,
            description: meta?.description,
            capabilities: Array.isArray(meta?.capabilities) ? meta.capabilities : undefined,
            context_length: typeof meta?.context_length === 'number' ? meta.context_length : (typeof meta?.contextLength === 'number' ? meta.contextLength : undefined),
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
          // Traverse object-of-arrays or object-of-objects structures
          if (info && typeof info === 'object') {
            for (const [k, v] of Object.entries(info)) {
              if (k === 'models') continue
              if (Array.isArray(v)) {
                for (const item of v) pushModel(providerName, item)
              } else if (v && typeof v === 'object') {
                // keys might be model ids with metadata objects
                for (const [mk, mv] of Object.entries<any>(v)) {
                  if (typeof mv === 'object') pushModel(providerName, mk, mv)
                  else pushModel(providerName, mk)
                }
              } else if (typeof v === 'string') {
                pushModel(providerName, v)
              }
            }
          }
        }

        for (const [providerName, info] of Object.entries<any>(providers)) {
          extract(String(providerName), info)
        }

        // Deduplicate by id+provider
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
    let list: { id: string; provider: string }[] = []
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

  async getModelsMetadata(): Promise<any[]> {
    return await bgRequest<any[]>({ path: '/api/v1/llm/models/metadata', method: 'GET' })
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<Response> {
    // Non-stream request via background
    const res = await bgRequest<Response>({ path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request })
    // bgRequest returns parsed data; for non-streaming chat we expect a JSON structure or text. To keep existing consumers happy, wrap as Response-like
    // For simplicity, return a minimal object with json() and text()
    const data = res as any
    return new Response(typeof data === 'string' ? data : JSON.stringify(data), { status: 200, headers: { 'content-type': typeof data === 'string' ? 'text/plain' : 'application/json' } })
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncGenerator<any, void, unknown> {
    request.stream = true
    for await (const line of bgStream({ path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: request })) {
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
    return await bgRequest<any>({ path: '/api/v1/rag/health', method: 'GET' })
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

  async ingestWebContent(url: string, options?: any): Promise<any> {
    const { timeoutMs, ...rest } = options || {}
    return await bgRequest<any>({ path: '/api/v1/media/ingest-web-content', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url, ...rest }, timeoutMs })
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

  // STT Methods
  async transcribeAudio(audioFile: File | Blob, options?: any): Promise<any> {
    const cfg = await this.getConfig()
    if (!cfg) throw new Error('tldw server not configured')
    const fields: Record<string, any> = {}
    if (options?.model) fields.model = options.model
    if (options?.language) fields.language = options.language
    const data = await audioFile.arrayBuffer()
    const name = (typeof File !== 'undefined' && audioFile instanceof File && (audioFile as File).name) ? (audioFile as File).name : 'audio'
    const type = (audioFile as any)?.type || 'application/octet-stream'
    return await bgUpload<any>({ path: '/api/v1/audio/transcriptions', method: 'POST', fields, file: { name, type, data } })
  }
}

// Singleton instance
export const tldwClient = new TldwApiClient()
