import React from "react"
import { List } from "lucide-react"
import type { PlaygroundMessageGroup } from "./message-groups"

type MessageOutlineProps = {
  messageGroups: PlaygroundMessageGroup[]
  onSelectMessage: (renderKey: string) => void
}

export const MessageOutline = ({
  messageGroups,
  onSelectMessage
}: MessageOutlineProps) => {
  const userMessages = messageGroups

  if (userMessages.length === 0) {
    return null
  }

  return (
    <div className="sticky right-3 top-16 z-20 w-64 max-w-[calc(100%-1.5rem)] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1a1a1a]">
      <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <List className="size-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Message outline
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto p-1">
        {userMessages.map((group, index) => {
          const preview =
            group.message.trim().replace(/\s+/g, " ") || "Empty message"

          return (
            <button
              key={group.renderKey}
              type="button"
              onClick={() => onSelectMessage(group.renderKey)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {index + 1}.
              </span>

              <span className="line-clamp-2">
                {preview}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}