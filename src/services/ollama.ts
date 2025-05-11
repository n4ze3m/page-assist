import { Storage } from "@plasmohq/storage"
import { cleanUrl } from "../libs/clean-url"
import { urlRewriteRuntime } from "../libs/runtime"
import { getChromeAIModel } from "./chrome"
import {
  getOllamaEnabled,
  setNoOfRetrievedDocs,
  setTotalFilePerKB
} from "./app"
import fetcher from "@/libs/fetcher"
import { ollamaFormatAllCustomModels } from "@/db/models"
import { getAllModelNicknames } from "@/db/nickname"

const storage = new Storage()
const storage2 = new Storage({
  area: "local"
})

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
const DEFAULT_ASK_FOR_MODEL_SELECTION_EVERY_TIME = true
const DEFAULT_PAGE_SHARE_URL = "https://pageassist.xyz"

const DEFAULT_RAG_QUESTION_PROMPT =
  "Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.   Chat History: {chat_history} Follow Up Input: {question} Standalone question:"

const DEFAUTL_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say you don't know. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.  {context}  Question: {question} Helpful answer:`

const DEFAULT_WEBSEARCH_PROMPT = `You are an AI model who is expert at searching the web and answering user's queries.

Generate a response that is informative and relevant to the user's query based on provided search results. the current date and time are {current_date_time}.

\`search-results\` block provides knowledge from the web search results. You can use this information to generate a meaningful response.

<search-results>
 {search_results}
</search-results>
`

const DEFAULT_WEBSEARCH_FOLLOWUP_PROMPT = `You are an expert search query optimizer. Your task is to transform follow-up questions into standalone, search-optimized queries that will yield the most relevant results when used to search the internet.

Guidelines for creating optimal search queries:
- Remove unnecessary words like "what is", "how to", "can you tell me about"
- Focus on specific keywords and key concepts
- Include important qualifiers and specifications
- Avoid pronouns that refer to previous conversation
- Format for direct information retrieval
- For recent information, include relevant time indicators

Examples:

Follow-up question: What are the symptoms of a heart attack?
heart attack symptoms common warning signs

Follow-up question: Where is the upcoming Olympics being held?
next Olympic Games host city location date

Follow-up question: Can you tell me about Taylor Swift's latest album?
Taylor Swift newest album release date tracks

Follow-up question: How does it compare to her previous work?
Taylor Swift latest album comparison previous albums critical reception

Previous Conversation:
{chat_history}

Follow-up question: {question}

Optimized search query (output ONLY the query itself on one line – no explanations, no code-blocks, no extra text):
`


export const getOllamaURL = async () => {
  const ollamaURL = await storage.get("ollamaURL")
  if (!ollamaURL || ollamaURL.length === 0) {
    await urlRewriteRuntime(DEFAULT_OLLAMA_URL)
    return DEFAULT_OLLAMA_URL
  }
  await urlRewriteRuntime(cleanUrl(ollamaURL))
  return ollamaURL
}

export const askForModelSelectionEveryTime = async () => {
  const askForModelSelectionEveryTime = await storage.get(
    "askForModelSelectionEveryTime"
  )
  if (
    !askForModelSelectionEveryTime ||
    askForModelSelectionEveryTime.length === 0
  )
    return DEFAULT_ASK_FOR_MODEL_SELECTION_EVERY_TIME
  return askForModelSelectionEveryTime
}

export const defaultModel = async () => {
  const defaultModel = await storage.get("defaultModel")
  return defaultModel
}

