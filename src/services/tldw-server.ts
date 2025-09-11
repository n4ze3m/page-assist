import { Storage } from "@plasmohq/storage"
import { tldwClient, tldwModels } from "./tldw"

const storage = new Storage()

const DEFAULT_TLDW_URL = "http://localhost:8080"

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
    const models = await tldwModels.getModels()
    return models.map(model => ({
      name: `tldw:${model.id}`,
      model: `tldw:${model.id}`,
      provider: "tldw",
      nickname: model.name || model.id,
      avatar: undefined,
      modified_at: new Date().toISOString(),
      size: 0,
      digest: "",
      details: {
        provider: model.provider,
        context_length: model.context_length,
        vision: model.vision,
        function_calling: model.function_calling,
        json_output: model.json_output
      }
    }))
  } catch (e) {
    console.error("Failed to fetch tldw models:", e)
    if (returnEmpty) return []
    throw e
  }
}

export const fetchChatModels = async ({ returnEmpty = false }: { returnEmpty?: boolean }) => {
  try {
    const models = await getAllModels({ returnEmpty })
    return models
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