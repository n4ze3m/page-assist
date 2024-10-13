import { getAllOpenAIModels } from "@/libs/openai"
import {
  getAllOpenAIConfig,
  getOpenAIConfigById as providerInfo
} from "./openai"

type Model = {
  id: string
  model_id: string
  name: string
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
}
export const isLMStudioModel = (model: string) => {
  const lmstudioModelRegex =
    /_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  return lmstudioModelRegex.test(model)
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
export const isCustomModel = (model: string) => {
  if (isLMStudioModel(model)) {
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
  data: { model_id: string; name: string; provider_id: string, model_type: string }[]
) => {
  const db = new ModelDb()

  const models = data.map((item) => {
    return {
      ...item,
      lookup: `${item.model_id}_${item.provider_id}`,
      id: `${item.model_id}_${generateID()}`,
      db_type: "openai_model",
      name: item.name.replaceAll(/accounts\/[^\/]+\/models\//g, ""),
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
  return model
}

export const getModelInfo = async (id: string) => {
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

  const model = await db.getById(id)
  return model
}

export const getAllCustomModels = async () => {
  const db = new ModelDb()
  const models = (await db.getAll()).filter(
    (model) => model.db_type === "openai_model"
  )
  const modelsWithProvider = await Promise.all(
    models.map(async (model) => {
      const provider = await providerInfo(model.provider_id)
      return { ...model, provider }
    })
  )

  return modelsWithProvider
}

export const deleteModel = async (id: string) => {
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

export const isLookupExist = async (lookup: string) => {
  const db = new ModelDb()
  const models = await db.getAll()
  const model = models.find((model) => model.lookup === lookup)
  return model ? true : false
}

export const dynamicFetchLMStudio = async ({
  baseUrl,
  providerId
}: {
  baseUrl: string
  providerId: string
}) => {
  const models = await getAllOpenAIModels(baseUrl)
  const lmstudioModels = models.map((e) => {
    return {
      name: e?.name || e?.id,
      id: `${e?.id}_lmstudio_${providerId}`,
      provider: providerId,
      lookup: `${e?.id}_${providerId}`,
      provider_id: providerId
    }
  })

  return lmstudioModels
}

export const ollamaFormatAllCustomModels = async (
  modelType: "all" | "chat" | "embedding" = "all"
) => {
  const [allModles, allProviders] = await Promise.all([
    getAllCustomModels(),
    getAllOpenAIConfig()
  ])

  const lmstudioProviders = allProviders.filter(
    (provider) => provider.provider === "lmstudio"
  )

  const lmModelsPromises = lmstudioProviders.map((provider) =>
    dynamicFetchLMStudio({
      baseUrl: provider.baseUrl,
      providerId: provider.id
    })
  )

  const lmModelsFetch = await Promise.all(lmModelsPromises)

  const lmModels = lmModelsFetch.flat()

  // merge allModels and lmModels
  const allModlesWithLMStudio = [
    ...(modelType !== "all"
      ? allModles.filter((model) => model.model_type === modelType)
      : allModles),
    ...lmModels
  ]

  const ollamaModels = allModlesWithLMStudio.map((model) => {
    return {
      name: model.name,
      model: model.id,
      modified_at: "",
      provider:
        allProviders.find((provider) => provider.id === model.provider_id)
          ?.provider || "custom",
      size: 0,
      digest: "",
      details: {
        parent_model: "",
        format: "",
        family: "",
        families: [],
        parameter_size: "",
        quantization_level: ""
      }
    }
  })

  return ollamaModels
}