export const isOllamaRunning = async () => {
  try {
    const baseUrl = await getOllamaURL()
    const response = await fetcher(`${cleanUrl(baseUrl)}`)
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

export const getAllModels = async ({
  returnEmpty = false
}: {
  returnEmpty?: boolean
}) => {
  try {
    const modelNicknames = await getAllModelNicknames()
    const isEnabled = await getOllamaEnabled()

    if (!isEnabled) {
      return []
    }

    const baseUrl = await getOllamaURL()
    const response = await fetcher(`${cleanUrl(baseUrl)}/api/tags`)
    if (!response.ok) {
      if (returnEmpty) {
        return []
      }
      throw new Error(response.statusText)
    }
    const json = await response.json()

    return json.models.map((model: any) => {
      return {
        ...model,
        nickname: modelNicknames[model.name]?.model_name || model.name,
        avatar: modelNicknames[model.name]?.model_avatar || undefined
      }
    }) as {
      name: string
      model: string
      modified_at: string
      size: number
      digest: string
      nickname?: string
      avatar?: string
      details: {
        parent_model: string
        format: string
        family: string
        families: string[]
        parameter_size: string
        quantization_level: string
      }
    }[]
  } catch (e) {
    console.error(e)
    return []
  }
}

export const getSelectedModel = async () => {
  const selectedModel = await storage.get("selectedModel")
  return selectedModel
}

export const getEmbeddingModels = async ({
  returnEmpty
}: {
  returnEmpty?: boolean
}) => {
  try {
    const ollamaModels = await getAllModels({ returnEmpty })
    const customModels = await ollamaFormatAllCustomModels("embedding")

    return [

      ...ollamaModels.map((model) => {
        return {
          ...model,
          provider: "ollama"
        }
      }),
      ...customModels
    ]
  } catch (e) {
    console.error(e)
    return []
  }
}

export const deleteModel = async (model: string) => {
  const baseUrl = await getOllamaURL()
  const response = await fetcher(`${cleanUrl(baseUrl)}/api/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: model })
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }
  return "ok"
}

export const fetchChatModels = async ({
  returnEmpty = false
}: {
  returnEmpty?: boolean
}) => {
  try {
    const models = await getAllModels({ returnEmpty })

    const chatModels = models
      ?.filter((model) => {
        return (
          !model?.details?.families?.includes("bert") &&
          !model?.details?.families?.includes("nomic-bert")
        )
      })
      .map((model) => {
        return {
          ...model,
          provider: "ollama"
        }
      })
    const chromeModel = await getChromeAIModel()

    const customModels = await ollamaFormatAllCustomModels("chat")

    return [...chatModels, ...chromeModel, ...customModels]
  } catch (e) {
    console.error(e)
    const allModels = await getAllModels({ returnEmpty })
    const models = allModels.map((model) => {
      return {
        ...model,
        provider: "ollama"
      }
    })
    const chromeModel = await getChromeAIModel()
    const customModels = await ollamaFormatAllCustomModels("chat")
    return [...models, ...chromeModel, ...customModels]
  }
}

export const setOllamaURL = async (ollamaURL: string) => {
  let formattedUrl = ollamaURL
  if (formattedUrl.startsWith("http://localhost:")) {
    formattedUrl = formattedUrl.replace(
      "http://localhost:",
      "http://127.0.0.1:"
    )
  }
  await storage.set("ollamaURL", cleanUrl(formattedUrl))
  await urlRewriteRuntime(cleanUrl(formattedUrl))
}

export const systemPromptForNonRag = async () => {
  const prompt = await storage.get("systemPromptForNonRag")
  return prompt
}

export const promptForRag = async () => {
  const prompt = await storage.get("systemPromptForRag")
  const questionPrompt = await storage.get("questionPromptForRag")

  let ragPrompt = prompt
  let ragQuestionPrompt = questionPrompt

  if (!ragPrompt || ragPrompt.length === 0) {
    ragPrompt = DEFAUTL_RAG_SYSTEM_PROMPT
  }

  if (!ragQuestionPrompt || ragQuestionPrompt.length === 0) {
    ragQuestionPrompt = DEFAULT_RAG_QUESTION_PROMPT
  }

  return {
    ragPrompt,
    ragQuestionPrompt
  }
}

export const setSystemPromptForNonRag = async (prompt: string) => {
  await storage.set("systemPromptForNonRag", prompt)
}

export const setPromptForRag = async (
  prompt: string,
  questionPrompt: string
) => {
  await storage.set("systemPromptForRag", prompt)
  await storage.set("questionPromptForRag", questionPrompt)
}

export const systemPromptForNonRagOption = async () => {
  const prompt = await storage.get("systemPromptForNonRagOption")
  return prompt
}

export const setSystemPromptForNonRagOption = async (prompt: string) => {
  await storage.set("systemPromptForNonRagOption", prompt)
}

export const sendWhenEnter = async () => {
  const sendWhenEnter = await storage.get("sendWhenEnter")
  if (!sendWhenEnter || sendWhenEnter.length === 0) {
    return true
  }
  return sendWhenEnter === "true"
}

export const setSendWhenEnter = async (sendWhenEnter: boolean) => {
  await storage.set("sendWhenEnter", sendWhenEnter.toString())
}

export const defaultEmbeddingModelForRag = async () => {
  const embeddingMode = await storage.get("defaultEmbeddingModel")
  if (!embeddingMode || embeddingMode.length === 0) {
    return null
  }
  return embeddingMode
}

export const defaultEmbeddingChunkSize = async () => {
  const embeddingChunkSize = await storage.get("defaultEmbeddingChunkSize")
  if (!embeddingChunkSize || embeddingChunkSize.length === 0) {
    return 1000
  }
  return parseInt(embeddingChunkSize)
}

export const defaultSplittingStrategy = async () => {
  const splittingStrategy = await storage.get("defaultSplittingStrategy")
  if (!splittingStrategy || splittingStrategy.length === 0) {
    return "RecursiveCharacterTextSplitter"
  }
  return splittingStrategy
}

export const defaultSsplttingSeparator = async () => {
  const splittingSeparator = await storage.get("defaultSplittingSeparator")
  if (!splittingSeparator || splittingSeparator.length === 0) {
    return "\\n\\n"
  }
  return splittingSeparator
}

export const defaultEmbeddingChunkOverlap = async () => {
  const embeddingChunkOverlap = await storage.get(
    "defaultEmbeddingChunkOverlap"
  )
  if (!embeddingChunkOverlap || embeddingChunkOverlap.length === 0) {
    return 200
  }
  return parseInt(embeddingChunkOverlap)
}

export const setDefaultSplittingStrategy = async (strategy: string) => {
  await storage.set("defaultSplittingStrategy", strategy)
}

export const setDefaultSplittingSeparator = async (separator: string) => {
  await storage.set("defaultSplittingSeparator", separator)
}

export const setDefaultEmbeddingModelForRag = async (model: string) => {
  await storage.set("defaultEmbeddingModel", model)
}

export const setDefaultEmbeddingChunkSize = async (size: number) => {
  await storage.set("defaultEmbeddingChunkSize", size.toString())
}

export const setDefaultEmbeddingChunkOverlap = async (overlap: number) => {
  await storage.set("defaultEmbeddingChunkOverlap", overlap.toString())
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

export const getWebSearchPrompt = async () => {
  const prompt = await storage.get("webSearchPrompt")
  if (!prompt || prompt.length === 0) {
    return DEFAULT_WEBSEARCH_PROMPT
  }
  return prompt
}

export const setWebSearchPrompt = async (prompt: string) => {
  await storage.set("webSearchPrompt", prompt)
}

export const geWebSearchFollowUpPrompt = async () => {
  const prompt = await storage.get("webSearchFollowUpPrompt")
  if (!prompt || prompt.length === 0) {
    return DEFAULT_WEBSEARCH_FOLLOWUP_PROMPT
  }
  return prompt
}

export const setWebSearchFollowUpPrompt = async (prompt: string) => {
  await storage.set("webSearchFollowUpPrompt", prompt)
}

export const setWebPrompts = async (prompt: string, followUpPrompt: string) => {
  await setWebSearchPrompt(prompt)
  await setWebSearchFollowUpPrompt(followUpPrompt)
}

export const getPageShareUrl = async () => {
  const pageShareUrl = await storage.get("pageShareUrl")
  if (!pageShareUrl || pageShareUrl.length === 0) {
    return DEFAULT_PAGE_SHARE_URL
  }
  return pageShareUrl
}

export const setPageShareUrl = async (pageShareUrl: string) => {
  await storage.set("pageShareUrl", pageShareUrl)
}

export const isOllamaEnabled = async () => {
  const ollamaStatus = await storage.get<boolean>("checkOllamaStatus")
  // if data is empty or null then return true
  if (typeof ollamaStatus === "undefined" || ollamaStatus === null) {
    return true
  }
  return ollamaStatus
}
