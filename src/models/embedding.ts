import { getModelInfo, isCustomModel, isOllamaModel } from "@/db/models"
import { OllamaEmbeddingsPageAssist } from "./OllamaEmbedding"
import { OAIEmbedding } from "./OAIEmbedding"
import { getOpenAIConfigById } from "@/db/openai"

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

    return new OllamaEmbeddingsPageAssist({
        model,
        baseUrl,
        keepAlive,
        signal
    })
}