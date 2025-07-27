import { cleanUrl } from "@/libs/clean-url"
import { deleteAllModelsByProviderId } from "./models"
import { OpenAIModelConfig } from "./dexie/types"

export const generateID = () => {
  return "openai-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export class OpenAIModelDb {
  db: chrome.storage.StorageArea

  constructor() {
    this.db = chrome.storage.local
  }

  getAll = async (): Promise<OpenAIModelConfig[]> => {
    return new Promise((resolve, reject) => {
      this.db.get(null, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          const data = Object.keys(result).map((key) => result[key])
          resolve(data)
        }
      })
    })
  }

  create = async (config: OpenAIModelConfig): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.set({ [config.id]: config }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  getById = async (id: string): Promise<OpenAIModelConfig> => {
    return new Promise((resolve, reject) => {
      this.db.get(id, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result[id])
        }
      })
    })
  }

  update = async (config: OpenAIModelConfig): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.set({ [config.id]: config }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  delete = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.remove(id, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }
}

export const addOpenAICofigFB = async (config: OpenAIModelConfig) => {
  try {
    const openaiDb = new OpenAIModelDb()
    await openaiDb.create(config)
    return config.id
  } catch (e) {
    console.error("Error adding OpenAI config:", e)
  }
}

export const getAllOpenAIConfig = async () => {
  const openaiDb = new OpenAIModelDb()
  const configs = await openaiDb.getAll()
  return configs.filter((config) => config?.db_type === "openai")
}

export const getAllOpenAIConfigFB = async () => await getAllOpenAIConfig()

export const updateOpenAIConfigFB = async (config: OpenAIModelConfig) => {
  const openaiDb = new OpenAIModelDb()
  await openaiDb.update(config)
  return config
}

export const deleteOpenAIConfigFB = async (id: string) => {
  const openaiDb = new OpenAIModelDb()
  await openaiDb.delete(id)
  await deleteAllModelsByProviderId(id)
}

export const bulkAddOAIFB = async (configs: OpenAIModelConfig[]) => {
  const openaiDb = new OpenAIModelDb()

  const oaiToDelete = await getAllOpenAIConfigFB()

  for (const config of oaiToDelete) {
    await openaiDb.delete(config.id)
  }

  for (const config of configs) {
    await openaiDb.create(config)
  }
}

export const updateOpenAIConfigApiKeyFB = async (config: OpenAIModelConfig) => {
  const openaiDb = new OpenAIModelDb()
  await openaiDb.update(config)
}

export const getOpenAIConfigById = async (id: string) => {
  const openaiDb = new OpenAIModelDb()
  const config = await openaiDb.getById(id)
  return config
}

export const getOpenAIConfigByIdFB = async (id: string) =>
  getOpenAIConfigById(id)
