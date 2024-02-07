import {
  type ChatHistory as ChatHistoryType,
  type Message as MessageType
} from "~store/option"

type HistoryInfo = {
  id: string
  title: string
  createdAt: number
}

type Message = {
  id: string
  history_id: string
  name: string
  role: string
  content: string
  images?: string[]
  sources?: string[]
  createdAt: number
}

type MessageHistory = Message[]

type ChatHistory = HistoryInfo[]

export class PageAssitDatabase {
  db: chrome.storage.StorageArea

  constructor() {
    this.db = chrome.storage.local
  }

  async getChatHistory(id: string): Promise<MessageHistory> {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        resolve(result[id] || [])
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

  async addChatHistory(history: HistoryInfo) {
    const chatHistories = await this.getChatHistories()
    const newChatHistories = [history, ...chatHistories]
    this.db.set({ chatHistories: newChatHistories })
  }

  async addMessage(message: Message) {
    const history_id = message.history_id
    const chatHistory = await this.getChatHistory(history_id)
    const newChatHistory = [message, ...chatHistory]
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

  async deleteChatHistory() {
    const chatHistories = await this.getChatHistories()
    for (const history of chatHistories) {
      this.db.remove(history.id)
    }
    this.db.remove("chatHistories")
  }
}

const generateID = () => {
  return "pa_xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export const saveHistory = async (title: string) => {
  const id = generateID()
  const createdAt = Date.now()
  const history = { id, title, createdAt }
  const db = new PageAssitDatabase()
  await db.addChatHistory(history)
  return history
}

export const saveMessage = async (
  history_id: string,
  name: string,
  role: string,
  content: string,
  images: string[]
) => {
  const id = generateID()
  const createdAt = Date.now()
  const message = { id, history_id, name, role, content, images, createdAt }
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
      images: message.images || []
    }
  })
}
