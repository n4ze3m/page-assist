import { cleanUrl } from "@/libs/clean-url"
import { db } from "./schema"
import { OpenAIModelConfig, OpenAIModelConfigs } from "./types"
import { deleteAllModelsByProviderId } from "./models"

export const generateID = () => {
    return "openai-xxxx-xxx-xxxx".replace(/[x]/g, () => {
        const r = Math.floor(Math.random() * 16)
        return r.toString(16)
    })
}

export class OpenAIModelDb {

    getAll = async (): Promise<OpenAIModelConfigs> => {
        return await db.openaiConfigs.orderBy('createdAt').reverse().toArray()
    }


    create = async (config: OpenAIModelConfig): Promise<void> => {
        return await db.openaiConfigs.add(config)
    }


    getById = async (id: string): Promise<OpenAIModelConfig> => {
        return await db.openaiConfigs.get(id)
    }


    update = async (config: OpenAIModelConfig): Promise<void> => {
        return await db.openaiConfigs.put(config)
    }


    delete = async (id: string): Promise<void> => {
        return await db.openaiConfigs.delete(id)
    }
    async importDataV2(data: OpenAIModelConfigs, options: {
        replaceExisting?: boolean;
        mergeData?: boolean;
    } = {}): Promise<void> {
        const { replaceExisting = false, mergeData = true } = options;

        for (const oai of data) {
            const existingKnowledge = await this.getById(oai.id);

            if (existingKnowledge && !replaceExisting) {
                if (mergeData) {
                    await this.update({
                        ...existingKnowledge,
                    });
                }
                continue;
            }

            await this.create(oai);
        }
    }
}


export const addOpenAICofig = async ({ name, baseUrl, apiKey, provider, headers, fix_cors }: { name: string, baseUrl: string, apiKey: string, provider?: string, headers?: { key: string; value: string }[], fix_cors?: boolean }) => {
    const openaiDb = new OpenAIModelDb()
    const id = generateID()
    const config: OpenAIModelConfig = {
        id,
        name,
        baseUrl: cleanUrl(baseUrl),
        apiKey,
        createdAt: Date.now(),
        db_type: "openai",
        provider,
        headers,
        fix_cors
    }
    await openaiDb.create(config)
    return id
}


export const getAllOpenAIConfig = async () => {
    const openaiDb = new OpenAIModelDb()
    const configs = await openaiDb.getAll()
    return configs.filter(config => config?.db_type === "openai")
}

export const updateOpenAIConfig = async ({ id, name, baseUrl, apiKey, headers, fix_cors }: { id: string, name: string, baseUrl: string, apiKey: string, headers?: { key: string; value: string }[], fix_cors?: boolean }) => {
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
        headers: headers || [],
        fix_cors: fix_cors
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