import React from "react"
import { FileIcon, Globe } from "lucide-react"
import { formatFileSize } from "@/utils/format-file-size"

interface DocumentFileProps {
  document: {
    filename: string
    fileSize: number
  }
}

export const DocumentFile: React.FC<DocumentFileProps> = ({ document }) => {
  return (
    <button
      className="relative group p-1.5 w-80 flex items-center gap-1 bg-white dark:bg-[#262626] border border-gray-200 dark:border-white/5 rounded-2xl text-left"
      type="button">
      <div className="p-3 bg-black/20 dark:bg-white/10 text-white rounded-xl">
        <FileIcon className="size-5" />
      </div>
      <div className="flex flex-col justify-center -space-y-0.5 px-2.5 w-full">
        <div className="dark:text-gray-100 text-sm font-medium line-clamp-1 mb-1">
          {document.filename}
        </div>
        <div className="flex justify-between text-gray-500 text-xs line-clamp-1">
          File{" "}
          <span className="capitalize">
            {formatFileSize(document.fileSize)}
          </span>
        </div>
      </div>
    </button>
  )
}
