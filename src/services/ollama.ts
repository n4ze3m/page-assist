import { Storage } from "@plasmohq/storage"
import { cleanUrl } from "~libs/clean-url"
import { chromeRunTime } from "~libs/runtime"

const storage = new Storage()

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
const DEFAULT_ASK_FOR_MODEL_SELECTION_EVERY_TIME = true

export const getOllamaURL = async () => {
  const ollamaURL = await storage.get("ollamaURL")
  if (!ollamaURL || ollamaURL.length === 0) {
    await chromeRunTime(DEFAULT_OLLAMA_URL)
    return DEFAULT_OLLAMA_URL
  }
  await chromeRunTime(cleanUrl(ollamaURL))
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
    const response = await fetch(`${cleanUrl(baseUrl)}`)
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

export const fetchModels = async () => {
  try {
    const baseUrl = await getOllamaURL()
    const response = await fetch(`${cleanUrl(baseUrl)}/api/tags`)
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const json = await response.json()

    return json.models as {
      name: string
      model: string
    }[]
  } catch (e) {
    console.error(e)
    return []
  }
}

export const setOllamaURL = async (ollamaURL: string) => {
  await chromeRunTime(cleanUrl(ollamaURL))
  await storage.set("ollamaURL", cleanUrl(ollamaURL))
}

export const systemPromptForNonRag = async () => {
  const prompt = await storage.get("systemPromptForNonRag")
  return prompt
}