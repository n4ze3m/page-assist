import { Spin } from "antd"
import { FileIcon, Loader2, XIcon } from "lucide-react"

type Props = {
  name: string
  onRemove: () => void
  loading?: boolean
}

export const DocumentCard: React.FC<Props> = ({ name, onRemove, loading }) => {
  return (
    <button
      disabled={loading}
      className="relative group p-1.5 w-60 flex items-center gap-1 bg-white dark:bg-[#211e1e] border border-gray-200 dark:border-gray-700 rounded-2xl text-left"
      type="button">
      <div className="p-3 bg-black/20 dark:bg-[#2d2d2d] text-white rounded-xl">
        {loading ? <Spin size="small" /> : <FileIcon className="w-6 h-6" />}
      </div>
      <div className="flex flex-col justify-center -space-y-0.5 px-2.5 w-full">
        <div className="dark:text-gray-200 text-sm font-medium line-clamp-1 mb-1">
          {name}
        </div>
      </div>
      <div className="absolute -top-1 -right-1">
        <button
          onClick={onRemove}
          className="bg-white dark:bg-gray-800 text-black dark:text-gray-200 border border-gray-50 dark:border-gray-700 rounded-full group-hover:visible invisible transition"
          type="button">
          <XIcon className="w-3 h-3" />
        </button>
      </div>
    </button>
  )
}
