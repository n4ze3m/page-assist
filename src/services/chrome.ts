import { Storage } from "@plasmohq/storage"

const storage = new Storage()

const DEFAULT_CHROME_AI_MODEL = {
  name: "Gemini Nano",
  model: "chrome::gemini-nano::page-assist",
  modified_at: "",
  provider: "chrome",
  size: 0,
  digest: "",
  details: {
    parent_model: "",
    format: "",
    family: "",
    families: [],
    parameter_size: "",
    quantization_level: ""
  }
}

export const getChromeAIStatus = async (): Promise<boolean> => {
  const aiStatus = await storage.get<boolean | undefined>("chromeAIStatus")
  return aiStatus ?? false
}

export const setChromeAIStatus = async (status: boolean): Promise<void> => {
  await storage.set("chromeAIStatus", status)
}

export const getChromeAIModel = async () => {
  const isEnable = await getChromeAIStatus()
  if (isEnable) {
    return [DEFAULT_CHROME_AI_MODEL]
  } else {
    return []
  }
}
