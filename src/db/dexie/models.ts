import { getAllOpenAIModels } from "@/libs/openai"
import {
  getAllOpenAIConfig,
  getOpenAIConfigById as providerInfo
} from "./openai"
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
    .replace(/_ollama2_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
    .replace(/_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
    .replace(/_vllm_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/, "")
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

export const isVLLMModel = (model: string) => {
  const vllmModelRegex = /_vllm_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  return vllmModelRegex.test(model)
}

export const isOllamaModel = (model: string) => {
  const ollamaModelRegex = /_ollama2_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  return ollamaModelRegex.test(model)
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
export const getOllamaModelId = (
  model: string
): { model_id: string; provider_id: string } => {
  const ollamaModelRegex = /_ollama2_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  const match = model.match(ollamaModelRegex)
  if (match) {
    const modelId = match[0]
    const providerId = match[0].replace("_ollama2_openai-", "")
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

export const getVLLMModelId = (
  model: string
): { model_id: string; provider_id: string } => {
  const vllmModelRegex = /_vllm_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
  const match = model.match(vllmModelRegex)
  if (match) {
    const modelId = match[0]
    const providerId = match[0].replace("_vllm_openai-", "")
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

  if (isOllamaModel(model)) {
    return true
  }

  if (isLLamaCppModel(model)) {
    return true
  }

  if (isVLLMModel(model)) {
    return true
  }

  const customModelRegex =
    /_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/
  return customModelRegex.test(model)
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
    await createModelFB(model)
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
  await createModelFB(model)
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
        throw new Error("Invalid LMStudio model ID")
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
        throw new Error("Invalid llamaCPP model ID")
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

    if (isOllamaModel(id)) {
      const ollamaId = getOllamaModelId(id)
      if (!ollamaId) {
        throw new Error("Invalid LMStudio model ID")
      }
      return {
        model_id: id.replace(
          /_ollama2_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
          ""
        ),
        provider_id: `openai-${ollamaId.provider_id}`,
        name: id.replace(
          /_ollama2_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/,
          ""
        )
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
    const modelsWithProvider = await Promise.all(
      models.map(async (model) => {
        const provider = await providerInfo(model.provider_id)
        return { ...model, provider }
      })
    )

    return modelsWithProvider.map((model) => {
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

export const dynamicFetchLMStudio = async ({
  baseUrl,
  providerId,
  customHeaders = []
}: {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}) => {
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
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

export const dynamicFetchLLamaCpp = async ({
  baseUrl,
  providerId,
  customHeaders = []
}: {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}) => {
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
  const llamaCppModels = models.map((e) => {
    return {
      name: e?.name || e?.id,
      id: `${e?.id}_llamacpp_${providerId}`,
      provider: providerId,
      lookup: `${e?.id}_${providerId}`,
      provider_id: providerId
    }
  })

  return llamaCppModels
}

export const dynamicFetchVLLM = async ({
  baseUrl,
  providerId,
  customHeaders = []
}: {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}) => {
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
  const vllmModels = models.map((e) => {
    return {
      name: e?.name || e?.id,
      id: `${e?.id}_vllm_${providerId}`,
      provider: providerId,
      lookup: `${e?.id}_${providerId}`,
      provider_id: providerId
    }
  })

  return vllmModels
}

export const dynamicFetchOllama2 = async ({
  baseUrl,
  providerId,
  customHeaders = []
}: {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}) => {
  if (baseUrl.includes("ollama.com")) {
    const res = await fetch("https://ollama.com/api/tags", {
      headers: {
        "Content-Type": "application/json"
      }
    })

    const data = await res.json()

    const models = data.models as { model: string; name: string }[]

    return models.map((e) => {
      return {
        name: e?.name || e?.model,
        id: `${e?.model}_ollama2_${providerId}`,
        provider: providerId,
        lookup: `${e?.model}_${providerId}`,
        provider_id: providerId
      }
    })
  }
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
  const ollama2Models = models.map((e) => {
    return {
      name: e?.name || e?.id,
      id: `${e?.id}_ollama2_${providerId}`,
      provider: providerId,
      lookup: `${e?.id}_${providerId}`,
      provider_id: providerId
    }
  })

  return ollama2Models
}

export const dynamicFetchLlamafile = async ({
  baseUrl,
  providerId,
  customHeaders = []
}: {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}) => {
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
  const llamafileModels = models.map((e) => {
    return {
      name: e?.name || e?.id,
      id: `${e?.id}_llamafile_${providerId}`,
      provider: providerId,
      lookup: `${e?.id}_${providerId}`,
      provider_id: providerId
    }
  })

  return llamafileModels
}

export const ollamaFormatAllCustomModels = async (
  modelType: "all" | "chat" | "embedding" = "all"
) => {
  try {
    const [allModles, allProviders] = await Promise.all([
      getAllCustomModels(),
      getAllOpenAIConfig()
    ])
    const modelNicknames = await getAllModelNicknames()
    const lmstudioProviders = allProviders.filter(
      (provider) => provider.provider === "lmstudio"
    )

    const llamafileProviders = allProviders.filter(
      (provider) => provider.provider === "llamafile"
    )

    const ollamaProviders = allProviders.filter(
      (provider) => provider.provider === "ollama2"
    )

    const llamacppProvider = allProviders.filter(
      (model) => model.provider === "llamacpp"
    )

    const vllmProviders = allProviders.filter(
      (model) => model.provider === "vllm"
    )

    const lmModelsPromises = lmstudioProviders.map((provider) =>
      dynamicFetchLMStudio({
        baseUrl: provider.baseUrl,
        providerId: provider.id,
        customHeaders: provider.headers
      })
    )

    const llamafileModelsPromises = llamafileProviders.map((provider) =>
      dynamicFetchLlamafile({
        baseUrl: provider.baseUrl,
        providerId: provider.id,
        customHeaders: provider.headers
      })
    )

    const ollamaModelsPromises = ollamaProviders.map((provider) =>
      dynamicFetchOllama2({
        baseUrl: provider.baseUrl,
        providerId: provider.id,
        customHeaders: provider.headers
      })
    )

    const llamacppModelsPromises = llamacppProvider.map((provider) =>
      dynamicFetchLLamaCpp({
        baseUrl: provider.baseUrl,
        providerId: provider.id,
        customHeaders: provider.headers
      })
    )

    const vllmModelsPromises = vllmProviders.map((provider) =>
      dynamicFetchVLLM({
        baseUrl: provider.baseUrl,
        providerId: provider.id,
        customHeaders: provider.headers
      })
    )

    const lmModelsFetch = await Promise.all(lmModelsPromises)

    const llamafileModelsFetch = await Promise.all(llamafileModelsPromises)

    const ollamaModelsFetch = await Promise.all(ollamaModelsPromises)

    const llamacppModelsFetch = await Promise.all(llamacppModelsPromises)

    const vllmModelsFetch = await Promise.all(vllmModelsPromises)

    const lmModels = lmModelsFetch.flat()

    const llamafileModels = llamafileModelsFetch.flat()

    const ollama2Models = ollamaModelsFetch.flat()

    const llamacppModels = llamacppModelsFetch.flat()

    const vllmModels = vllmModelsFetch.flat()

    // merge allModels and lmModels
    const allModlesWithLMStudio = [
      ...(modelType !== "all"
        ? allModles.filter((model) => model.model_type === modelType)
        : allModles),
      ...lmModels,
      ...llamafileModels,
      ...ollama2Models,
      ...llamacppModels,
      ...vllmModels
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

    return ollamaModels.map((model) => {
      return {
        ...model,
        nickname: modelNicknames[model.model]?.model_name || model.name,
        avatar: modelNicknames[model.model]?.model_avatar || undefined
      }
    })
  } catch (e) {
    console.error(e)
    return []
  }
}
