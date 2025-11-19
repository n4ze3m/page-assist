import { tldwClient, TldwModel } from "./TldwApiClient"

export interface ModelInfo {
  id: string
  name: string
  provider: string
  type: 'chat' | 'embedding' | 'other'
  capabilities?: string[]
  contextLength?: number
  description?: string
}

export class TldwModelsService {
  private cachedModels: ModelInfo[] | null = null
  private lastFetchTime: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  /**
   * Get available models from tldw server
   * Uses cache to avoid frequent API calls
   */
  async getModels(forceRefresh: boolean = false): Promise<ModelInfo[]> {
    const now = Date.now()
    
    // Return cached models if available and not expired
    if (!forceRefresh && this.cachedModels && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      return this.cachedModels
    }

    try {
      await tldwClient.initialize()
      const models = await tldwClient.getModels()
      
      // Transform tldw models to our format
      this.cachedModels = models.map(model => this.transformModel(model))
      this.lastFetchTime = now
      
      return this.cachedModels
    } catch (error) {
      if (!import.meta.env?.DEV) {
        console.error('Failed to fetch models from tldw:', error)
      }
      
      // Return cached models if available, even if expired
      if (this.cachedModels) {
        return this.cachedModels
      }
      
      // Return empty array as fallback
      return []
    }
  }

  /**
   * Get chat models only
   */
  async getChatModels(forceRefresh: boolean = false): Promise<ModelInfo[]> {
    const models = await this.getModels(forceRefresh)
    return models.filter(m => m.type === 'chat')
  }

  /**
   * Get embedding models only
   */
  async getEmbeddingModels(forceRefresh: boolean = false): Promise<ModelInfo[]> {
    const models = await this.getModels(forceRefresh)
    return models.filter(m => m.type === 'embedding')
  }

  /**
   * Get a specific model by ID
   */
  async getModel(modelId: string): Promise<ModelInfo | null> {
    const models = await this.getModels()
    return models.find(m => m.id === modelId) || null
  }

  /**
   * Check if a model exists
   */
  async modelExists(modelId: string): Promise<boolean> {
    const model = await this.getModel(modelId)
    return model !== null
  }

  /**
   * Get models grouped by provider
   */
  async getModelsByProvider(): Promise<Map<string, ModelInfo[]>> {
    const models = await this.getModels()
    const grouped = new Map<string, ModelInfo[]>()
    
    for (const model of models) {
      const provider = model.provider
      if (!grouped.has(provider)) {
        grouped.set(provider, [])
      }
      grouped.get(provider)!.push(model)
    }
    
    return grouped
  }

  /**
   * Transform tldw model to our format
   */
  private transformModel(tldwModel: TldwModel): ModelInfo {
    // Determine model type based on name or capabilities
    let type: 'chat' | 'embedding' | 'other' = 'chat'
    
    const nameLower = tldwModel.name.toLowerCase()
    if (nameLower.includes('embed') || nameLower.includes('embedding')) {
      type = 'embedding'
    } else if (tldwModel.capabilities?.includes('embedding')) {
      type = 'embedding'
    }

    // Extract provider from model ID or name if not provided
    let provider = tldwModel.provider || 'unknown'
    if (!tldwModel.provider) {
      // Try to guess provider from model ID
      const idLower = tldwModel.id.toLowerCase()
      if (idLower.includes('gpt')) provider = 'openai'
      else if (idLower.includes('claude')) provider = 'anthropic'
      else if (idLower.includes('llama')) provider = 'meta'
      else if (idLower.includes('gemini')) provider = 'google'
      else if (idLower.includes('mistral')) provider = 'mistral'
    }

    const caps: string[] = []
    if (Array.isArray(tldwModel.capabilities)) {
      caps.push(...tldwModel.capabilities)
    }
    if (tldwModel.vision) caps.push('vision')
    if (tldwModel.function_calling) caps.push('tools')
    // Heuristic: flag some models as "fast" based on name
    if (
      nameLower.includes('mini') ||
      nameLower.includes('flash') ||
      nameLower.includes('small') ||
      nameLower.includes('haiku')
    ) {
      caps.push('fast')
    }

    return {
      id: tldwModel.id,
      name: tldwModel.name || tldwModel.id,
      provider: provider,
      type: type,
      capabilities: caps.length ? Array.from(new Set(caps)) : undefined,
      description: tldwModel.description
    }
  }

  /**
   * Clear the model cache
   */
  clearCache(): void {
    this.cachedModels = null
    this.lastFetchTime = 0
  }

  /**
   * Get provider icon/logo
   */
  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      'openai': '🤖',
      'anthropic': '🔷',
      'google': '🔍',
      'meta': '📘',
      'mistral': '🌊',
      'ollama': '🦙',
      'groq': '⚡',
      'together': '🤝',
      'unknown': '❓'
    }
    
    return icons[provider.toLowerCase()] || icons['unknown']
  }

  /**
   * Get provider display name
   */
  getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'meta': 'Meta',
      'mistral': 'Mistral',
      'ollama': 'Ollama',
      'groq': 'Groq',
      'together': 'Together AI',
      'unknown': 'Unknown'
    }
    
    return names[provider.toLowerCase()] || provider
  }
}

// Singleton instance
export const tldwModels = new TldwModelsService()
