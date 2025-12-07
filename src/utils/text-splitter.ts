import type { Document } from "@/types/document"
import {
  defaultEmbeddingChunkOverlap,
  defaultEmbeddingChunkSize
} from "@/services/tldw-server"

export interface TextSplitterOptions {
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
}

/**
 * Recursive text splitter that splits text by trying different separators.
 * Replaces LangChain's RecursiveCharacterTextSplitter.
 */
export class RecursiveTextSplitter {
  private chunkSize: number
  private chunkOverlap: number
  private separators: string[]

  constructor(options: TextSplitterOptions = {}) {
    this.chunkSize = options.chunkSize ?? 1000
    this.chunkOverlap = options.chunkOverlap ?? 200
    this.separators = options.separators ?? ["\n\n", "\n", " ", ""]
  }

  /**
   * Split text into chunks using recursive separator strategy.
   */
  splitText(text: string): string[] {
    return this.recursiveSplit(text, this.separators)
  }

  private recursiveSplit(text: string, separators: string[]): string[] {
    // If text is small enough, return as-is
    if (text.length <= this.chunkSize) {
      return text.trim() ? [text] : []
    }

    const [separator, ...remainingSeparators] = separators

    // Base case: no separator left, split by characters with overlap
    if (separator === undefined || separator === "") {
      return this.splitByCharacter(text)
    }

    const parts = text.split(separator)
    const chunks: string[] = []
    let currentChunk = ""

    for (const part of parts) {
      const candidate = currentChunk
        ? currentChunk + separator + part
        : part

      if (candidate.length <= this.chunkSize) {
        currentChunk = candidate
      } else {
        // Current chunk is full, push it
        if (currentChunk.trim()) {
          chunks.push(currentChunk)
        }

        // If part itself is too large, recursively split with next separator
        if (part.length > this.chunkSize && remainingSeparators.length > 0) {
          chunks.push(...this.recursiveSplit(part, remainingSeparators))
          currentChunk = ""
        } else {
          currentChunk = part
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  private splitByCharacter(text: string): string[] {
    const chunks: string[] = []
    let start = 0
    const step = this.chunkSize - this.chunkOverlap

    while (start < text.length) {
      const chunk = text.slice(start, start + this.chunkSize)
      if (chunk.trim()) {
        chunks.push(chunk)
      }
      start += step > 0 ? step : this.chunkSize
    }

    return chunks
  }

  /**
   * Split documents into smaller chunks.
   * Preserves metadata from original documents.
   */
  splitDocuments(docs: Document[]): Document[] {
    return docs.flatMap((doc) => {
      const chunks = this.splitText(doc.pageContent)
      return chunks.map((chunk) => ({
        pageContent: chunk,
        metadata: { ...doc.metadata }
      }))
    })
  }
}

/**
 * Returns a text splitter configured with user preferences.
 * Used for web search result processing.
 */
export const getPageAssistTextSplitter = async () => {
  const chunkSize = await defaultEmbeddingChunkSize()
  const chunkOverlap = await defaultEmbeddingChunkOverlap()

  return new RecursiveTextSplitter({
    chunkSize,
    chunkOverlap
  })
}
