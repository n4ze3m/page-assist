import {
  type ChatHistory as ChatHistoryType,
  type Message as MessageType
} from "~/store/option"
import { getAllModelNicknames } from "./nickname"
type HistoryInfo = {
  id: string
  title: string
  is_rag: boolean
  message_source?: "copilot" | "web-ui"
  is_pinned?: boolean
  createdAt: number
  doc_id?: string
}

type WebSearch = {
  search_engine: string
  search_url: string
  search_query: string
  search_results: {
    title: string
    link: string
  }[]
}

type Message = {
  id: string
  history_id: string
  name: string
  role: string
  content: string
  images?: string[]
  sources?: string[]
  search?: WebSearch
  createdAt: number
  reasoning_time_taken?: number
  messageType?: string
  generationInfo?: any
  modelName?: string
  modelImage?: string
}
function simpleFuzzyMatch(text: string, query: string): boolean {
  if (!text || !query) {
    return false
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()

  if (lowerQuery === "") {
    return true
  }

  if (lowerText.includes(lowerQuery)) {
    return true
  }

  const queryWords = lowerQuery.split(/\s+/).filter((word) => word.length > 2)

  if (queryWords.length > 1) {
    const matchedWords = queryWords.filter((word) => lowerText.includes(word))
    return matchedWords.length >= Math.ceil(queryWords.length * 0.7)
  }

  if (lowerQuery.length > 3) {
    const maxDistance = Math.floor(lowerQuery.length * 0.3)

    const textWords = lowerText.split(/\s+/)
    return textWords.some((word) => {
      if (Math.abs(word.length - lowerQuery.length) > maxDistance) {
        return false
      }
      let matches = 0
      for (let i = 0; i < lowerQuery.length; i++) {
        if (word.includes(lowerQuery[i])) {
          matches++
        }
      }

      return matches >= lowerQuery.length - maxDistance
    })
  }

  return false
}

type Webshare = {
  id: string
  title: string
  url: string
  api_url: string
  share_id: string
  createdAt: number
}

type Prompt = {
  id: string
  title: string
  content: string
  is_system: boolean
  createdBy?: string
  createdAt: number
}

type MessageHistory = Message[]

type ChatHistory = HistoryInfo[]

type Prompts = Prompt[]

export class PageAssitDatabase {
  db: chrome.storage.StorageArea

  constructor() {
    this.db = chrome.storage.local
  }

  async getChatHistory(id: string): Promise<MessageHistory> {
    const modelNicknames = await getAllModelNicknames()
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        resolve(
          (result[id] || []).map((message: any) => {
            return {
              ...message,
              modelName:
                modelNicknames[message.name]?.model_name || message.name,
              modelImage:
                modelNicknames[message.name]?.model_avatar || undefined
            }
          })
        )
      })
    })
  }

  async getChatHistories(): Promise<ChatHistory> {
    return new Promise((resolve, reject) => {
      this.db.get("chatHistories", (result) => {
        resolve(result.chatHistories || [])
      })
    })
  }

  async getChatHistoryTitleById(id: string): Promise<string> {
    const chatHistories = await this.getChatHistories()
    const chatHistory = chatHistories.find((history) => history.id === id)
    return chatHistory?.title || ""
  }

  async addChatHistory(history: HistoryInfo) {
    const chatHistories = await this.getChatHistories()
    const newChatHistories = [history, ...chatHistories]
    this.db.set({ chatHistories: newChatHistories })
  }

  async addMessage(message: Message) {
    const history_id = message.history_id
    const chatHistory = await this.getChatHistory(history_id)
    const newChatHistory = [message, ...chatHistory]
    await this.db.set({ [history_id]: newChatHistory })
  }

  async updateMessage(history_id: string, message_id: string, content: string) {
    const chatHistory = await this.getChatHistory(history_id)
    const newChatHistory = chatHistory.map((message) => {
      if (message.id === message_id) {
        message.content = content
      }
      return message
    })
    this.db.set({ [history_id]: newChatHistory })
  }

  async removeChatHistory(id: string) {
    const chatHistories = await this.getChatHistories()
    const newChatHistories = chatHistories.filter(
      (history) => history.id !== id
    )
    this.db.set({ chatHistories: newChatHistories })
  }

  async removeMessage(history_id: string, message_id: string) {
    const chatHistory = await this.getChatHistory(history_id)
    const newChatHistory = chatHistory.filter(
      (message) => message.id !== message_id
    )
    this.db.set({ [history_id]: newChatHistory })
  }

  async clear() {
    this.db.clear()
  }

  async deleteChatHistory(id: string) {
    const chatHistories = await this.getChatHistories()
    const newChatHistories = chatHistories.filter(
      (history) => history.id !== id
    )
    this.db.set({ chatHistories: newChatHistories })
    this.db.remove(id)
  }

  async deleteAllChatHistory() {
    const chatHistories = await this.getChatHistories()
    chatHistories.forEach((history) => {
      this.db.remove(history.id)
    })
    this.db.set({ chatHistories: [] })
  }

  async deleteMessage(history_id: string) {
    await this.db.remove(history_id)
  }

  async getAllPrompts(): Promise<Prompts> {
    return new Promise((resolve, reject) => {
      this.db.get("prompts", (result) => {
        resolve(result.prompts || [])
      })
    })
  }

  async addPrompt(prompt: Prompt) {
    const prompts = await this.getAllPrompts()
    const newPrompts = [prompt, ...prompts]
    this.db.set({ prompts: newPrompts })
  }

  async deletePrompt(id: string) {
    const prompts = await this.getAllPrompts()
    const newPrompts = prompts.filter((prompt) => prompt.id !== id)
    this.db.set({ prompts: newPrompts })
  }

  async updatePrompt(
    id: string,
    title: string,
    content: string,
    is_system: boolean
  ) {
    const prompts = await this.getAllPrompts()
    const newPrompts = prompts.map((prompt) => {
      if (prompt.id === id) {
        prompt.title = title
        prompt.content = content
        prompt.is_system = is_system
      }
      return prompt
    })
    this.db.set({ prompts: newPrompts })
  }

  async getPromptById(id: string) {
    const prompts = await this.getAllPrompts()
    return prompts.find((prompt) => prompt.id === id)
  }

  async getWebshare(id: string) {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        resolve(result[id] || [])
      })
    })
  }

  async getAllWebshares(): Promise<Webshare[]> {
    return new Promise((resolve, reject) => {
      this.db.get("webshares", (result) => {
        resolve(result.webshares || [])
      })
    })
  }

  async addWebshare(webshare: Webshare) {
    const webshares = await this.getAllWebshares()
    const newWebshares = [webshare, ...webshares]
    this.db.set({ webshares: newWebshares })
  }

  async deleteWebshare(id: string) {
    const webshares = await this.getAllWebshares()
    const newWebshares = webshares.filter((webshare) => webshare.id !== id)
    this.db.set({ webshares: newWebshares })
  }

  async getUserID() {
    return new Promise((resolve, reject) => {
      this.db.get("user_id", (result) => {
        resolve(result.user_id || "")
      })
    })
  }

  async setUserID(id: string) {
    this.db.set({ user_id: id })
  }

  async searchChatHistories(query: string): Promise<ChatHistory> {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) {
      return this.getChatHistories()
    }

    const allHistories = await this.getChatHistories()
    const matchedHistories: ChatHistory = []
    const matchedHistoryIds = new Set<string>()

    for (const history of allHistories) {
      if (simpleFuzzyMatch(history.title, normalizedQuery)) {
        if (!matchedHistoryIds.has(history.id)) {
          matchedHistories.push(history)
          matchedHistoryIds.add(history.id)
        }
        continue
      }

      try {
        const messages = await this.getChatHistory(history.id)
        for (const message of messages) {
          if (
            message.content &&
            simpleFuzzyMatch(message.content, normalizedQuery)
          ) {
            if (!matchedHistoryIds.has(history.id)) {
              matchedHistories.push(history)
              matchedHistoryIds.add(history.id)
            }
            break
          }
        }
      } catch (error) {
        console.error(
          `Error fetching messages for history ${history.id}:`,
          error
        )
      }
    }

    return matchedHistories
  }
}

