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
export const Playground = () => {
  const drop = React.useRef<HTMLDivElement>(null)
  const [dropedFile, setDropedFile] = React.useState<File | undefined>()
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
    streaming,
    webuiTemporaryChat,
    setTemporaryChat
  } = useMessageOption()
  const { setSystemPrompt } = useStoreChatModelSettings()
  const { containerRef, isAutoScrollToBottom, autoScrollToBottom } =
    useSmartScroll(messages, streaming, 120)

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

      const hasUnsupportedFiles = files.some((file) =>
        otherUnsupportedTypes.includes(file.type)
      )

      if (hasUnsupportedFiles) {
        setDropState("error")
        return
      }

      const newFiles = Array.from(e.dataTransfer?.files || []).slice(0, 5) // Allow multiple files
      if (newFiles.length > 0) {
        newFiles.forEach((file) => {
          setDropedFile(file)
        })
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

  React.useEffect(() => {
    if (webuiTemporaryChat) {
      setTemporaryChat(true)
    }
  }, [webuiTemporaryChat])

  return (
    <div
      ref={drop}
      data-is-dragging={dropState === "dragging"}
      className="relative flex h-full flex-col items-center bg-white dark:bg-[#1a1a1a] data-[is-dragging=true]:bg-gray-100 data-[is-dragging=true]:dark:bg-gray-800"
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
          className="absolute inset-0 bg-white dark:bg-[#1a1a1a]"
          style={{ opacity: 0.9, pointerEvents: "none" }}
        />
      )}

      <div
        ref={containerRef}
        className="custom-scrollbar flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto px-5 relative z-10">
        <PlaygroundChat />
      </div>
      <div className="absolute bottom-0 w-full z-10">
        {!isAutoScrollToBottom && (
          <div className="absolute bottom-full mb-2 z-10 left-0 right-0 flex justify-center pointer-events-none">
            <button
              onClick={() => autoScrollToBottom()}
              className="bg-gray-50 shadow border border-gray-200 dark:border-none dark:bg-white/20 p-1.5 rounded-full pointer-events-auto hover:bg-gray-100 dark:hover:bg-white/30 transition-colors">
              <ChevronDown className="size-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}
        <PlaygroundForm dropedFile={dropedFile} />
      </div>
    </div>
  )
}
