import type { QueuedMessage } from "@/hooks/useMessageQueue"
import { ImageIcon, PencilIcon, Trash2Icon, ArrowUpIcon } from "lucide-react"
import { Image, Tooltip } from "antd"

type Props = {
  queuedMessages: QueuedMessage[]
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onSend: (id: string) => void
  title?: string
}

export const QueuedMessagesList = ({
  queuedMessages,
  onDelete,
  onEdit,
  onSend
}: Props) => {
  if (queuedMessages.length === 0) {
    return null
  }

  return (
    <div className="p-4">
      <div className="max-h-32 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#404040] scrollbar-track-transparent">
        {queuedMessages.map((item) => (
          <div
            key={item.id}
            className="flex items-center  justify-between gap-2 rounded-xl border border-gray-200 bg-white/80 px-2 py-1.5 dark:border-[#404040] dark:bg-[#2a2a2a]/80">
            <div className="min-w-0 inline-flex max-w-full items-center gap-2">
              {item.images.length > 0 && (
                <div className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <Image
                    className="h-3 w-3 rounded-sm"
                    src={item.images[0]}
                    preview={false}
                    width={12}
                    height={12}
                  />
                </div>
              )}
              <span
                title={item.message}
                className="truncate text-xs text-gray-700 dark:text-gray-200">
                {item.message || "Image"}
              </span>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1 text-[11px]">
              <Tooltip title="Delete">
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded-lg border border-gray-300 p-1 text-gray-600 hover:text-red-600 dark:border-[#5a5a5a] dark:text-gray-300 dark:hover:text-red-400">
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip title="Edit">
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  className="rounded-lg border border-gray-300 p-1 text-gray-600 hover:text-gray-900 dark:border-[#5a5a5a] dark:text-gray-300 dark:hover:text-white">
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
              <Tooltip title="Send now">
                <button
                  type="button"
                  onClick={() => onSend(item.id)}
                  className="rounded-lg border border-gray-300 p-1 text-gray-600 hover:text-gray-900 dark:border-[#5a5a5a] dark:text-gray-300 dark:hover:text-white">
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
