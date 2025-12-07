import { ChatTldw } from "./ChatTldw"
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

  const modelSettings = await getModelSettings(model)

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
    useMlock: modelSettings?.useMLock || useMlock
  }

  // Default to tldw_server chat model
  return new ChatTldw({
    model,
    temperature: payload.temperature,
    topP: payload.topP,
    maxTokens: payload.numPredict,
    streaming: true,
    reasoningEffort:
      (modelSettings?.reasoningEffort as any) || (reasoningEffort as any)
  }) as any
}
