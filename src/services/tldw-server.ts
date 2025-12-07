import { Storage } from "@plasmohq/storage"
import { tldwClient, tldwModels } from "./tldw"
import { bgRequest } from "@/services/background-proxy"

const storage = new Storage()

// Default local tldw_server endpoint
const DEFAULT_TLDW_URL = "http://127.0.0.1:8000"

// Default API key for single-user/demo setups.
// This is intended for self-hosted environments and should be replaced
// or overridden in production deployments.
export const DEFAULT_TLDW_API_KEY = "THIS-IS-A-SECURE-KEY-123-REPLACE-ME"

/**
 * Read any previously stored tldw server URL from extension storage,
 * without falling back to the hard-coded default.
 *
 * This is used by connection bootstrap code to distinguish a true
 * first-run (no URL configured anywhere) from a misconfigured server.
 */
export const getStoredTldwServerURL = async (): Promise<string | null> => {
  try {
    const url = await storage.get("tldwServerUrl")
    if (typeof url === "string") {
      const trimmed = url.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
  } catch {
    // Ignore storage read failures; caller will treat as "no URL".
  }
  return null
}

export const getTldwServerURL = async () => {
  const config = await tldwClient.getConfig()
  if (config?.serverUrl) {
    return config.serverUrl
  }
  // Fallback to stored URL or default
  const stored = await getStoredTldwServerURL()
  return stored || DEFAULT_TLDW_URL
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
    // Use the richer tldwModels API (backed by /api/v1/llm/models/metadata)
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

    // Only tldw_server models are exposed as chat models
    const combined = [...tldw]

    if (import.meta.env?.DEV) {
      console.debug("tldw_server: fetchChatModels resolved", {
        tldwCount: tldw.length,
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

// Compatibility aliases
export const getOllamaURL = getTldwServerURL
export const setOllamaURL = setTldwServerURL
export const isOllamaRunning = isTldwServerRunning

// ─────────────────────────────────────────────────────────────────────────────
// Settings formerly in ollama.ts - now consolidated here
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SHARE_URL = "https://pageassist.xyz"

const DEFAULT_RAG_QUESTION_PROMPT =
  "Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.   Chat History: {chat_history} Follow Up Input: {question} Standalone question:"

const DEFAULT_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say you don't know. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.  {context}  Question: {question} Helpful answer:`

const DEFAULT_WEBSEARCH_PROMPT = `You are an AI model who is expert at searching the web and answering user's queries.

Generate a response that is informative and relevant to the user's query based on provided search results. the current date and time are {current_date_time}.

\`search-results\` block provides knowledge from the web search results. You can use this information to generate a meaningful response.

<search-results>
 {search_results}
</search-results>
`

const DEFAULT_WEBSEARCH_FOLLOWUP_PROMPT = `You will rephrase follow-up questions into concise, standalone search queries optimized for internet search engines. Transform conversational questions into keyword-focused search terms by removing unnecessary words, question formats, and context dependencies while preserving the core information need.

ONLY RETURN QUERY WITHOUT ANY TEXT

Examples:
Follow-up question: What are the symptoms of a heart attack?
heart attack symptoms

Follow-up question: Where is the upcoming Olympics being held?
upcoming Olympics

Follow-up question: Taylor Swift's latest album?
Taylor Swift latest album ${new Date().getFullYear()}

Follow-up question: How does photosynthesis work in plants?
photosynthesis process plants

Follow-up question: What's the current stock price of Apple?
Apple stock price today

Previous Conversation:
{chat_history}

Follow-up question: {question}
`

export const getPageShareUrl = async () => {
  const pageShareUrl = await storage.get("pageShareUrl")
  if (!pageShareUrl || (pageShareUrl as string).length === 0) {
    return DEFAULT_PAGE_SHARE_URL
  }
  return pageShareUrl as string
}

export const setPageShareUrl = async (pageShareUrl: string) => {
  await storage.set("pageShareUrl", pageShareUrl)
}

export const systemPromptForNonRag = async () => {
  const prompt = await storage.get("systemPromptForNonRag")
  return prompt as string | undefined
}

export const setSystemPromptForNonRag = async (prompt: string) => {
  await storage.set("systemPromptForNonRag", prompt)
}

export const systemPromptForNonRagOption = async () => {
  const prompt = await storage.get("systemPromptForNonRagOption")
  return prompt as string | undefined
}

export const setSystemPromptForNonRagOption = async (prompt: string) => {
  await storage.set("systemPromptForNonRagOption", prompt)
}

export const promptForRag = async () => {
  const prompt = await storage.get("systemPromptForRag")
  const questionPrompt = await storage.get("questionPromptForRag")

  let ragPrompt = prompt as string | undefined
  let ragQuestionPrompt = questionPrompt as string | undefined

  if (!ragPrompt || ragPrompt.length === 0) {
    ragPrompt = DEFAULT_RAG_SYSTEM_PROMPT
  }

  if (!ragQuestionPrompt || ragQuestionPrompt.length === 0) {
    ragQuestionPrompt = DEFAULT_RAG_QUESTION_PROMPT
  }

  return {
    ragPrompt,
    ragQuestionPrompt
  }
}

export const setPromptForRag = async (
  prompt: string,
  questionPrompt: string
) => {
  await storage.set("systemPromptForRag", prompt)
  await storage.set("questionPromptForRag", questionPrompt)
}

export const getWebSearchPrompt = async () => {
  const prompt = await storage.get("webSearchPrompt")
  if (!prompt || (prompt as string).length === 0) {
    return DEFAULT_WEBSEARCH_PROMPT
  }
  return prompt as string
}

export const setWebSearchPrompt = async (prompt: string) => {
  await storage.set("webSearchPrompt", prompt)
}

export const geWebSearchFollowUpPrompt = async () => {
  const prompt = await storage.get("webSearchFollowUpPrompt")
  if (!prompt || (prompt as string).length === 0) {
    return DEFAULT_WEBSEARCH_FOLLOWUP_PROMPT
  }
  return prompt as string
}

export const setWebSearchFollowUpPrompt = async (prompt: string) => {
  await storage.set("webSearchFollowUpPrompt", prompt)
}

export const setWebPrompts = async (prompt: string, followUpPrompt: string) => {
  await setWebSearchPrompt(prompt)
  await setWebSearchFollowUpPrompt(followUpPrompt)
}

export const defaultEmbeddingModelForRag = async () => {
  const embeddingMode = await storage.get("defaultEmbeddingModel")
  if (embeddingMode && typeof embeddingMode === "string" && embeddingMode.length > 0) {
    return embeddingMode
  }

  // Fallback: derive from tldw_server embeddings providers-config
  try {
    // @ts-ignore - method may be defined on TldwApiClient instance
    const cfg = await tldwClient.getEmbeddingProvidersConfig?.()

    const provider = cfg?.default_provider
    const model = cfg?.default_model

    if (provider && model) {
      const id = `${provider}/${model}`
      await storage.set("defaultEmbeddingModel", id)
      return id
    }
  } catch (e) {
    if (import.meta.env?.DEV) {
      console.warn("tldw_server: unable to resolve default embedding model from providers-config", e)
    }
  }

  return null
}

export const setDefaultEmbeddingModelForRag = async (model: string) => {
  await storage.set("defaultEmbeddingModel", model)
}

export const defaultEmbeddingChunkSize = async () => {
  const embeddingChunkSize = await storage.get("defaultEmbeddingChunkSize")
  if (!embeddingChunkSize || (embeddingChunkSize as string).length === 0) {
    return 1000
  }
  return parseInt(embeddingChunkSize as string)
}

export const setDefaultEmbeddingChunkSize = async (size: number) => {
  await storage.set("defaultEmbeddingChunkSize", size.toString())
}

export const defaultEmbeddingChunkOverlap = async () => {
  const embeddingChunkOverlap = await storage.get("defaultEmbeddingChunkOverlap")
  if (!embeddingChunkOverlap || (embeddingChunkOverlap as string).length === 0) {
    return 200
  }
  return parseInt(embeddingChunkOverlap as string)
}

export const setDefaultEmbeddingChunkOverlap = async (overlap: number) => {
  await storage.set("defaultEmbeddingChunkOverlap", overlap.toString())
}

export const defaultSplittingStrategy = async () => {
  const splittingStrategy = await storage.get("defaultSplittingStrategy")
  if (!splittingStrategy || (splittingStrategy as string).length === 0) {
    return "RecursiveCharacterTextSplitter"
  }
  return splittingStrategy as string
}

export const setDefaultSplittingStrategy = async (strategy: string) => {
  await storage.set("defaultSplittingStrategy", strategy)
}

export const defaultSplittingSeparator = async () => {
  const splittingSeparator = await storage.get("defaultSplittingSeparator")
  if (!splittingSeparator || (splittingSeparator as string).length === 0) {
    return "\\n\\n"
  }
  return splittingSeparator as string
}

export const setDefaultSplittingSeparator = async (separator: string) => {
  await storage.set("defaultSplittingSeparator", separator)
}

export const saveForRag = async (
  model: string,
  chunkSize: number,
  overlap: number,
  totalFilePerKB: number,
  noOfRetrievedDocs?: number,
  strategy?: string,
  separator?: string
) => {
  const { setTotalFilePerKB, setNoOfRetrievedDocs } = await import("./app")
  await setDefaultEmbeddingModelForRag(model)
  await setDefaultEmbeddingChunkSize(chunkSize)
  await setDefaultEmbeddingChunkOverlap(overlap)
  await setTotalFilePerKB(totalFilePerKB)
  if (noOfRetrievedDocs) {
    await setNoOfRetrievedDocs(noOfRetrievedDocs)
  }
  if (strategy) {
    await setDefaultSplittingStrategy(strategy)
  }
  if (separator) {
    await setDefaultSplittingSeparator(separator)
  }
}

export const sendWhenEnter = async () => {
  const sendWhenEnterVal = await storage.get("sendWhenEnter")
  if (!sendWhenEnterVal || (sendWhenEnterVal as string).length === 0) {
    return true
  }
  return sendWhenEnterVal === "true"
}

export const setSendWhenEnter = async (sendWhenEnterVal: boolean) => {
  await storage.set("sendWhenEnter", sendWhenEnterVal.toString())
}

export const getSelectedModel = async (): Promise<string | null> => {
  const model = await storage.get("selectedModel")
  return model as string | null
}

export const setSelectedModel = async (model: string) => {
  await storage.set("selectedModel", model)
}

export const getEmbeddingModels = async () => {
  try {
    const models = await tldwModels.getModels(false)
    // Filter for embedding-capable models if available
    const embeddingModels = models.filter(m =>
      m.capabilities?.includes('embeddings') ||
      m.id.toLowerCase().includes('embed')
    )
    return embeddingModels.map(m => ({
      name: m.name || m.id,
      model: m.id,
      provider: m.provider,
      nickname: m.name || m.id,
      avatar: undefined as string | undefined
    }))
  } catch (e) {
    console.error("Failed to fetch embedding models:", e)
    return []
  }
}
