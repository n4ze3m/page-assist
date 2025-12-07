import { Storage } from "@plasmohq/storage"

const storage = new Storage()

/**
 * Whether to use local embeddings for website chat.
 * When false, just uses raw text truncation.
 */
export const isChatWithWebsiteEnabled = async (): Promise<boolean> => {
  const enabled = await storage.get<boolean | undefined>("chatWithWebsiteEmbedding")
  return enabled ?? false
}

/**
 * Maximum context size for inline document content.
 */
export const getMaxContextSize = async (): Promise<number> => {
  const maxContext = await storage.get<number | undefined>("maxWebsiteContext")
  return maxContext ?? 7028
}
