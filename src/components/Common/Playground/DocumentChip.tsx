import React from "react"
import { Globe } from "lucide-react"

interface DocumentChipProps {
  document: {
    title: string
    url: string
    favIconUrl?: string
  }
}

export const DocumentChip: React.FC<DocumentChipProps> = ({ document }) => {
  return (
    <a
      href={document.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-[#2a2a2a] rounded-2xl px-3 py-1.5 mr-2 mb-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {document.favIconUrl ? (
            <img
              src={document.favIconUrl}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = "none"
                target.nextElementSibling?.classList.remove("hidden")
              }}
            />
          ) : null}
          <Globe
            className={`w-4 h-4 text-neutral-600 dark:text-neutral-400 ${document.favIconUrl ? "hidden" : ""}`}
          />
        </div>
        <div className="flex flex-col max-w-60 truncate">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 ">
            {document.title}
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-400 ">
            {document.url}
          </span>
        </div>{" "}
      </div>
    </a>
  )
}
