import { getAllModelNicknames } from "./nickname"
import { Model, Models } from "./types"
import { db } from "./schema"
import {
  createModelFB,
  deleteModelFB,
  getAllCustomModelsFB,
  getModelInfoFB
} from "../models"
import { isDatabaseClosedError } from "@/utils/ff-error"
import {
  getLLamaCppModelId,
  getLMStudioModelId,
  getLlamafileModelId,
  getVLLMModelId,
  isCustomModel,
  isLLamaCppModel,
  isLMStudioModel,
  isLlamafileModel,
  isVLLMModel,
  removeModelSuffix,
  dynamicFetchLMStudio,
  dynamicFetchLLamaCpp,
  dynamicFetchLlamafile,
  dynamicFetchVLLM
} from "@/db/model-provider-utils"

export const generateID = () => {
  return "model-xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export class ModelDb {
  getAll = async (): Promise<Models> => {
    return await db.customModels.reverse().toArray()
  }

  create = async (model: Model): Promise<void> => {
    return await db.customModels.add(model)
  }

  getById = async (id: string): Promise<Model> => {
    return await db.customModels.get(id)
  }

  update = async (model: Model): Promise<void> => {
    return await db.customModels.put(model)
  }

  delete = async (id: string): Promise<void> => {
    return await db.customModels.delete(id)
  }

  deleteAll = async (): Promise<void> => {
    return await db.customModels.clear()
  }

  async importDataV2(
    data: Models,
    options: {
      replaceExisting?: boolean
      mergeData?: boolean
    } = {}
  ): Promise<void> {
    const { replaceExisting = false, mergeData = true } = options

    for (const oai of data) {
      const existingKnowledge = await this.getById(oai.id)

      if (existingKnowledge && !replaceExisting) {
        if (mergeData) {
          await this.update({
            ...existingKnowledge
          })
        }
        continue
      }

      await this.create(oai)
    }
  }
}

export const createManyModels = async (
  data: {
    model_id: string
    name: string
    provider_id: string
    model_type: string
  }[]
) => {
  const db = new ModelDb()

  const models = data.map((item) => {
    return {
      ...item,
      lookup: `${item.model_id}_${item.provider_id}`,
      id: `${item.model_id}_${generateID()}`,
      db_type: "openai_model",
      name: item.name.replaceAll(/accounts\/[^\/]+\/models\//g, "")
    }
  })

  for (const model of models) {
    const isExist = await isLookupExist(model.lookup)

    if (isExist) {
      continue
    }

    await db.create(model)
    try {
      const createdInFallback = await createModelFB(model)
      if (!createdInFallback) {
        throw new Error("Failed to persist model to fallback storage")
      }
    } catch (error) {
      try {
        await db.delete(model.id)
      } catch (deleteError) {
        console.warn(
          "Failed to rollback Dexie model after fallback persistence error",
          {
            modelId: model.id,
            error: deleteError
          }
        )
      }
      throw error
    }
  }
}

export const createModel = async (
  model_id: string,
  name: string,
  provider_id: string,
  model_type: string
) => {
  const db = new ModelDb()
  const id = generateID()
  const model: Model = {
    id: `${model_id}_${id}`,
    model_id,
    name,
    provider_id,
    lookup: `${model_id}_${provider_id}`,
    db_type: "openai_model",
    model_type: model_type
  }
  await db.create(model)
  try {
    const createdInFallback = await createModelFB(model)
    if (!createdInFallback) {
      throw new Error("Failed to persist model to fallback storage")
    }
  } catch (error) {
    try {
      await db.delete(model.id)
    } catch (deleteError) {
      console.warn(
        "Failed to rollback Dexie model after fallback persistence error",
        {
          modelId: model.id,
          error: deleteError
        }
      )
    }
    throw error
  }
  return model
}

export const getModelInfo = async (id: string) => {
  try {
    const db = new ModelDb()

    if (isLMStudioModel(id)) {
      const lmstudioId = getLMStudioModelId(id)
      if (!lmstudioId) {
        throw new Error("Invalid LMStudio model ID")
      }
      const cleanId = removeModelSuffix(id)
      return {
        model_id: cleanId,
        provider_id: `openai-${lmstudioId.provider_id}`,
        name: cleanId
      }
    }

    if (isLlamafileModel(id)) {
      const llamafileId = getLlamafileModelId(id)
      if (!llamafileId) {
        throw new Error("Invalid Llamafile model ID")
      }
      const cleanId = removeModelSuffix(id)
      return {
        model_id: cleanId,
        provider_id: `openai-${llamafileId.provider_id}`,
        name: cleanId
      }
    }

    if (isLLamaCppModel(id)) {
      const llamaCppId = getLLamaCppModelId(id)
      if (!llamaCppId) {
        throw new Error("Invalid llamaCPP model ID")
      }

      const cleanId = removeModelSuffix(id)
      return {
        model_id: cleanId,
        provider_id: `openai-${llamaCppId.provider_id}`,
        name: cleanId
      }
    }

    if (isVLLMModel(id)) {
      const vllmId = getVLLMModelId(id)
      if (!vllmId) {
        throw new Error("Invalid Vllm model ID")
      }
      const cleanId = removeModelSuffix(id)
      return {
        model_id: cleanId,
        provider_id: `openai-${vllmId.provider_id}`,
        name: cleanId
      }
    }

    const model = await db.getById(id)
    return model
  } catch (e) {
    if (isDatabaseClosedError(e)) {
      return await getModelInfoFB(id)
    }

    return null
  }
}

export const getAllCustomModels = async () => {
  try {
    const db = new ModelDb()
    const modelNicknames = await getAllModelNicknames()
    const models = (await db.getAll()).filter(
      (model) => model?.db_type === "openai_model"
    )

    return models.map((model) => {
      return {
        ...model,
        nickname: modelNicknames[model.id]?.model_name || model.model_id,
        avatar: modelNicknames[model.id]?.model_avatar || undefined
      }
    })
  } catch (e) {
    if (isDatabaseClosedError(e)) {
      return await getAllCustomModelsFB()
    }
    return []
  }
}

export const deleteModel = async (id: string) => {
  const db = new ModelDb()
  await db.delete(id)
  await deleteModelFB(id)
}

export const deleteAllModelsByProviderId = async (provider_id: string) => {
  const db = new ModelDb()
  const models = await db.getAll()
  const modelsToDelete = models.filter(
    (model) => model.provider_id === provider_id
  )
  for (const model of modelsToDelete) {
    await db.delete(model.id)
  }
}

export const isLookupExist = async (lookup: string) => {
  const db = new ModelDb()
  const models = await db.getAll()
  const model = models.find((model) => model?.lookup === lookup)
  return model ? true : false
}

export const formatAllCustomModels = async (
  modelType: "all" | "chat" | "embedding" = "all"
) => {
  // Legacy helper for aggregating custom OpenAI-compatible models.
  // Custom providers have been removed; return an empty list.
  void modelType
  return []
}

// Re-export model-provider utilities for backward compatibility so that
// existing imports from this module keep working. Prefer importing directly
// from "@/db/model-provider-utils" in new code.
export {
  removeModelSuffix,
  isLMStudioModel,
  isLlamafileModel,
  isLLamaCppModel,
  isVLLMModel,
  getLMStudioModelId,
  getLlamafileModelId,
  getLLamaCppModelId,
  getVLLMModelId,
  isCustomModel,
  dynamicFetchLMStudio,
  dynamicFetchLLamaCpp,
  dynamicFetchVLLM,
  dynamicFetchLlamafile
}
