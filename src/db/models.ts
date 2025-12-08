import { getAllModelNicknames } from "./nickname"
import type { Model } from "@/db/dexie/types"
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
  type DynamicFetchParams,
  type DynamicModelListing,
  dynamicFetchLMStudio,
  dynamicFetchLLamaCpp,
  dynamicFetchLlamafile,
  dynamicFetchVLLM
} from "./model-provider-utils"

interface CustomModelView extends Model {
  nickname: string
  avatar?: string
}
export const generateID = () => {
  return "model-xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}
export class ModelDb {
  db: chrome.storage.StorageArea

  constructor() {
    this.db = chrome.storage.local
  }

  getAll = async (): Promise<Model[]> => {
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

  create = async (model: Model): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.set({ [model.id]: model }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  getById = async (id: string): Promise<Model> => {
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

  update = async (model: Model): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.set({ [model.id]: model }, () => {
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

  deleteAll = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      this.db.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
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
  }
}

export const createModelFB = async (model: Model): Promise<boolean> => {
  try {
    const db = new ModelDb()
    await db.create(model)
    return true
  } catch (e) {
    // Surface storage failures instead of silently swallowing them
    // eslint-disable-next-line no-console
    console.error("Failed to create model", e)
    return false
  }
}

export const getAllModelsExT = async () => {
  const db = new ModelDb()
  const allData = await db.getAll()
  return allData?.filter((d) => d?.db_type === "openai_model") || []
}

export const getModelInfoFB = async (id: string) => {
  const db = new ModelDb()

  if (isLMStudioModel(id)) {
    const lmstudioId = getLMStudioModelId(id)
    if (!lmstudioId) {
      throw new Error("Invalid LMStudio model ID")
    }
    return {
      model_id: id.replace(
        /_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      ),
      provider_id: `openai-${lmstudioId.provider_id}`,
      name: id.replace(
        /_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      )
    }
  }

  if (isLlamafileModel(id)) {
    const llamafileId = getLlamafileModelId(id)
    if (!llamafileId) {
      throw new Error("Invalid Llamafile model ID")
    }
    return {
      model_id: id.replace(
        /_llamafile_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      ),
      provider_id: `openai-${llamafileId.provider_id}`,
      name: id.replace(
        /_llamafile_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      )
    }
  }

  if (isLLamaCppModel(id)) {
    const llamaCppId = getLLamaCppModelId(id)
    if (!llamaCppId) {
      throw new Error("Invalid LlamaCpp model ID")
    }

    return {
      model_id: id.replace(
        /_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      ),
      provider_id: `openai-${llamaCppId.provider_id}`,
      name: id.replace(
        /_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      )
    }
  }

  if (isVLLMModel(id)) {
    const vllmId = getVLLMModelId(id)
    if (!vllmId) {
      throw new Error("Invalid Vllm model ID")
    }
    return {
      model_id: id.replace(
        /_vllm_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
        ""
      ),
      provider_id: `openai-${vllmId.provider_id}`,
      name: id.replace(/_vllm_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
    }
  }

  const model = await db.getById(id)
  return model
}

export const getAllCustomModelsFB = async (): Promise<CustomModelView[]> => {
  const db = new ModelDb()
  const modelNicknames = await getAllModelNicknames()
  const models = (await db.getAll()).filter(
    (model) => model?.db_type === "openai_model"
  )
  return models.map((model) => {
    return {
      ...model,
      nickname: modelNicknames[model.model_id]?.model_name || model.model_id,
      avatar: modelNicknames[model.model_id]?.model_avatar || undefined
    }
  })
}

export const deleteModelFB = async (id: string) => {
  const db = new ModelDb()
  await db.delete(id)
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

export const bulkAddModelsFB = async (models: Model[]) => {
  // delete all exist models
  const db = new ModelDb()
  const modelsToDelete = (await db.getAll()).filter(
    (model) => model?.db_type === "openai_model"
  )
  for (const model of modelsToDelete) {
    await db.delete(model.id)
  }
  // add new models
  for (const model of models) {
    await db.create(model)
  }
}

export const isLookupExist = async (lookup: string) => {
  const db = new ModelDb()
  const models = await db.getAll()
  const model = models.find((model) => model?.lookup === lookup)
  return !!model
}

export type { DynamicFetchParams, DynamicModelListing }
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
