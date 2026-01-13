import React from "react"
import { DocumentChip } from "@/components/Option/Playground/DocumentChip"

export type DocumentItem = {
  id: number | string
  title: string
  url: string
  favIconUrl?: string
}

export type DocumentsBarProps = {
  documents: DocumentItem[]
  onRemove: (doc: DocumentItem) => void
}

export const DocumentsBar: React.FC<DocumentsBarProps> = ({ documents, onRemove }) => {
  if (!documents || documents.length === 0) return null
  return (
    <div className="p-3">
      <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#404040] scrollbar-track-transparent">
        <div className="flex flex-wrap gap-1.5">
          {documents.map((document) => (
            <DocumentChip key={document.id} document={document as any} onRemove={onRemove as any} />
          ))}
        </div>
      </div>
    </div>
  )
}
