import { ChevronDown, ChevronRight, Wrench } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import Markdown from "../Markdown"
import { PlaygroundToolInvocation } from "./message-groups"

type Props = {
  invocation: PlaygroundToolInvocation
}

export const McpInvocationBlock = ({ invocation }: Props) => {
  const { t } = useTranslation("common")
  const [isOpen, setIsOpen] = React.useState(Boolean(invocation.result?.toolError))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <span className="flex size-5 items-center justify-center rounded-full border border-gray-200 text-gray-500 dark:border-white/10 dark:text-gray-400">
          <Wrench className="size-3" />
        </span>
        <span className="font-medium">{invocation.displayName}</span>
        {invocation.serverName && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {invocation.serverName}
          </span>
        )}
      </div>

      {invocation.result ? (
        <div className="pl-7">
          <button
            type="button"
            onClick={() => setIsOpen((currentValue) => !currentValue)}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white">
            {isOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {t("mcp.toolResultTitle")}
          </button>

          {isOpen && (
            <div className="mt-3 rounded-2xl border border-gray-200/80 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:text-gray-200">
              <Markdown
                message={
                  invocation.result.content.trim().length > 0
                    ? invocation.result.content
                    : t("mcp.noOutput")
                }
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
