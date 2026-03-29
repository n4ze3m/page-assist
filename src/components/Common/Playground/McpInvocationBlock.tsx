import {
  AlertTriangle,
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
import { useStoreMessageOption } from "@/store/option"

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
  const pendingMcpApproval = useStoreMessageOption(
    (state) => state.pendingMcpApproval
  )
  const [feedback, setFeedback] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(
    false
  )

  const hasResult = Boolean(invocation.result)
  const isError = Boolean(invocation.result?.toolError)
  const formattedArgs = formatArgs(invocation.args)
  const isPendingApproval =
    pendingMcpApproval?.toolCallId === invocation.id && !hasResult

  const handleApprove = React.useCallback(() => {
    setIsOpen(false)
    pendingMcpApproval?.approve()
  }, [pendingMcpApproval])

  const handleReject = React.useCallback((reason?: string) => {
    setIsOpen(false)
    pendingMcpApproval?.reject(reason)
  }, [pendingMcpApproval])

  React.useEffect(() => {
    if (isPendingApproval) {
      setIsOpen(true)
    }
  }, [isPendingApproval])

  React.useEffect(() => {
    if (!isPendingApproval) {
      setFeedback("")
    }
  }, [isPendingApproval])

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
        {isPendingApproval && (
          <span className="hidden sm:inline shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {t("mcp.approvalRequired", "Approval required")}
          </span>
        )}
        <span className="shrink-0">
          {isPendingApproval ? (
            <AlertTriangle className="size-3.5 text-amber-500" />
          ) : hasResult ? (
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
          {isPendingApproval && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                {t("mcp.approvalPrompt", "Approve this MCP tool call before it runs.")}
              </p>
              <input
                type="text"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && feedback.trim().length > 0) {
                    event.preventDefault()
                    handleReject(feedback.trim())
                  }
                }}
                placeholder={t(
                  "mcp.rejectionReasonPlaceholder",
                  "Optional rejection reason"
                )}
                className="mb-2 w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none ring-0 placeholder:text-gray-400 focus:border-amber-400 dark:border-amber-500/20 dark:bg-[#1f1f1f] dark:text-gray-200 dark:placeholder:text-gray-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleApprove()
                  }}
                  className="inline-flex items-center justify-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                  {t("mcp.approve", "Approve")}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleReject(feedback.trim() || undefined)
                  }}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5">
                  {feedback.trim().length > 0
                    ? t("mcp.rejectWithReason", "Reject with note")
                    : t("mcp.reject", "Reject")}
                </button>
              </div>
            </div>
          )}

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
