import {
  type ChatHistory as ChatHistoryType,
  type Message as MessageType
} from "~/store/option"
import { ChatDocuments } from "@/models/ChatTypes"
import {
  type HistoryInfo,
  type MessageHistory,
  type Message,
  type Prompts,
  type UploadedFile,
  type SessionFiles,
  type Webshare,
  Prompt,
  LastUsedModelType,
  OpenAIModelConfigs,
  ModelNicknames,
  Models
} from "./types"
import { PageAssistDatabase } from "./chat"
import { db as chatDB } from "./schema"
import {
  deletePromptByIdFB,
  getAllPromptsFB,
  getPromptByIdFB,
  savePromptFB,
  updatePromptFB
} from ".."
import { OpenAIModelDb } from "./openai"
import { ModelNickname } from "./nickname"
import { ModelDb } from "./models"

// Helper function to generate IDs (keeping the same format)
export const generateID = () => {
  return "pa_xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

// Chat History Functions
export const saveHistory = async (
  title: string,
  is_rag?: boolean,
  message_source?: "copilot" | "web-ui" | "branch",
  doc_id?: string
) => {
  const id = generateID()
  const createdAt = Date.now()
  const history: HistoryInfo = {
    id,
    title: title?.trim()?.length > 0 ? title : "Untitled Chat",
    createdAt,
    is_rag: is_rag || false,
    message_source,
    doc_id
  }
  const db = new PageAssistDatabase()
  await db.addChatHistory(history)
  return history
}
export const updateChatHistoryCreatedAt = async (history_id: string) => {
  const createdAt = Date.now()
  const db = new PageAssistDatabase()
  await db.updateChatHistoryCreatedAt(history_id, createdAt)
}

export const updateMessage = async (
  history_id: string,
  message_id: string,
  content: string
) => {
  const db = new PageAssistDatabase()
  await db.updateMessage(history_id, message_id, content)
}

export const saveMessage = async ({
  content,
  history_id,
  name,
  role,
  images,
  source,
  generationInfo,
  message_type,
  modelImage,
  modelName,
  reasoning_time_taken,
  time,
  documents
}: {
  history_id: string
  name: string
  role: string
  content: string
  images: string[]
  source?: any[]
  time?: number
  message_type?: string
  generationInfo?: any
  reasoning_time_taken?: number
  modelName?: string
  modelImage?: string
  documents?: ChatDocuments
}) => {
  const id = generateID()
  let createdAt = Date.now()
  if (time) {
    createdAt += time
  }
  const message: Message = {
    id,
    history_id,
    name,
    role,
    content,
    images,
    createdAt,
    sources: source,
    messageType: message_type,
    generationInfo: generationInfo,
    reasoning_time_taken,
    modelName,
    modelImage,
    documents
  }
  const db = new PageAssistDatabase()
  await db.addMessage(message)
  return message
}

export const formatToChatHistory = (
  messages: MessageHistory
): ChatHistoryType => {
  messages.sort((a, b) => a.createdAt - b.createdAt)
  return messages.map((message) => {
    return {
      content: message.content,
      role: message.role as "user" | "assistant" | "system",
      images: message.images
    }
  })
}

export const formatToMessage = (messages: MessageHistory): MessageType[] => {
  messages.sort((a, b) => a.createdAt - b.createdAt)
  return messages.map((message) => {
    return {
      isBot: message.role === "assistant",
      message: message.content,
      name: message.name,
      sources: message?.sources || [],
      images: message.images || [],
      generationInfo: message?.generationInfo,
      reasoning_time_taken: message?.reasoning_time_taken,
      modelName: message?.modelName,
      modelImage: message?.modelImage,
      id: message.id,
      documents: message?.documents
    }
  })
}

export const deleteByHistoryId = async (history_id: string) => {
  const db = new PageAssistDatabase()
  await db.deleteMessage(history_id)
  await db.removeChatHistory(history_id)
  return history_id
}

export const updateHistory = async (id: string, title: string) => {
  await chatDB.chatHistories.update(id, { title })
}

export const pinHistory = async (id: string, is_pinned: boolean) => {
  await chatDB.chatHistories.update(id, { is_pinned })
}

export const removeMessageUsingHistoryId = async (history_id: string) => {
  const db = new PageAssistDatabase()
  const chatHistory = await db.getChatHistory(history_id)
  if (chatHistory.length > 0) {
    const firstMessage = chatHistory.sort(
      (a, b) => b.createdAt - a.createdAt
    )[0]
    await db.removeMessage(history_id, firstMessage.id)
  }
}

export const updateMessageByIndex = async (
  history_id: string,
  index: number,
  message: string
) => {
  try {
    const db = new PageAssistDatabase()
    const chatHistory = await db.getChatHistory(history_id)
    const sortedHistory = chatHistory.sort((a, b) => a.createdAt - b.createdAt)
    if (sortedHistory[index]) {
      await db.updateMessage(history_id, sortedHistory[index].id, message)
    }
  } catch (e) {
    // temp chat will break
  }
}

export const deleteChatForEdit = async (history_id: string, index: number) => {
  const db = new PageAssistDatabase()
  const chatHistory = await db.getChatHistory(history_id)
  const sortedHistory = chatHistory.sort((a, b) => a.createdAt - b.createdAt)

  // Delete messages after the specified index
  const messagesToDelete = sortedHistory.slice(index + 1)
  for (const message of messagesToDelete) {
    await db.removeMessage(history_id, message.id)
  }
}

// Prompt Functions
export const getAllPrompts = async () => {
  try {
    const db = new PageAssistDatabase()
    return await db.getAllPrompts()
  } catch (e) {
    if (isDatabaseClosedError(e)) {
      return await getAllPromptsFB()
    }

    return []
  }
}

export const savePrompt = async ({
  content,
  title,
  is_system = false
}: {
  title: string
  content: string
  is_system: boolean
}) => {
  const db = new PageAssistDatabase()
  const id = generateID()
  const createdAt = Date.now()
  const prompt = { id, title, content, is_system, createdAt }
  await db.addPrompt(prompt)
  await savePromptFB(prompt)
  return prompt
}

export const deletePromptById = async (id: string) => {
  const db = new PageAssistDatabase()
  await db.deletePrompt(id)
  await deletePromptByIdFB(id)
  return id
}

export const updatePrompt = async ({
  content,
  id,
  title,
  is_system
}: {
  id: string
  title: string
  content: string
  is_system: boolean
}) => {
  const db = new PageAssistDatabase()
  await db.updatePrompt(id, title, content, is_system)
  await updatePromptFB({
    id,
    title,
    content,
    is_system
  })
  return id
}

export const getPromptById = async (id: string) => {
  try {
    if (!id || id.trim() === "") return null
    const db = new PageAssistDatabase()
    return await db.getPromptById(id)
  } catch (e) {
    if (isDatabaseClosedError(e)) {
      return await getPromptByIdFB(id)
    }
    return null
  }
}

// Webshare Functions
export const getAllWebshares = async () => {
  try {
    const db = new PageAssistDatabase()
    return await db.getAllWebshares()
  } catch (e) {
    return []
  }
}

export const deleteWebshare = async (id: string) => {
  const db = new PageAssistDatabase()
  await db.deleteWebshare(id)
  return id
}

export const saveWebshare = async ({
  title,
  url,
  api_url,
  share_id
}: {
  title: string
  url: string
  api_url: string
  share_id: string
}) => {
  const db = new PageAssistDatabase()
  const id = generateID()
  const createdAt = Date.now()
  const webshare: Webshare = { id, title, url, share_id, createdAt, api_url }
  await db.addWebshare(webshare)
  return webshare
}

// User Functions
export const getUserId = async () => {
  const db = new PageAssistDatabase()
  const id = await db.getUserID()
  if (!id || id?.trim() === "") {
    const user_id = "user_xxxx-xxxx-xxx-xxxx-xxxx".replace(/[x]/g, () => {
      const r = Math.floor(Math.random() * 16)
      return r.toString(16)
    })
    await db.setUserID(user_id)
    return user_id
  }
  return id
}

// Export/Import Functions
export const exportChatHistory = async () => {
  const db = new PageAssistDatabase()
  const chatHistories = await db.getChatHistories()
  const messages = await Promise.all(
    chatHistories.map(async (history) => {
      const messages = await db.getChatHistory(history.id)
      return { history, messages }
    })
  )
  return messages
}

export const importChatHistory = async (
  data: {
    history: HistoryInfo
    messages: MessageHistory
  }[]
) => {
  const db = new PageAssistDatabase()
  for (const { history, messages } of data) {
    await db.addChatHistory(history)
    for (const message of messages) {
      await db.addMessage(message)
    }
  }
}

export const exportPrompts = async () => {
  const db = new PageAssistDatabase()
  return await db.getAllPrompts()
}

export const exportOAIConfigs = async () => {
  const db = new OpenAIModelDb()
  return await db.getAll()
}

export const exportNicknames = async () => {
  const modelNickname = new ModelNickname()
  const data = await modelNickname.getAllModelNicknames()
  return data
}

export const exportModels = async () => {
  const db = new ModelDb()
  return db.getAll()
}

export const importNicknamesV2 = async (
  nicknames: ModelNicknames,
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  const db = new ModelNickname()
  await db.importDataV2(nicknames, options)
}

export const importModelsV2 = async (
  models: Models,
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  const db = new ModelDb()
  await db.importDataV2(models, options)
}

export const importPrompts = async (prompts: Prompts) => {
  const db = new PageAssistDatabase()
  for (const prompt of prompts) {
    await db.addPrompt(prompt)
  }
}

export const importOAIConfigs = async (configs: OpenAIModelConfigs) => {
  const db = new OpenAIModelDb()
  for (const config of configs) {
    await db.create(config)
  }
}

// Utility Functions
export const getRecentChatFromCopilot = async () => {
  const db = new PageAssistDatabase()
  const chatHistories = await db.getChatHistories()
  if (chatHistories.length === 0) return null
  const history = chatHistories.find(
    (history) => history.message_source === "copilot"
  )
  if (!history) return null

  const messages = await db.getChatHistory(history.id)

  return { history, messages }
}

export const getRecentChatFromWebUI = async () => {
  const db = new PageAssistDatabase()
  const chatHistories = await db.getChatHistories()
  if (chatHistories.length === 0) return null
  const history = chatHistories.find(
    (history) => history.message_source === "web-ui"
  )
  if (!history) return null

  const messages = await db.getChatHistory(history.id)

  return { history, messages }
}

export const getTitleById = async (id: string) => {
  const db = new PageAssistDatabase()
  const title = await db.getChatHistoryTitleById(id)
  return title
}

export const getLastChatHistory = async (history_id: string) => {
  const db = new PageAssistDatabase()
  const messages = await db.getChatHistory(history_id)
  messages.sort((a, b) => a.createdAt - b.createdAt)
  const lastMessage = messages[messages.length - 1]
  return lastMessage?.role === "assistant"
    ? lastMessage
    : messages.findLast((m) => m.role === "assistant")
}

export const deleteHistoriesByDateRange = async (
  rangeLabel: string
): Promise<string[]> => {
  const db = new PageAssistDatabase()
  const allHistories = await db.getChatHistories()
  const now = new Date()
  const today = new Date(now.setHours(0, 0, 0, 0))
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)
  let historiesToDelete: HistoryInfo[] = []

  switch (rangeLabel) {
    case "today":
      historiesToDelete = allHistories.filter(
        (item) => !item.is_pinned && new Date(item?.createdAt) >= today
      )
      break
    case "yesterday":
      historiesToDelete = allHistories.filter(
        (item) =>
          !item.is_pinned &&
          new Date(item?.createdAt) >= yesterday &&
          new Date(item?.createdAt) < today
      )
      break
    case "last7Days":
      historiesToDelete = allHistories.filter(
        (item) =>
          !item.is_pinned &&
          new Date(item?.createdAt) >= lastWeek &&
          new Date(item?.createdAt) < yesterday
      )
      break
    case "older":
      historiesToDelete = allHistories.filter(
        (item) => !item.is_pinned && new Date(item?.createdAt) < lastWeek
      )
      break
    case "pinned":
      historiesToDelete = allHistories.filter((item) => item.is_pinned)
      break
    default:
      return []
  }

  const deletedIds: string[] = []
  for (const history of historiesToDelete) {
    await db.deleteMessage(history.id)
    await db.removeChatHistory(history.id)
    deletedIds.push(history.id)
  }

  return deletedIds
}

