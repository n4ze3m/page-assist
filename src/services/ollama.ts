import { Storage } from "@plasmohq/storage"
import { cleanUrl } from "~libs/clean-url"
import { chromeRunTime } from "~libs/runtime"

const storage = new Storage()

const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
const DEFAULT_ASK_FOR_MODEL_SELECTION_EVERY_TIME = true

const DEFAULT_RAG_QUESTION_PROMPT =
  "Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.   Chat History: {chat_history} Follow Up Input: {question} Standalone question:"

const DEFAUTL_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say you don't know. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.  {context}  Question: {question} Helpful answer in markdown:`

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
  let formattedUrl = ollamaURL
  if (formattedUrl.startsWith("http://localhost:")) {
    formattedUrl = formattedUrl.replace(
      "http://localhost:",
      "http://127.0.0.1:"
    )
  }
  await chromeRunTime(cleanUrl(formattedUrl))
  await storage.set("ollamaURL", cleanUrl(formattedUrl))
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
