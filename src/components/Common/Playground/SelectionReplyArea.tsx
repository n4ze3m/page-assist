import React from "react"
import { CornerDownRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"
import { useQuoteReply } from "@/store/quote"
import { normalizeQuoteText } from "@/utils/quote-reply"

type Props = {
  children: React.ReactNode
  className?: string
}

type PopoverState = {
  text: string
  top: number
  bottom: number
  left: number
  // Distance from the top of the viewport; used to decide whether the
  // popover fits above the selection or has to go below it.
  viewportTop: number
}

const POPOVER_HEIGHT = 36

/**
 * Wraps assistant message content. When the user selects text inside it, a
 * small "Reply" popover appears next to the selection; clicking it stores the
 * selection as a quote for the next message (see `useQuoteReply`).
 */
export const SelectionReplyArea: React.FC<Props> = ({
  children,
  className
}) => {
  const [enabled] = useStorage("enableQuoteReply", true)
  const { t } = useTranslation("common")
  const setQuotedText = useQuoteReply((state) => state.setQuotedText)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [popover, setPopover] = React.useState<PopoverState | null>(null)

  const updateFromSelection = React.useCallback(() => {
    const container = containerRef.current
    const selection = window.getSelection()

    if (
      !container ||
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed
    ) {
      setPopover(null)
      return
    }

    const range = selection.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) {
      setPopover(null)
      return
    }

    const text = normalizeQuoteText(selection.toString())
    if (!text) {
      setPopover(null)
      return
    }

    const rect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    setPopover({
      text,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      left: rect.left - containerRect.left + rect.width / 2,
      viewportTop: rect.top
    })
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      setPopover(null)
      return
    }

    const container = containerRef.current
    if (!container) return

    let frame: number | null = null
    const scheduleUpdate = () => {
      // The selection is finalised after the event has been dispatched.
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = null
        updateFromSelection()
      })
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.shiftKey || event.key === "Shift") {
        scheduleUpdate()
      }
    }

    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setPopover(null)
      }
    }

    container.addEventListener("mouseup", scheduleUpdate)
    container.addEventListener("keyup", handleKeyUp)
    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      container.removeEventListener("mouseup", scheduleUpdate)
      container.removeEventListener("keyup", handleKeyUp)
      document.removeEventListener("selectionchange", handleSelectionChange)
    }
  }, [enabled, updateFromSelection])

  const handleReply = () => {
    if (!popover) return
    setQuotedText(popover.text)
    window.getSelection()?.removeAllRanges()
    setPopover(null)
  }

  let popoverStyle: React.CSSProperties | undefined
  if (popover && containerRef.current) {
    const width = containerRef.current.clientWidth
    const left = Math.min(Math.max(popover.left, 48), Math.max(width - 48, 48))
    const fitsAbove = popover.viewportTop >= POPOVER_HEIGHT + 8
    popoverStyle = {
      left,
      top: fitsAbove ? popover.top - 6 : popover.bottom + 6,
      transform: fitsAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)"
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {children}
      {enabled && popover && (
        <button
          type="button"
          // Prevent the mousedown from collapsing the selection before click.
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleReply}
          aria-label={t("quoteReply.reply", "Reply")}
          style={popoverStyle}
          className="absolute z-20 flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-lg transition-colors hover:bg-gray-100 dark:border-[#404040] dark:bg-[#2a2a2a] dark:text-gray-100 dark:hover:bg-[#353535]">
          <CornerDownRight className="size-3.5" />
          {t("quoteReply.reply", "Reply")}
        </button>
      )}
    </div>
  )
}
