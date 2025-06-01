import React from "react"
import { Globe, X } from "lucide-react"
import { TabInfo } from "~/hooks/useTabMentions"

interface DocumentChipProps {
  document: TabInfo
  onRemove: (id: number) => void
}

export const DocumentChip: React.FC<DocumentChipProps> = ({
  document,
  onRemove,
}) => {
  return (
    <div className="inline-flex items-center gap-2 bg-neutral-50 dark:bg-[#404040] border border-neutral-200 dark:border-[#525252] rounded-lg px-3 py-1.5 mr-2 mb-2">
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
        </div>{" "}
      </div>

      <button
        onClick={() => onRemove(document.id)}
        className="flex-shrink-0 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        type="button">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
