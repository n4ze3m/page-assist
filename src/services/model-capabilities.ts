import { cleanUrl } from "@/libs/clean-url"
import fetcher from "@/libs/fetcher"
import {
  getModelInfo,
  isCustomModel,
  isOllamaModel
} from "@/db/dexie/models"
import { getOpenAIConfigById } from "@/db/dexie/openai"
import { isThinkingCapableModel } from "@/libs/model-utils"
import { getCustomHeaders } from "@/utils/clean-headers"
import { getOllamaURL } from "./ollama"

const capabilitiesCache = new Map<string, string[]>()

const fetchOllamaModelCapabilities = async ({
  model,
  baseUrl,
  headers
}: {
  model: string
  baseUrl: string
  headers?: Record<string, string>
}): Promise<string[]> => {
  const cacheKey = `${cleanUrl(baseUrl)}::${model}`
  if (capabilitiesCache.has(cacheKey)) {
    return capabilitiesCache.get(cacheKey)
  }

  const response = await fetcher(`${cleanUrl(baseUrl)}/api/show`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify({ model })
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch model capabilities: ${response.statusText}`)
  }

  const json = await response.json()
  const capabilities: string[] = Array.isArray(json?.capabilities)
    ? json.capabilities
    : []
  capabilitiesCache.set(cacheKey, capabilities)
  return capabilities
}

/**
 * Check whether a model supports thinking/reasoning by asking Ollama's
 * `/api/show` endpoint for its capabilities. Falls back to name-based
 * detection (isThinkingCapableModel) when the model belongs to a provider
 * without a capability API or when the request fails for any reason.
 */
export const isModelThinkingCapable = async (
  model?: string | null
): Promise<boolean> => {
  if (!model) return false

  try {
    if (isCustomModel(model)) {
      if (isOllamaModel(model)) {
        const modelInfo = await getModelInfo(model)
        const providerInfo = await getOpenAIConfigById(modelInfo.provider_id)
        if (providerInfo?.baseUrl) {
          const capabilities = await fetchOllamaModelCapabilities({
            model: modelInfo.model_id,
            baseUrl: providerInfo.baseUrl,
            headers: {
              ...(providerInfo.apiKey && {
                Authorization: `Bearer ${providerInfo.apiKey}`
              }),
              ...getCustomHeaders({ headers: providerInfo?.headers || [] })
            }
          })
          // Older Ollama versions omit capabilities entirely — treat as
          // unknown rather than "no thinking"
          if (capabilities.length === 0) {
            return isThinkingCapableModel(model)
          }
          return capabilities.includes("thinking")
        }
      }
      // OpenAI-compatible providers expose no capability API
      return isThinkingCapableModel(model)
    }

    const baseUrl = await getOllamaURL()
    const capabilities = await fetchOllamaModelCapabilities({ model, baseUrl })
    if (capabilities.length === 0) {
      return isThinkingCapableModel(model)
    }
    return capabilities.includes("thinking")
  } catch (e) {
    console.error(
      "Failed to fetch model capabilities, falling back to name-based detection:",
      e
    )
    return isThinkingCapableModel(model)
  }
}
