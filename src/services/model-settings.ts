import { Storage } from "@plasmohq/storage"
const storage = new Storage({
  area: "local"
})

type ModelSettings = {
  f16KV?: boolean
  frequencyPenalty?: number
  keepAlive?: string
  logitsAll?: boolean
  mirostat?: number
  mirostatEta?: number
  mirostatTau?: number
  numBatch?: number
  numCtx?: number
  numGpu?: number
  numGqa?: number
  numKeep?: number
  numPredict?: number
  numThread?: number
  penalizeNewline?: boolean
  presencePenalty?: number
  repeatLastN?: number
  repeatPenalty?: number
  ropeFrequencyBase?: number
  ropeFrequencyScale?: number
  temperature?: number
  tfsZ?: number
  topK?: number
  topP?: number
  typicalP?: number
  useMLock?: boolean
  useMMap?: boolean
  vocabOnly?: boolean
}

const keys = [
  "f16KV",
  "frequencyPenalty",
  "keepAlive",
  "logitsAll",
  "mirostat",
  "mirostatEta",
  "mirostatTau",
  "numBatch",
  "numCtx",
  "numGpu",
  "numGqa",
  "numKeep",
  "numPredict",
  "numThread",
  "penalizeNewline",
  "presencePenalty",
  "repeatLastN",
  "repeatPenalty",
  "ropeFrequencyBase",
  "ropeFrequencyScale",
  "temperature",
  "tfsZ",
  "topK",
  "topP",
  "typicalP",
  "useMLock",
  "useMMap",
  "vocabOnly"
]

export const getAllModelSettings = async () => {
  try {
    const settings: ModelSettings = {}
    for (const key of keys) {
      const value = await storage.get(key)
      settings[key] = value
      if (!value && key === "keepAlive") {
        settings[key] = "5m"
      }
    }
    return settings
  } catch (error) {
    console.error(error)
    return {}
  }
}

export const setModelSetting = async (
  key: string,
  value: string | number | boolean
) => {
  await storage.set(key, value)
}

export const getAllDefaultModelSettings = async (): Promise<ModelSettings> => {
  const settings: ModelSettings = {}
  for (const key of keys) {
    const value = await storage.get(key)
    settings[key] = value
    if (!value && key === "keepAlive") {
      settings[key] = "5m"
    }
  }
  return settings
}

export const lastUsedChatModelEnabled = async (): Promise<boolean> => {
  const isLastUsedChatModelEnabled = await storage.get<boolean | undefined>(
    "restoreLastChatModel"
  )
  return isLastUsedChatModelEnabled ?? false
}

export const setLastUsedChatModelEnabled = async (
  enabled: boolean
): Promise<void> => {
  await storage.set("restoreLastChatModel", enabled)
}

export const getLastUsedChatModel = async (
  historyId: string
): Promise<string | undefined> => {
  return await storage.get<string | undefined>(`lastUsedChatModel-${historyId}`)
}

export const setLastUsedChatModel = async (
  historyId: string,
  model: string
): Promise<void> => {
  await storage.set(`lastUsedChatModel-${historyId}`, model)
}


export const getLastUsedChatSystemPrompt = async (
  historyId: string
): Promise<{ prompt_id?: string; prompt_content?: string } | undefined> => {
  return await storage.get<{ prompt_id?: string; prompt_content?: string } | undefined>(
    `lastUsedChatSystemPrompt-${historyId}`
  )
}

export const setLastUsedChatSystemPrompt = async (
  historyId: string,
  prompt: {
    prompt_id?: string
    prompt_content?: string
  }
): Promise<void> => {
  await storage.set(`lastUsedChatSystemPrompt-${historyId}`, prompt)
}

