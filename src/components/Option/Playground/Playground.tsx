import React from "react"
import { PlaygroundForm } from "./PlaygroundForm"
import { PlaygroundChat } from "./PlaygroundChat"
import { useMessageOption } from "@/hooks/useMessageOption"
import { webUIResumeLastChat } from "@/services/app"
import {
  formatToChatHistory,
  formatToMessage,
  getPromptById,
  getRecentChatFromWebUI
} from "@/db/dexie/helpers"
import { useStoreChatModelSettings } from "@/store/model"
import { useSmartScroll } from "@/hooks/useSmartScroll"
import { ChevronDown } from "lucide-react"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"
import { otherUnsupportedTypes } from "../Knowledge/utils/unsupported-types"
import { useTranslation } from "react-i18next"
export const Playground = () => {
  const drop = React.useRef<HTMLDivElement>(null)
  const [dropedFile, setDropedFile] = React.useState<File | undefined>()
  const { t } = useTranslation(["playground"])
  const [chatBackgroundImage] = useStorage({
    key: "chatBackgroundImage",
    instance: new Storage({
      area: "local"
    })
  })

  const {
    selectedKnowledge,
    messages,
    setHistoryId,
    setHistory,
    setMessages,
    setSelectedSystemPrompt,
    streaming
  } = useMessageOption()
  const { setSystemPrompt } = useStoreChatModelSettings()
  const { containerRef, isAutoScrollToBottom, autoScrollToBottom } =
    useSmartScroll(messages, streaming, 120)

  const [dropState, setDropState] = React.useState<
    "idle" | "dragging" | "error"
  >("idle")
  const [dropFeedback, setDropFeedback] = React.useState<
    { type: "info" | "error"; message: string } | null
  >(null)
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const showDropFeedback = React.useCallback(
    (feedback: { type: "info" | "error"; message: string }) => {
      setDropFeedback(feedback)
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
      feedbackTimerRef.current = setTimeout(() => {
        setDropFeedback(null)
        feedbackTimerRef.current = null
      }, 4000)
    },
    []
  )

  React.useEffect(() => {
    if (selectedKnowledge) {
      return
    }

    if (!drop.current) {
      return
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setDropState("idle")

      const files = Array.from(e.dataTransfer?.files || [])

      const hasUnsupportedFiles = files.some((file) =>
        otherUnsupportedTypes.includes(file.type)
      )

      if (hasUnsupportedFiles) {
        setDropState("error")
        showDropFeedback({
          type: "error",
          message: t(
            "playground:drop.unsupported",
            "That file type isn’t supported. Try images or text-based files."
          )
        })
        return
      }

      const newFiles = Array.from(e.dataTransfer?.files || []).slice(0, 5) // Allow multiple files
      if (newFiles.length > 0) {
        newFiles.forEach((file) => {
          setDropedFile(file)
        })
        showDropFeedback({
          type: "info",
          message:
            newFiles.length > 1
              ? t("playground:drop.readyMultiple", {
                  count: newFiles.length
                })
              : t("playground:drop.readySingle", {
                  name:
                    newFiles[0]?.name ||
                    t("playground:drop.defaultFileName", "File")
                })
        })
      }
    }
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("dragging")
      showDropFeedback({
        type: "info",
        message: t(
          "playground:drop.hint",
          "Drop files to attach them to your message"
        )
      })
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("idle")
    }

    drop.current.addEventListener("dragover", handleDragOver)
    drop.current.addEventListener("drop", handleDrop)
    drop.current.addEventListener("dragenter", handleDragEnter)
    drop.current.addEventListener("dragleave", handleDragLeave)

    return () => {
      if (drop.current) {
        drop.current.removeEventListener("dragover", handleDragOver)
        drop.current.removeEventListener("drop", handleDrop)
        drop.current.removeEventListener("dragenter", handleDragEnter)
        drop.current.removeEventListener("dragleave", handleDragLeave)
      }
    }
  }, [selectedKnowledge])

  React.useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  const setRecentMessagesOnLoad = async () => {
    const isEnabled = await webUIResumeLastChat()
    if (!isEnabled) {
      return
    }
    if (messages.length === 0) {
      const recentChat = await getRecentChatFromWebUI()
      if (recentChat) {
        setHistoryId(recentChat.history.id)
        setHistory(formatToChatHistory(recentChat.messages))
        setMessages(formatToMessage(recentChat.messages))

        const lastUsedPrompt = recentChat?.history?.last_used_prompt
        if (lastUsedPrompt) {
          if (lastUsedPrompt.prompt_id) {
            const prompt = await getPromptById(lastUsedPrompt.prompt_id)
            if (prompt) {
              setSelectedSystemPrompt(lastUsedPrompt.prompt_id)
              setSystemPrompt(prompt.content)
            }
          }
          setSystemPrompt(lastUsedPrompt.prompt_content)
        }
      }
    }
  }

  React.useEffect(() => {
    setRecentMessagesOnLoad()
  }, [])

  return (
    <div
      ref={drop}
      data-is-dragging={dropState === "dragging"}
      className="relative flex h-full flex-col items-center bg-white dark:bg-[#171717] data-[is-dragging=true]:bg-gray-100 data-[is-dragging=true]:dark:bg-gray-800"
      style={
        chatBackgroundImage
          ? {
              backgroundImage: `url(${chatBackgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }
          : {}
      }>
      {/* Background overlay for opacity effect */}
      {chatBackgroundImage && (
        <div
          className="absolute inset-0 bg-white dark:bg-[#171717]"
          style={{ opacity: 0.9, pointerEvents: "none" }}
        />
      )}

      {dropState === "dragging" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
          <div className="rounded-2xl border border-dashed border-white/70 bg-black/70 px-6 py-4 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm dark:border-white/40">
            {t("playground:drop.hint", "Drop files to attach them to your message")}
          </div>
        </div>
      )}

      {dropFeedback && (
        <div className="pointer-events-none absolute top-4 left-0 right-0 z-30 flex justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className={`max-w-lg rounded-full px-4 py-2 text-sm shadow-lg backdrop-blur-sm ${
              dropFeedback.type === "error"
                ? "bg-red-600 text-white"
                : "bg-slate-900/80 text-white dark:bg-slate-100/90 dark:text-slate-900"
            }`}
          >
            {dropFeedback.message}
          </div>
        </div>
      )}

      <div className="relative z-10 flex h-full w-full flex-col">
        <div
          ref={containerRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={t("playground:aria.chatTranscript", "Chat messages")}
          className="custom-scrollbar flex-1 min-h-0 w-full overflow-x-hidden overflow-y-auto px-5">
          <PlaygroundChat />
        </div>
        <div className="relative w-full">
          {!isAutoScrollToBottom && (
            <div className="pointer-events-none absolute -top-10 left-0 right-0 flex justify-center">
              <button
                onClick={() => autoScrollToBottom()}
                aria-label={t("playground:composer.scrollToLatest", "Scroll to latest messages")}
                title={t("playground:composer.scrollToLatest", "Scroll to latest messages") as string}
                className="bg-gray-50 shadow border border-gray-200 dark:border-none dark:bg-white/20 p-1.5 rounded-full pointer-events-auto hover:bg-gray-100 dark:hover:bg-white/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
                <ChevronDown className="size-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
              </button>
            </div>
          )}
          <PlaygroundForm dropedFile={dropedFile} />
        </div>
      </div>
    </div>
  )
}
