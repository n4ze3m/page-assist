import { getModelInfo, isCustomModel, isOllamaModel } from "@/db/models"
import { ChatChromeAI } from "./ChatChromeAi"
import { ChatOllama } from "./ChatOllama"
import { getOpenAIConfigById } from "@/db/openai"
import { ChatOpenAI } from "@langchain/openai"
import { urlRewriteRuntime } from "@/libs/runtime"
import { ChatGoogleAI } from "./ChatGoogleAI"

export const pageAssistModel = async ({
  model,
  baseUrl,
  keepAlive,
  temperature,
  topK,
  topP,
  numCtx,
  seed,
  numGpu,
  numPredict,
  useMMap,
  minP,
  repeatLastN,
  repeatPenalty,
  tfsZ,
  numKeep,
  numThread,
  useMlock,
}: {
  model: string
  baseUrl: string
  keepAlive?: string
  temperature?: number
  topK?: number
  topP?: number
  numCtx?: number
  seed?: number
  numGpu?: number
  numPredict?: number
  useMMap?: boolean
  minP?: number
  repeatPenalty?: number
  repeatLastN?: number
  tfsZ?: number,
  numKeep?: number,
  numThread?: number,
  useMlock?: boolean,
}) => {
  if (model === "chrome::gemini-nano::page-assist") {
    return new ChatChromeAI({
      temperature,
      topK
    })
  }

  const isCustom = isCustomModel(model)

  if (isCustom) {
    const modelInfo = await getModelInfo(model)
    const providerInfo = await getOpenAIConfigById(modelInfo.provider_id)

    if (isOllamaModel(model)) {
      await urlRewriteRuntime(providerInfo.baseUrl || "")
    }

    if (providerInfo.provider === "gemini") {
      return new ChatGoogleAI({
        modelName: modelInfo.model_id,
        openAIApiKey: providerInfo.apiKey || "temp",
        temperature,
        topP,
        maxTokens: numPredict,
        configuration: {
          apiKey: providerInfo.apiKey || "temp",
          baseURL: providerInfo.baseUrl || ""
        }
      }) as any
    }

    return new ChatOpenAI({
      modelName: modelInfo.model_id,
      openAIApiKey: providerInfo.apiKey || "temp",
      temperature,
      topP,
      maxTokens: numPredict,
      configuration: {
        apiKey: providerInfo.apiKey || "temp",
        baseURL: providerInfo.baseUrl || ""
      }
    }) as any
  }
  console.log('useMlock', useMlock)
  return new ChatOllama({
    baseUrl,
    keepAlive,
    temperature,
    topK,
    topP,
    numCtx,
    seed,
    model,
    numGpu,
    numPredict,
    useMMap,
    minP: minP,
    repeatPenalty: repeatPenalty,
    repeatLastN: repeatLastN,
    tfsZ,
    numKeep,
    numThread,
    useMlock
  })
}
