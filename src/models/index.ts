import { getModelInfo, isCustomModel, isOllamaModel } from "@/db/dexie/models"
import { ChatChromeAI } from "./ChatChromeAi"
import { ChatOllama } from "./ChatOllama"
import { getOpenAIConfigById } from "@/db/dexie/openai"
import { urlRewriteRuntime } from "@/libs/runtime"
import { ChatGoogleAI } from "./ChatGoogleAI"
import { CustomChatOpenAI } from "./CustomChatOpenAI"
import { getCustomHeaders } from "@/utils/clean-headers"
import {
  getAllDefaultModelSettings,
  getModelSettings
} from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"

export const pageAssistModel = async ({
  model,
  baseUrl
}: {
  model: string
  baseUrl: string
}) => {
  const currentChatModelSettings = useStoreChatModelSettings.getState()
  const userDefaultModelSettings = await getAllDefaultModelSettings()

  const {
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
    reasoningEffort
  } = {
    keepAlive:
      currentChatModelSettings?.keepAlive ??
      userDefaultModelSettings?.keepAlive,
    temperature:
      currentChatModelSettings?.temperature ??
      userDefaultModelSettings?.temperature,
    topK: currentChatModelSettings?.topK ?? userDefaultModelSettings?.topK,
    topP: currentChatModelSettings?.topP ?? userDefaultModelSettings?.topP,
    numCtx:
      currentChatModelSettings?.numCtx ?? userDefaultModelSettings?.numCtx,
    seed: currentChatModelSettings?.seed,
    numGpu:
      currentChatModelSettings?.numGpu ?? userDefaultModelSettings?.numGpu,
    numPredict:
      currentChatModelSettings?.numPredict ??
      userDefaultModelSettings?.numPredict,
    useMMap:
      currentChatModelSettings?.useMMap ?? userDefaultModelSettings?.useMMap,
    minP: currentChatModelSettings?.minP ?? userDefaultModelSettings?.minP,
    repeatLastN:
      currentChatModelSettings?.repeatLastN ??
      userDefaultModelSettings?.repeatLastN,
    repeatPenalty:
      currentChatModelSettings?.repeatPenalty ??
      userDefaultModelSettings?.repeatPenalty,
    tfsZ: currentChatModelSettings?.tfsZ ?? userDefaultModelSettings?.tfsZ,
    numKeep:
      currentChatModelSettings?.numKeep ?? userDefaultModelSettings?.numKeep,
    numThread:
      currentChatModelSettings?.numThread ??
      userDefaultModelSettings?.numThread,
    useMlock:
      currentChatModelSettings?.useMlock ?? userDefaultModelSettings?.useMlock,
    reasoningEffort: currentChatModelSettings?.reasoningEffort
  }

  if (model === "chrome::gemini-nano::page-assist") {
    return new ChatChromeAI({
      temperature,
      topK
    })
  }

  const isCustom = isCustomModel(model)
  const modelSettings = await getModelSettings(model)

  if (isCustom) {
    const modelInfo = await getModelInfo(model)
    const providerInfo = await getOpenAIConfigById(modelInfo.provider_id)

    if (isOllamaModel(model)) {
      await urlRewriteRuntime(providerInfo.baseUrl || "")
    }

    if (providerInfo?.fix_cors) {
      console.log("Fixing CORS for provider:", providerInfo.provider)
      await urlRewriteRuntime(providerInfo.baseUrl || "")
    }

    const modelConfig = {
      maxTokens: modelSettings?.numPredict || numPredict,
      temperature: modelSettings?.temperature || temperature,
      topP: modelSettings?.topP || topP,
      reasoningEffort:
        modelSettings?.reasoningEffort || (reasoningEffort as any)
    }

    if (providerInfo.provider === "gemini") {
      return new ChatGoogleAI({
        modelName: modelInfo.model_id,
        openAIApiKey: providerInfo.apiKey || "temp",
        temperature: modelConfig?.temperature,
        topP: modelConfig?.topP,
        maxTokens: modelConfig?.maxTokens,
        configuration: {
          apiKey: providerInfo.apiKey || "temp",
          baseURL: providerInfo.baseUrl || "",
          defaultHeaders: getCustomHeaders({
            headers: providerInfo?.headers || []
          })
        }
      }) as any
    }

    if (providerInfo.provider === "openrouter") {
      return new CustomChatOpenAI({
        modelName: modelInfo.model_id,
        openAIApiKey: providerInfo.apiKey || "temp",
        temperature: modelConfig?.temperature,
        topP: modelConfig?.topP,
        maxTokens: modelConfig?.maxTokens,
        configuration: {
          apiKey: providerInfo.apiKey || "temp",
          baseURL: providerInfo.baseUrl || "",
          defaultHeaders: {
            "HTTP-Referer": "https://pageassist.xyz/",
            "X-Title": "Page Assist",
            ...getCustomHeaders({
              headers: providerInfo?.headers || []
            })
          }
        },
        reasoning_effort: modelConfig?.reasoningEffort as any
      }) as any
    }

    if (providerInfo.provider === "ollama2") {
      const _keepAlive = modelSettings?.keepAlive || keepAlive || ""
      const payload = {
        keepAlive: _keepAlive.length > 0 ? _keepAlive : undefined,
        temperature: modelSettings?.temperature || temperature,
        topK: modelSettings?.topK || topK,
        topP: modelSettings?.topP || topP,
        numCtx: modelSettings?.numCtx || numCtx,
        numGpu: modelSettings?.numGpu || numGpu,
        numPredict: modelSettings?.numPredict || numPredict,
        useMMap: modelSettings?.useMMap || useMMap,
        minP: modelSettings?.minP || minP,
        repeatPenalty: modelSettings?.repeatPenalty || repeatPenalty,
        repeatLastN: modelSettings?.repeatLastN || repeatLastN,
        tfsZ: modelSettings?.tfsZ || tfsZ,
        numKeep: modelSettings?.numKeep || numKeep,
        numThread: modelSettings?.numThread || numThread,
        useMlock: modelSettings?.useMLock || useMlock,
        thinking: currentChatModelSettings?.thinking || modelSettings?.thinking
      }

      return new ChatOllama({
        baseUrl: providerInfo.baseUrl,
        model: modelInfo.model_id,
        seed,
        headers: {
          ...(providerInfo.apiKey && {
            Authorization: `Bearer ${providerInfo.apiKey}`
          }),
          ...getCustomHeaders({
            headers: providerInfo?.headers || []
          })
        },
        ...payload
      })
    }

    return new CustomChatOpenAI({
      modelName: modelInfo.model_id,
      openAIApiKey: providerInfo.apiKey || "temp",
      temperature: modelConfig?.temperature,
      topP: modelConfig?.topP,
      maxTokens: modelConfig?.maxTokens,
      configuration: {
        apiKey: providerInfo.apiKey || "temp",
        baseURL: providerInfo.baseUrl || "",
        defaultHeaders: getCustomHeaders({
          headers: providerInfo?.headers || []
        })
      },
      reasoning_effort: modelConfig?.reasoningEffort as any
    }) as any
  }

  const _keepAlive = modelSettings?.keepAlive || keepAlive || ""
  const payload = {
    keepAlive: _keepAlive.length > 0 ? _keepAlive : undefined,
    temperature: modelSettings?.temperature || temperature,
    topK: modelSettings?.topK || topK,
    topP: modelSettings?.topP || topP,
    numCtx: modelSettings?.numCtx || numCtx,
    numGpu: modelSettings?.numGpu || numGpu,
    numPredict: modelSettings?.numPredict || numPredict,
    useMMap: modelSettings?.useMMap || useMMap,
    minP: modelSettings?.minP || minP,
    repeatPenalty: modelSettings?.repeatPenalty || repeatPenalty,
    repeatLastN: modelSettings?.repeatLastN || repeatLastN,
    tfsZ: modelSettings?.tfsZ || tfsZ,
    numKeep: modelSettings?.numKeep || numKeep,
    numThread: modelSettings?.numThread || numThread,
    useMlock: modelSettings?.useMLock || useMlock,
    thinking: currentChatModelSettings?.thinking || modelSettings?.thinking
  }

  return new ChatOllama({
    baseUrl,
    model,
    seed,
    ...payload
  })
}
