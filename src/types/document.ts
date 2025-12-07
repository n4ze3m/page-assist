/**
 * Document type for representing parsed content.
 * Replaces @langchain/core/documents Document type.
 */

export interface DocumentMetadata {
  url?: string
  source?: string
  audio?: { chunks: any[] }
  [key: string]: any
}

export interface Document<T extends DocumentMetadata = DocumentMetadata> {
  pageContent: string
  metadata: T
}

/**
 * Helper to create a Document object.
 */
export const createDocument = <T extends DocumentMetadata = DocumentMetadata>(
  pageContent: string,
  metadata: T = {} as T
): Document<T> => ({
  pageContent,
  metadata
})
