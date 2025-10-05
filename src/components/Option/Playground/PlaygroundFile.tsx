import { UploadedFile } from "@/db"
import { FileIcon, XIcon } from "lucide-react"
import { formatFileSize } from "@/utils/format-file-size"

type Props = {
  file: UploadedFile
  removeUploadedFile: (id: string) => void
}

export const PlaygroundFile: React.FC<Props> = ({
  file,
  removeUploadedFile
}) => {
  return (
    <button
      className="relative group p-1.5 w-60 flex items-center gap-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 rounded-2xl text-left"
      type="button">
      <div className="p-3 bg-black/20 dark:bg-white/10 text-white rounded-xl">
        <FileIcon className="size-5" />
      </div>
      <div className="flex flex-col justify-center -space-y-0.5 px-2.5 w-full">
        <div className="dark:text-gray-100 text-sm font-medium line-clamp-1 mb-1">
          {file.filename}
        </div>
        <div className="flex justify-between text-gray-500 text-xs line-clamp-1">
          File{" "}
          <span className="capitalize">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>
      <div className="absolute -top-1 -right-1">
        <button
          onClick={() => removeUploadedFile(file.id)}
          className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 border border-gray-50 dark:border-[#404040] rounded-full group-hover:visible invisible transition"
          type="button">
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </button>
  )
}