export const generateID = () => {
  return "pa_xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export const saveHistory = async (
  title: string,
  is_rag?: boolean,
  message_source?: "copilot" | "web-ui",
  doc_id?: string
) => {
  const id = generateID()
  const createdAt = Date.now()
  const history = { id, title, createdAt, is_rag, message_source, doc_id }
  const db = new PageAssitDatabase()
  await db.addChatHistory(history)
  return history
}

export const updateMessage = async (
  history_id: string,
  message_id: string,
  content: string
) => {
  const db = new PageAssitDatabase()
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
  time
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
}) => {
  const id = generateID()
  let createdAt = Date.now()
  if (time) {
    createdAt += time
  }
  const message = {
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
    modelImage
  }
  const db = new PageAssitDatabase()
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
      id: message.id
    }
  })
}

export const deleteByHistoryId = async (history_id: string) => {
  const db = new PageAssitDatabase()
  await db.deleteMessage(history_id)
  await db.removeChatHistory(history_id)
  return history_id
}

export const updateHistory = async (id: string, title: string) => {
  const db = new PageAssitDatabase()
  const chatHistories = await db.getChatHistories()
  const newChatHistories = chatHistories.map((history) => {
    if (history.id === id) {
      history.title = title
    }
    return history
  })
  db.db.set({ chatHistories: newChatHistories })
}

export const pinHistory = async (id: string, is_pinned: boolean) => {
  const db = new PageAssitDatabase()
  const chatHistories = await db.getChatHistories()
  const newChatHistories = chatHistories.map((history) => {
    if (history.id === id) {
      history.is_pinned = is_pinned
    }
    return history
  })
  db.db.set({ chatHistories: newChatHistories })
}

export const removeMessageUsingHistoryId = async (history_id: string) => {
  const db = new PageAssitDatabase()
  const chatHistory = await db.getChatHistory(history_id)
  chatHistory.shift()
  await db.db.set({ [history_id]: chatHistory })
}

