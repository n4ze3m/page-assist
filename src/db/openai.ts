import { cleanUrl } from "@/libs/clean-url"
import { deleteAllModelsByProviderId } from "./models"

type OpenAIModelConfig = {
    id: string
    name: string
    baseUrl: string
    apiKey?: string
    createdAt: number
    provider?: string
    db_type: string
}
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


export const addOpenAICofig = async ({ name, baseUrl, apiKey, provider }: { name: string, baseUrl: string, apiKey: string, provider?: string }) => {
    const openaiDb = new OpenAIModelDb()
    const id = generateID()
    const config: OpenAIModelConfig = {
        id,
        name,
        baseUrl: cleanUrl(baseUrl),
        apiKey,
        createdAt: Date.now(),
        db_type: "openai",
        provider
    }
    await openaiDb.create(config)
    return id
}


export const getAllOpenAIConfig = async () => {
    const openaiDb = new OpenAIModelDb()
    const configs = await openaiDb.getAll()
    return configs.filter(config => config.db_type === "openai")
}

export const updateOpenAIConfig = async ({ id, name, baseUrl, apiKey }: { id: string, name: string, baseUrl: string, apiKey: string }) => {
    const openaiDb = new OpenAIModelDb()
    const oldData = await openaiDb.getById(id)
    const config: OpenAIModelConfig = {
        ...oldData,
        id,
        name,
        baseUrl: cleanUrl(baseUrl),
        apiKey,
        createdAt: Date.now(),
        db_type: "openai",
    }

    await openaiDb.update(config)

    return config
}


export const deleteOpenAIConfig = async (id: string) => {
    const openaiDb = new OpenAIModelDb()
    await openaiDb.delete(id)
    await deleteAllModelsByProviderId(id)
}


export const updateOpenAIConfigApiKey = async (id: string, { name, baseUrl, apiKey }: { name: string, baseUrl: string, apiKey: string }) => {
    const openaiDb = new OpenAIModelDb()
    const config: OpenAIModelConfig = {
        id,
        name,
        baseUrl: cleanUrl(baseUrl),
        apiKey,
        createdAt: Date.now(),
        db_type: "openai"
    }

    await openaiDb.update(config)
}


export const getOpenAIConfigById = async (id: string) => {
    const openaiDb = new OpenAIModelDb()
    const config = await openaiDb.getById(id)
    return config
}