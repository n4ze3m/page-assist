import { Storage } from "@plasmohq/storage"
import { tldwClient, tldwModels } from "./tldw"
import { bgRequest } from "@/services/background-proxy"
import { getChromeAIModel } from "./chrome"
import { ollamaFormatAllCustomModels } from "@/db/dexie/models"

const storage = new Storage()

// Default local tldw_server endpoint
const DEFAULT_TLDW_URL = "http://127.0.0.1:8000"

// Default API key for single-user/demo setups.
// This is intended for self-hosted environments and should be replaced
// or overridden in production deployments.
export const DEFAULT_TLDW_API_KEY = "THIS-IS-A-SECURE-KEY-123-REPLACE-ME"

export const getTldwServerURL = async () => {
  const config = await tldwClient.getConfig()
  if (config?.serverUrl) {
    return config.serverUrl
  }
  // Fallback to stored URL or default
  const url = await storage.get("tldwServerUrl")
  return url || DEFAULT_TLDW_URL
}

export const setTldwServerURL = async (url: string) => {
  await storage.set("tldwServerUrl", url)
  await tldwClient.updateConfig({ serverUrl: url })
}

export const isTldwServerRunning = async () => {
  try {
    const config = await tldwClient.getConfig()
    if (!config) return false
    
    const health = await tldwClient.healthCheck()
    return health
  } catch (e) {
    console.error("tldw server not running:", e)
    return false
  }
}

export const getAllModels = async ({ returnEmpty = false }: { returnEmpty?: boolean }) => {
  try {
    // If no config, avoid network calls when returnEmpty requested
    try {
      const cfg = await tldwClient.getConfig()
      if (!cfg) {
        if (returnEmpty) return []
      }
    } catch {
      if (returnEmpty) return []
    }
    // Prefer raw list from server for the landing dropdown so models, not providers, are shown
    try {
      const raw = await bgRequest<any>({ path: '/api/v1/llm/models', method: 'GET' })
      if (Array.isArray(raw)) {
        const models = raw.map((s: any) => {
          const str = String(s)
          const parts = str.split('/')
          const provider = parts.length > 1 ? parts[0] : 'unknown'
          const name = parts.length > 1 ? parts.slice(1).join('/') : str
        
          return {
            id: str,
            name,
            provider
          }
        }) as any[]
        return models.map((model: any) => ({
          name: `tldw:${model.id}`,
          model: `tldw:${model.id}`,
          provider: String(model.provider || 'unknown').toLowerCase(),
          nickname: model.name || model.id,
          avatar: undefined,
          modified_at: new Date().toISOString(),
          size: 0,
          digest: "",
          details: {
            provider: model.provider,
            context_length: undefined,
            vision: undefined,
            function_calling: undefined,
            json_output: undefined
          }
        }))
      }
    } catch (e) {
      // In dev builds it's helpful to know why the flat models list failed.
      if (!returnEmpty && import.meta.env?.DEV) {
        console.warn("tldw_server: GET /api/v1/llm/models failed, falling back to metadata/providers", e)
      }
    }

    // Fallback to the richer tldwModels API if raw list fails
    const models = await tldwModels.getModels(true)
    return models.map(model => ({
      name: `tldw:${model.id}`,
      model: `tldw:${model.id}`,
      provider: String(model.provider || 'unknown').toLowerCase(),
      nickname: model.name || model.id,
      avatar: undefined,
      modified_at: new Date().toISOString(),
      size: 0,
      digest: "",
      details: {
        provider: model.provider,
        capabilities: model.capabilities
      }
    }))
  } catch (e) {
    if (!returnEmpty) console.error("Failed to fetch tldw models:", e)
    if (returnEmpty) return []
    throw e
  }
}

export const fetchChatModels = async ({ returnEmpty = false }: { returnEmpty?: boolean }) => {
  try {
    // Primary: tldw_server aggregated models
    const tldw = await getAllModels({ returnEmpty })

    // Also include Chrome AI and user-defined custom models (OpenAI-compatible)
    const chromeModel = await getChromeAIModel()
    const customModels = await ollamaFormatAllCustomModels("chat")

    // Normalize providers for display; keep existing fields from custom/chrome entries
    const combined = [...tldw, ...chromeModel, ...customModels]

    if (import.meta.env?.DEV) {
      console.debug("tldw_server: fetchChatModels resolved", {
        tldwCount: tldw.length,
        chromeCount: chromeModel.length,
        customCount: customModels.length,
        total: combined.length
      })
    }

    return combined
  } catch (e) {
    console.error("Failed to fetch chat models:", e)
    if (returnEmpty) return []
    throw e
  }
}

// Compatibility function for existing code
export const getOllamaURL = getTldwServerURL
export const setOllamaURL = setTldwServerURL
export const isOllamaRunning = isTldwServerRunning
