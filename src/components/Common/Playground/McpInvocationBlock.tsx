import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Wrench,
  XCircle
} from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import Markdown from "../Markdown"
import { PlaygroundToolInvocation } from "./message-groups"

const OUTPUT_CLAMP_HEIGHT = 200
const MAX_PREVIEW_CHARS = 2000

type Props = {
  invocation: PlaygroundToolInvocation
}

const formatArgs = (args: unknown): string => {
  if (!args || (typeof args === "object" && Object.keys(args).length === 0)) {
    return ""
  }

  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}

const ToolOutput = ({
  content,
  noOutputLabel,
  outputLabel
}: {
  content: string
  noOutputLabel: string
  outputLabel: string
}) => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const rawContent = content.trim().length > 0 ? content : noOutputLabel
  const isTruncatable = rawContent.length > MAX_PREVIEW_CHARS
  const displayContent = !isExpanded && isTruncatable
    ? rawContent.slice(0, MAX_PREVIEW_CHARS)
    : rawContent
  const [isHeightClamped, setIsHeightClamped] = React.useState(false)

  React.useEffect(() => {
    const el = contentRef.current
    if (el) {
      setIsHeightClamped(el.scrollHeight > OUTPUT_CLAMP_HEIGHT)
    }
  }, [displayContent])

  const showToggle = isTruncatable || isHeightClamped

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
        {outputLabel}
      </p>
      <div
        ref={contentRef}
        className="relative overflow-hidden rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-white/5 dark:text-gray-300"
        style={
          !isExpanded && isHeightClamped
            ? { maxHeight: OUTPUT_CLAMP_HEIGHT }
            : undefined
        }>
        <Markdown message={displayContent} />
        {!isExpanded && isHeightClamped && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-50 dark:from-[#1a1a1a]" />
        )}
      </div>
      {showToggle && (
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  )
}

export const McpInvocationBlock = ({ invocation }: Props) => {
  const { t } = useTranslation("common")
  const [isOpen, setIsOpen] = React.useState(
    false
  )

  const hasResult = Boolean(invocation.result)
  const isError = Boolean(invocation.result?.toolError)
  const formattedArgs = formatArgs(invocation.args)

  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-white/10">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5 rounded-xl">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 dark:border-white/10 dark:text-gray-400">
          <Wrench className="size-3" />
        </span>
        <span className="min-w-0 flex-1 text-left font-medium truncate">
          {invocation.displayName}
        </span>
        {invocation.serverName && (
          <span className="hidden sm:inline shrink-0 text-xs text-gray-400 dark:text-gray-500">
            {invocation.serverName}
          </span>
        )}
        <span className="shrink-0">
          {hasResult ? (
            isError ? (
              <XCircle className="size-3.5 text-red-500" />
            ) : (
              <CheckCircle2 className="size-3.5 text-green-500" />
            )
          ) : (
            <Loader2 className="size-3.5 animate-spin text-gray-400" />
          )}
        </span>
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-gray-200/80 px-3 py-2.5 dark:border-white/10">
          {formattedArgs.length > 0 && (
            <div className="mb-2.5">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("mcp.arguments")}
              </p>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-300">
                {formattedArgs}
              </pre>
            </div>
          )}

          {invocation.result && (
            <ToolOutput
              content={invocation.result.content}
              noOutputLabel={t("mcp.noOutput")}
              outputLabel={t("mcp.output")}
            />
          )}
        </div>
      )}
    </div>
  )
}
