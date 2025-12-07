import { getModelInfo, isCustomModel } from "@/db/dexie/models"
import { OAIEmbedding } from "./OAIEmbedding"
import { getOpenAIConfigById } from "@/db/dexie/openai"
import { getTldwServerURL } from "@/services/tldw-server"

type EmbeddingModel = {
    model: string
    baseUrl: string
    signal?: AbortSignal
    keepAlive?: string
}


export const pageAssistEmbeddingModel = async ({ baseUrl, model, keepAlive, signal }: EmbeddingModel) => {
    const isCustom = isCustomModel(model)
    if (isCustom) {
        const modelInfo = await getModelInfo(model)
        const providerInfo = await getOpenAIConfigById(modelInfo.provider_id)
        return new OAIEmbedding({
            modelName: modelInfo.model_id,
            model: modelInfo.model_id,
            signal,
            openAIApiKey: providerInfo.apiKey || "temp",
            configuration: {
                apiKey: providerInfo.apiKey || "temp",
                baseURL: providerInfo.baseUrl || "",
            }
        }) as any
    }

    // Default to tldw_server embeddings endpoint
    const tldwUrl = await getTldwServerURL()
    return new OAIEmbedding({
        modelName: model,
        model: model,
        signal,
        openAIApiKey: "tldw",
        configuration: {
            apiKey: "tldw",
            baseURL: `${tldwUrl}/api/v1`,
        }
    }) as any
}
