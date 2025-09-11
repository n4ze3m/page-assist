import { Storage } from "@plasmohq/storage"
import { bgRequest, bgStream } from "@/services/background-proxy"

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
    const data = await bgRequest<any>({ path: '/api/v1/llm/models', method: 'GET' })
    return data.models || data || []
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
    return await bgRequest<any>({ path: '/api/v1/rag/search', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query, ...options } })
  }

  async ragSimple(query: string): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/rag/simple', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { query } })
  }

  // Media Methods
  async addMedia(url: string, metadata?: any): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/media/add', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url, ...metadata } })
  }

  async ingestWebContent(url: string, options?: any): Promise<any> {
    return await bgRequest<any>({ path: '/api/v1/media/ingest-web-content', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url, ...options } })
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
    const formData = new FormData()
    formData.append('file', audioFile)
    
    if (options?.model) {
      formData.append('model', options.model)
    }
    if (options?.language) {
      formData.append('language', options.language)
    }

    // STT remains a direct fetch because of multipart/form-data — use background proxy message with body passthrough is non-trivial.
    // For now, fall back to direct fetch; future: implement background FormData relay if needed.
    const cfg = await this.getConfig()
    if (!cfg) throw new Error('tldw server not configured')
    const baseUrl = cfg.serverUrl.replace(/\/$/, '')
    const headers: Record<string, string> = {}
    if (cfg.authMode === 'single-user' && cfg.apiKey) headers['X-API-KEY'] = cfg.apiKey
    if (cfg.authMode === 'multi-user' && cfg.accessToken) headers['Authorization'] = `Bearer ${cfg.accessToken}`
    const response = await fetch(`${baseUrl}/api/v1/audio/v1/audio/transcriptions`, { method: 'POST', headers, body: formData })
    if (!response.ok) throw new Error(`Audio transcription failed: ${response.statusText}`)
    return await response.json()
  }
}

// Singleton instance
export const tldwClient = new TldwApiClient()
