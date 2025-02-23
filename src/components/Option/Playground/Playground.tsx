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
} from "@/db"
import { getLastUsedChatSystemPrompt } from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"
import { useSmartScroll } from "@/hooks/useSmartScroll"
import { ChevronDown } from "lucide-react"
import { useStorage } from "@plasmohq/storage/hook"
export const Playground = () => {
  const drop = React.useRef<HTMLDivElement>(null)
  const [dropedFile, setDropedFile] = React.useState<File | undefined>()
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
  const { containerRef, isAtBottom, scrollToBottom } = useSmartScroll(
    messages,
    streaming
  )

  const [dropState, setDropState] = React.useState<
    "idle" | "dragging" | "error"
  >("idle")
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

      const isImage = files.every((file) => file.type.startsWith("image/"))

      if (!isImage) {
        setDropState("error")
        return
      }

      const newFiles = Array.from(e.dataTransfer?.files || []).slice(0, 1)
      if (newFiles.length > 0) {
        setDropedFile(newFiles[0])
      }
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("dragging")
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

        const lastUsedPrompt = await getLastUsedChatSystemPrompt(
          recentChat.history.id
        )
        if (lastUsedPrompt) {
          if (lastUsedPrompt.prompt_id) {
            const prompt = await getPromptById(lastUsedPrompt.prompt_id)
            if (prompt) {
              setSelectedSystemPrompt(lastUsedPrompt.prompt_id)
              setSystemPrompt(lastUsedPrompt.prompt_content)
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
      className={`relative flex h-full flex-col items-center ${
        dropState === "dragging" ? "bg-gray-100 dark:bg-gray-800" : ""
      } bg-white dark:bg-[#171717]`}>
      <div
        ref={containerRef}
        className="custom-scrollbar flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto px-5">
        <PlaygroundChat />
      </div>
      <div className="absolute bottom-0 w-full">
        {!isAtBottom && (
          <div className="fixed bottom-28 z-20 left-0 right-0 flex justify-center">
            <button
              onClick={scrollToBottom}
              className="bg-gray-50 shadow border border-gray-200 dark:border-none dark:bg-white/20 p-1.5 rounded-full pointer-events-auto">
              <ChevronDown className="size-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}
        <PlaygroundForm dropedFile={dropedFile} />
      </div>
    </div>
  )
}
