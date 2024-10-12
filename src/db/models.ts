import { getOpenAIConfigById as providerInfo } from "./openai"

type Model = {
  id: string
  model_id: string
  name: string
  provider_id: string
  lookup: string
  db_type: string
}
export const generateID = () => {
  return "model-xxxx-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export const removeModelSuffix = (id: string) => {
  return id.replace(/_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/, "")
}

export const isCustomModel = (model: string) => {
  const customModelRegex = /_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/
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
  data: { model_id: string; name: string; provider_id: string }[]
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

export const createModel = async (
  model_id: string,
  name: string,
  provider_id: string
) => {
  const db = new ModelDb()
  const id = generateID()
  const model: Model = {
    id: `${model_id}_${id}`,
    model_id,
    name,
    provider_id,
    lookup: `${model_id}_${provider_id}`,
    db_type: "openai_model"
  }
  await db.create(model)
  return model
}

export const getModelInfo = async (id: string) => {
  const db = new ModelDb()
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

export const isLookupExist = async (lookup: string) => {
  const db = new ModelDb()
  const models = await db.getAll()
  const model = models.find((model) => model.lookup === lookup)
  return model ? true : false
}


export const ollamaFormatAllCustomModels = async () => {

  const allModles = await getAllCustomModels()

  const ollamaModels = allModles.map((model) => {
    return {
      name: model.name,
      model: model.id,
      modified_at: "",
      provider: "custom",
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