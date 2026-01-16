import { defaultEmbeddingModelForRag } from "~/services/ai/ollama"
import { getIsSimpleInternetSearch } from "@/services/features/search"

export type SubmitValidationOptions = {
  // Required
  selectedModel?: string | null
  // Feature flags/state
  webSearch?: boolean
  chatMode?: string | null
  chatWithWebsiteEmbedding?: boolean
  // When true (Playground), allow docs/files to satisfy non-empty payload
  hasDocsOrFiles?: boolean
  // i18n
  t: (key: string) => string
}

export type SubmitPayload = {
  message: string
  image: string
}

// Returns null when valid, otherwise an error message string for form.setFieldError
export async function validateBeforeSend(
  opts: SubmitValidationOptions,
  payload: SubmitPayload
): Promise<string | null> {
  const {
    selectedModel,
    webSearch,
    chatMode,
    chatWithWebsiteEmbedding,
    hasDocsOrFiles,
    t
  } = opts

  const trimmed = payload.message?.trim?.() ?? ""
  const hasContent = trimmed.length > 0 || payload.image?.length > 0
  const hasAny = hasContent || !!hasDocsOrFiles
  if (!hasAny) return null // Let caller decide to early-return with no-op

  if (!selectedModel || selectedModel.length === 0) {
    return t("formError.noModel")
  }

  // Sidepanel specific: chat-with-website requires embedding model
  if (chatMode === "rag") {
    const defaultEM = await defaultEmbeddingModelForRag()
    if (!defaultEM && chatWithWebsiteEmbedding) {
      return t("formError.noEmbeddingModel")
    }
  }

  // Internet search requires embedding unless "simple" search allowed
  if (webSearch) {
    const defaultEM = await defaultEmbeddingModelForRag()
    const simpleSearch = await getIsSimpleInternetSearch()
    if (!defaultEM && !simpleSearch) {
      return t("formError.noEmbeddingModel")
    }
  }

  return null
}
