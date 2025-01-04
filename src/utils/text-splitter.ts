import {
  RecursiveCharacterTextSplitter,
  CharacterTextSplitter
} from "langchain/text_splitter"

import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize,
  defaultSsplttingSeparator,
  defaultSplittingStrategy
} from "@/services/ollama"

export const getPageAssistTextSplitter = async () => {
  const chunkSize = await defaultEmbeddingChunkSize()
  const chunkOverlap = await defaultEmbeddingChunkOverlap()
  const splittingStrategy = await defaultSplittingStrategy()

  switch (splittingStrategy) {
    case "CharacterTextSplitter":
      console.log("Using CharacterTextSplitter")
      const splittingSeparator = await defaultSsplttingSeparator()
      const processedSeparator = splittingSeparator
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
      return new CharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        separator: processedSeparator
      })
    default:
      return new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap
      })
  }
}
