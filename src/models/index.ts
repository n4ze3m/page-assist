import { getModelInfo, isCustomModel } from "@/db/models"
import { ChatChromeAI } from "./ChatChromeAi"
import { ChatOllama } from "./ChatOllama"
import { getOpenAIConfigById } from "@/db/openai"
import { ChatOpenAI } from "@langchain/openai"

export const pageAssistModel = async ({
  model,
  baseUrl,
  keepAlive,
  temperature,
  topK,
  topP,
  numCtx,
  seed,
  numGpu
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

    return new ChatOpenAI({
      modelName: modelInfo.model_id,
      openAIApiKey: providerInfo.apiKey || "temp",
      temperature,
      topP,
      configuration: {
        apiKey: providerInfo.apiKey || "temp",
        baseURL: providerInfo.baseUrl || "",
      }
    }) as any
  }



  return new ChatOllama({
    baseUrl,
    keepAlive,
    temperature,
    topK,
    topP,
    numCtx,
    seed,
    model,
    numGpu
  })



}
