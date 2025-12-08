import { getAllOpenAIModels } from "@/libs/openai"
import { getAllModelNicknames } from "./nickname"

interface Model {
  id: string
  model_id: string
  name: string
  model_name?: string
  model_image?: string
  provider_id: string
  lookup: string
  model_type: string
  db_type: string
}
export const generateID = () => {
  return "model-xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export const removeModelSuffix = (id: string) => {
  return id
    .replace(/_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/, "")
    .replace(/_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
    .replace(/_llamafile_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
    .replace(/_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
}
export const isLMStudioModel = (model: string) => {
  const lmstudioModelRegex =
    /_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  return lmstudioModelRegex.test(model)
}

export const isLlamafileModel = (model: string) => {
  const llamafileModelRegex =
    /_llamafile_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  return llamafileModelRegex.test(model)
}

export const isLLamaCppModel = (model: string) => {
  const llamaCppModelRegex =
    /_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  return llamaCppModelRegex.test(model)
}

export const getLMStudioModelId = (
  model: string
): { model_id: string; provider_id: string } => {
  const lmstudioModelRegex =
    /_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  const match = model.match(lmstudioModelRegex)
  if (match) {
    const modelId = match[0]
    const providerId = match[0].replace("_lmstudio_openai-", "")
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}
export const getLlamafileModelId = (
  model: string
): { model_id: string; provider_id: string } => {
  const llamafileModelRegex =
    /_llamafile_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  const match = model.match(llamafileModelRegex)
  if (match) {
    const modelId = match[0]
    const providerId = match[0].replace("_llamafile_openai-", "")
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}

export const getLLamaCppModelId = (
  model: string
): { model_id: string; provider_id: string } => {
  const llamaCppModelRegex =
    /_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  const match = model.match(llamaCppModelRegex)
  if (match) {
    const modelId = match[0]
    const providerId = match[0].replace("_llamacpp_openai-", "")
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}

export const isCustomModel = (model: string) => {
  if (isLMStudioModel(model)) {
    return true
  }

  if (isLlamafileModel(model)) {
    return true
  }

  if (isLLamaCppModel(model)) {
    return true
  }

  const customModelRegex =
    /_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/
  return customModelRegex.test(model)
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

export const createModelFB = async (model: Model) => {
  try {
    const db = new ModelDb()
    await db.create(model)
  } catch (e) {}
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

  const model = await db.getById(id)
  return model
}

export const getAllCustomModelsFB = async () => {
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

type DynamicFetchParams = {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}

const dynamicFetchModels = async ({
  baseUrl,
  providerId,
  providerPrefix,
  customHeaders = []
}: DynamicFetchParams & {
  providerPrefix: "lmstudio" | "llamacpp" | "llamafile"
}) => {
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
  return models.map((e) => ({
    name: e?.name || e?.id,
    id: `${e?.id}_${providerPrefix}_${providerId}`,
    provider: providerId,
    lookup: `${e?.id}_${providerId}`,
    provider_id: providerId
  }))
}

export const dynamicFetchLMStudio = async (params: DynamicFetchParams) =>
  dynamicFetchModels({ ...params, providerPrefix: "lmstudio" })

export const dynamicFetchLLamaCpp = async (params: DynamicFetchParams) =>
  dynamicFetchModels({ ...params, providerPrefix: "llamacpp" })

export const dynamicFetchLlamafile = async (params: DynamicFetchParams) =>
  dynamicFetchModels({ ...params, providerPrefix: "llamafile" })
