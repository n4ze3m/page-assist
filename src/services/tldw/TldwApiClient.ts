import { Storage } from "@plasmohq/storage"

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
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: this.headers
      })
      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  async getServerInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/`, {
      method: 'GET',
      headers: this.headers
    })
    
    if (!response.ok) {
      throw new Error(`Server info request failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  async getModels(): Promise<TldwModel[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/llm/models`, {
      method: 'GET',
      headers: this.headers
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.models || data || []
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      throw new Error(`Chat completion failed: ${response.statusText}`)
    }
    
    return response
  }

  async *streamChatCompletion(request: ChatCompletionRequest): AsyncGenerator<any, void, unknown> {
    request.stream = true
    const response = await this.createChatCompletion(request)
    
    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }
            try {
              const parsed = JSON.parse(data)
              yield parsed
            } catch (e) {
              console.error('Failed to parse SSE data:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // RAG Methods
  async ragSearch(query: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/rag/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, ...options })
    })
    
    if (!response.ok) {
      throw new Error(`RAG search failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  async ragSimple(query: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/rag/simple`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query })
    })
    
    if (!response.ok) {
      throw new Error(`RAG simple search failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Media Methods
  async addMedia(url: string, metadata?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/media/add`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ url, ...metadata })
    })
    
    if (!response.ok) {
      throw new Error(`Media add failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  async ingestWebContent(url: string, options?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/media/ingest-web-content`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ url, ...options })
    })
    
    if (!response.ok) {
      throw new Error(`Web content ingestion failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Notes Methods
  async createNote(content: string, metadata?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/notes/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ content, ...metadata })
    })
    
    if (!response.ok) {
      throw new Error(`Note creation failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  async searchNotes(query: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/notes/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query })
    })
    
    if (!response.ok) {
      throw new Error(`Notes search failed: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Prompts Methods
  async getPrompts(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/prompts/`, {
      method: 'GET',
      headers: this.headers
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prompts: ${response.statusText}`)
    }
    
    return response.json()
  }

  async searchPrompts(query: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/prompts/search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query })
    })
    
    if (!response.ok) {
      throw new Error(`Prompts search failed: ${response.statusText}`)
    }
    
    return response.json()
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

    const headers = { ...this.headers }
    delete headers['Content-Type'] // Let browser set it for FormData

    const response = await fetch(`${this.baseUrl}/api/v1/audio/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Audio transcription failed: ${response.statusText}`)
    }
    
    return response.json()
  }
}

// Singleton instance
export const tldwClient = new TldwApiClient()