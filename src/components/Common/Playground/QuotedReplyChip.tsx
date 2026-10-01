import React from "react"
import { CornerDownRight, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useQuoteReply } from "@/store/quote"

type Props = {
  className?: string
}

/**
 * Shown above the composer while a quoted selection is pending.
 */
export const QuotedReplyChip: React.FC<Props> = ({ className }) => {
  const { t } = useTranslation("common")
  const quotedText = useQuoteReply((state) => state.quotedText)
  const clearQuotedText = useQuoteReply((state) => state.clearQuotedText)

  if (!quotedText) {
    return null
  }

  return (
    <div
      className={`flex items-start gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-[#404040] ${className || ""}`}>
      <CornerDownRight className="mt-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-500" />
      <p
        dir="auto"
        className="m-0 line-clamp-3 flex-1 whitespace-pre-line break-words text-sm text-gray-600 dark:text-gray-300">
        {quotedText}
      </p>
      <button
        type="button"
        onClick={clearQuotedText}
        aria-label={t("quoteReply.remove", "Remove quote")}
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#404040] dark:hover:text-gray-100">
        <X className="size-4" />
      </button>
    </div>
  )
}
