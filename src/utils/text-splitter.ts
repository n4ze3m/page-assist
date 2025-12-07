import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize
} from "@/services/tldw-server"

/**
 * Returns a text splitter configured with user preferences.
 * Used for web search result processing.
 */
export const getPageAssistTextSplitter = async () => {
  const chunkSize = await defaultEmbeddingChunkSize()
  const chunkOverlap = await defaultEmbeddingChunkOverlap()

  return new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  })
}
