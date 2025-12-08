import { getAllOpenAIModels } from "@/libs/openai"

const CUSTOM_MODEL_SUFFIX_REGEX =
  /_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/
const LMSTUDIO_SUFFIX_REGEX =
  /_lmstudio_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
const LLAMAFILE_SUFFIX_REGEX =
  /_llamafile_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
const LLAMACPP_SUFFIX_REGEX =
  /_llamacpp_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/
const VLLM_SUFFIX_REGEX =
  /_vllm_openai-[a-f0-9]{4}-[a-f0-9]{3}-[a-f0-9]{4}/

export const removeModelSuffix = (id: string) => {
  return id
    .replace(CUSTOM_MODEL_SUFFIX_REGEX, "")
    .replace(LMSTUDIO_SUFFIX_REGEX, "")
    .replace(LLAMAFILE_SUFFIX_REGEX, "")
    .replace(LLAMACPP_SUFFIX_REGEX, "")
    .replace(VLLM_SUFFIX_REGEX, "")
}

export const isLMStudioModel = (model: string) => {
  return LMSTUDIO_SUFFIX_REGEX.test(model)
}

export const isLlamafileModel = (model: string) => {
  return LLAMAFILE_SUFFIX_REGEX.test(model)
}

export const isLLamaCppModel = (model: string) => {
  return LLAMACPP_SUFFIX_REGEX.test(model)
}

export const isVLLMModel = (model: string) => {
  return VLLM_SUFFIX_REGEX.test(model)
}

export const getLMStudioModelId = (
  model: string
): { model_id: string; provider_id: string } | null => {
  const match = model.match(LMSTUDIO_SUFFIX_REGEX)
  if (match) {
    const providerId = match[0].replace("_lmstudio_openai-", "")
    const modelId = removeModelSuffix(model)
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}

export const getLlamafileModelId = (
  model: string
): { model_id: string; provider_id: string } | null => {
  const match = model.match(LLAMAFILE_SUFFIX_REGEX)
  if (match) {
    const providerId = match[0].replace("_llamafile_openai-", "")
    const modelId = removeModelSuffix(model)
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}

export const getLLamaCppModelId = (
  model: string
): { model_id: string; provider_id: string } | null => {
  const match = model.match(LLAMACPP_SUFFIX_REGEX)
  if (match) {
    const providerId = match[0].replace("_llamacpp_openai-", "")
    const modelId = removeModelSuffix(model)
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}

export const getVLLMModelId = (
  model: string
): { model_id: string; provider_id: string } | null => {
  const match = model.match(VLLM_SUFFIX_REGEX)
  if (match) {
    const providerId = match[0].replace("_vllm_openai-", "")
    const modelId = removeModelSuffix(model)
    return { model_id: modelId, provider_id: providerId }
  }
  return null
}

export const isCustomModel = (model: string) => {
  if (
    isLMStudioModel(model) ||
    isLlamafileModel(model) ||
    isLLamaCppModel(model) ||
    isVLLMModel(model)
  ) {
    return true
  }
  return CUSTOM_MODEL_SUFFIX_REGEX.test(model)
}

export interface DynamicFetchParams {
  baseUrl: string
  providerId: string
  customHeaders?: { key: string; value: string }[]
}

export type DynamicModelListing = {
  name: string
  id: string
  provider: string
  lookup: string
  provider_id: string
}

const dynamicFetchModels = async ({
  baseUrl,
  providerId,
  providerPrefix,
  customHeaders = []
}: DynamicFetchParams & {
  providerPrefix: "lmstudio" | "llamacpp" | "llamafile" | "vllm"
}): Promise<DynamicModelListing[]> => {
  const models = await getAllOpenAIModels({ baseUrl, customHeaders })
  return models.map((e) => ({
    name: e?.name || e?.id,
    id: `${e?.id}_${providerPrefix}_${providerId}`,
    provider: providerId,
    lookup: `${e?.id}_${providerId}`,
    provider_id: providerId
  }))
}

export const dynamicFetchLMStudio = async (
  params: DynamicFetchParams
): Promise<DynamicModelListing[]> => {
  try {
    return await dynamicFetchModels({ ...params, providerPrefix: "lmstudio" })
  } catch (e) {
    throw new Error(
      `Failed to fetch LMStudio models: ${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
}

export const dynamicFetchLLamaCpp = async (
  params: DynamicFetchParams
): Promise<DynamicModelListing[]> => {
  try {
    return await dynamicFetchModels({ ...params, providerPrefix: "llamacpp" })
  } catch (e) {
    throw new Error(
      `Failed to fetch LlamaCpp models: ${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
}

export const dynamicFetchVLLM = async (
  params: DynamicFetchParams
): Promise<DynamicModelListing[]> => {
  try {
    return await dynamicFetchModels({ ...params, providerPrefix: "vllm" })
  } catch (e) {
    throw new Error(
      `Failed to fetch vLLM models: ${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
}

export const dynamicFetchLlamafile = async (
  params: DynamicFetchParams
): Promise<DynamicModelListing[]> => {
  try {
    return await dynamicFetchModels({ ...params, providerPrefix: "llamafile" })
  } catch (e) {
    throw new Error(
      `Failed to fetch Llamafile models: ${
        e instanceof Error ? e.message : String(e)
      }`
    )
  }
}
