import React from "react"
import { Tooltip, Switch } from "antd"
import { FileText } from "lucide-react"
import { PlaygroundFile } from "@/components/Option/Playground/PlaygroundFile"

export type FilesBarFile = {
  id: string | number
  name?: string
  // plus any other fields PlaygroundFile expects; kept loose via "any" cast on usage site
}

export type FilesBarProps = {
  files: FilesBarFile[]
  onRemove: (file: any) => void
  retrievalEnabled: boolean
  onToggleRetrieval: (enabled: boolean) => void
  retrievalTitle: string
}

export const FilesBar: React.FC<FilesBarProps> = ({
  files,
  onRemove,
  retrievalEnabled,
  onToggleRetrieval,
  retrievalTitle
}) => {
  if (!files || files.length === 0) return null
  return (
    <div className="p-3 border-b border-gray-200 dark:border-[#404040]">
      <div className="flex items-center justify-end mb-2">
        <div className="flex items-center gap-2">
          <Tooltip title={retrievalTitle}>
            <div className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 dark:text-gray-300" />
              <Switch size="small" checked={retrievalEnabled} onChange={onToggleRetrieval} />
            </div>
          </Tooltip>
        </div>
      </div>
      <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#404040] scrollbar-track-transparent">
        <div className="flex flex-wrap gap-1.5">
          {files.map((file: any) => (
            <PlaygroundFile key={file.id} file={file} removeUploadedFile={onRemove} />
          ))}
        </div>
      </div>
    </div>
  )
}