// Session Files Helper Functions
export const getSessionFiles = async (
  sessionId: string
): Promise<UploadedFile[]> => {
  const db = new PageAssistDatabase()
  return await db.getSessionFiles(sessionId)
}

export const addFileToSession = async (
  sessionId: string,
  file: UploadedFile
) => {
  const db = new PageAssistDatabase()
  await db.addFileToSession(sessionId, file)
}

export const removeFileFromSession = async (
  sessionId: string,
  fileId: string
) => {
  const db = new PageAssistDatabase()
  await db.removeFileFromSession(sessionId, fileId)
}

export const updateFileInSession = async (
  sessionId: string,
  fileId: string,
  updates: Partial<UploadedFile>
) => {
  const db = new PageAssistDatabase()
  await db.updateFileInSession(sessionId, fileId, updates)
}

export const setRetrievalEnabled = async (
  sessionId: string,
  enabled: boolean
) => {
  const db = new PageAssistDatabase()
  await db.setRetrievalEnabled(sessionId, enabled)
}

export const getSessionFilesInfo = async (
  sessionId: string
): Promise<SessionFiles | null> => {
  const db = new PageAssistDatabase()
  return await db.getSessionFilesInfo(sessionId)
}

export const clearSessionFiles = async (sessionId: string) => {
  const db = new PageAssistDatabase()
  await db.clearSessionFiles(sessionId)
}
export const importChatHistoryV2 = async (
  data: any[],
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  const chatDb = new PageAssistDatabase()
  return chatDb.importChatHistoryV2(data, options)
}

export const importPromptsV2 = async (
  data: Prompt[],
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  const chatDb = new PageAssistDatabase()
  return chatDb.importPromptsV2(data, options)
}

export const importOAIConfigsV2 = async (
  data: OpenAIModelConfigs,
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  const db = new OpenAIModelDb()
  return db.importDataV2(data, options)
}

export const updateLastUsedModel = async (
  history_id: string,
  model_id: string
) => {
  const chatDb = new PageAssistDatabase()
  return chatDb.updateLastUsedModel(history_id, model_id)
}

export const updateLastUsedPrompt = async (
  history_id: string,
  usedPrompt: LastUsedModelType
) => {
  const chatDb = new PageAssistDatabase()
  return chatDb.updateLastUsedPrompt(history_id, usedPrompt)
}
