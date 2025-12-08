/**
 * Document type for representing parsed content.
 * Replaces @langchain/core/documents Document type.
 */

export interface DocumentMetadata {
  url?: string
  source?: string
  audio?: { chunks: unknown[] }
  [key: string]: unknown
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
  metadata?: T
): Document<T> => ({
  pageContent,
  metadata: metadata ?? ({} as T)
})
