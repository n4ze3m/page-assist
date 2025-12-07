import type { Document } from "@/types/document"

/**
 * Format documents for inclusion in a prompt.
 * Deduplicates by content and wraps each in XML-style tags.
 */
export const formatDocs = (docs: Document[]) => {
  return docs
    .filter(
      (doc, i, self) =>
        self.findIndex((d) => d.pageContent === doc.pageContent) === i
    )
    .map((doc, i) => `<doc id='${i}'>${doc.pageContent}</doc>`)
    .join("\n")
}