export const getAllPrompts = async () => {
  const db = new PageAssitDatabase()
  return await db.getAllPrompts()
}

export const updateMessageByIndex = async (
  history_id: string,
  index: number,
  message: string
) => {
  try {
    const db = new PageAssitDatabase()
    const chatHistory = (await db.getChatHistory(history_id)).reverse()
    chatHistory[index].content = message
    await db.db.set({ [history_id]: chatHistory.reverse() })
  } catch (e) {
    // temp chat will break
  }
}

export const deleteChatForEdit = async (history_id: string, index: number) => {
  const db = new PageAssitDatabase()
  const chatHistory = (await db.getChatHistory(history_id)).reverse()
  const previousHistory = chatHistory.slice(0, index + 1)
  await db.db.set({ [history_id]: previousHistory.reverse() })
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
  const db = new PageAssitDatabase()
  const id = generateID()
  const createdAt = Date.now()
  const prompt = { id, title, content, is_system, createdAt }
  await db.addPrompt(prompt)
  return prompt
}

export const deletePromptById = async (id: string) => {
  const db = new PageAssitDatabase()
  await db.deletePrompt(id)
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
  const db = new PageAssitDatabase()
  await db.updatePrompt(id, title, content, is_system)
  return id
}

export const getPromptById = async (id: string) => {
  if (!id || id.trim() === "") return null
  const db = new PageAssitDatabase()
  return await db.getPromptById(id)
}

export const getAllWebshares = async () => {
  const db = new PageAssitDatabase()
  return await db.getAllWebshares()
}

export const deleteWebshare = async (id: string) => {
  const db = new PageAssitDatabase()
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
  const db = new PageAssitDatabase()
  const id = generateID()
  const createdAt = Date.now()
  const webshare = { id, title, url, share_id, createdAt, api_url }
  await db.addWebshare(webshare)
  return webshare
}

export const getUserId = async () => {
  const db = new PageAssitDatabase()
  const id = (await db.getUserID()) as string
  if (!id || id?.trim() === "") {
    const user_id = "user_xxxx-xxxx-xxx-xxxx-xxxx".replace(/[x]/g, () => {
      const r = Math.floor(Math.random() * 16)
      return r.toString(16)
    })
    db.setUserID(user_id)
    return user_id
  }
  return id
}

export const exportChatHistory = async () => {
  const db = new PageAssitDatabase()
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
  const db = new PageAssitDatabase()
  for (const { history, messages } of data) {
    await db.addChatHistory(history)
    for (const message of messages) {
      await db.addMessage(message)
    }
  }
}

export const exportPrompts = async () => {
  const db = new PageAssitDatabase()
  return await db.getAllPrompts()
}

export const importPrompts = async (prompts: Prompts) => {
  const db = new PageAssitDatabase()
  for (const prompt of prompts) {
    await db.addPrompt(prompt)
  }
}

export const getRecentChatFromCopilot = async () => {
  const db = new PageAssitDatabase()
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
  const db = new PageAssitDatabase()
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
  const db = new PageAssitDatabase()
  const title = await db.getChatHistoryTitleById(id)
  return title
}

export const getLastChatHistory = async (history_id: string) => {
  const db = new PageAssitDatabase()
  const messages = await db.getChatHistory(history_id)
  messages.sort((a, b) => a.createdAt - b.createdAt)
  const lastMessage = messages[messages.length - 1]
  return lastMessage?.role === "assistant"
    ? lastMessage
    : messages.findLast((m) => m.role === "assistant")
}

export const deleteHistoriesByDateRange = async (rangeLabel: string): Promise<string[]> => {
  const db = new PageAssitDatabase();
  const allHistories = await db.getChatHistories();
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  let historiesToDelete: HistoryInfo[] = [];
  switch (rangeLabel) {
    case 'today':
      historiesToDelete = allHistories.filter(
        (item) => !item.is_pinned && new Date(item?.createdAt) >= today
      );
      break;
    case 'yesterday':
      historiesToDelete = allHistories.filter(
        (item) =>
          !item.is_pinned &&
          new Date(item?.createdAt) >= yesterday &&
          new Date(item?.createdAt) < today
      );
      break;
    case 'last7Days':
      historiesToDelete = allHistories.filter(
        (item) =>
          !item.is_pinned &&
          new Date(item?.createdAt) >= lastWeek &&
          new Date(item?.createdAt) < yesterday
      );
      break;
    case 'older':
      historiesToDelete = allHistories.filter(
        (item) => !item.is_pinned && new Date(item?.createdAt) < lastWeek
      );
      break;
    case 'pinned':
      historiesToDelete = allHistories.filter((item) => item.is_pinned);
      break;
    default:
      return [];
  }

  const deletedIds: string[] = [];
  for (const history of historiesToDelete) {
    await db.deleteMessage(history.id);
    await db.removeChatHistory(history.id);
    deletedIds.push(history.id);
  }

  return deletedIds;
}