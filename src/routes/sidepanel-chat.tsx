import {
  formatToChatHistory,
  formatToMessage,
  getRecentChatFromCopilot
} from "@/db"
import useBackgroundMessage from "@/hooks/useBackgroundMessage"
import { useSmartScroll } from "@/hooks/useSmartScroll"
import { copilotResumeLastChat } from "@/services/app"
import { notification } from "antd"
import { ChevronDown } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { SidePanelBody } from "~/components/Sidepanel/Chat/body"
import { SidepanelForm } from "~/components/Sidepanel/Chat/form"
import { SidepanelHeader } from "~/components/Sidepanel/Chat/header"
import { useMessage } from "~/hooks/useMessage"

const SidepanelChat = () => {
  const drop = React.useRef<HTMLDivElement>(null)
  const [dropedFile, setDropedFile] = React.useState<File | undefined>()
  const { t } = useTranslation(["playground"])
  const [dropState, setDropState] = React.useState<
    "idle" | "dragging" | "error"
  >("idle")
  const {
    chatMode,
    streaming,
    onSubmit,
    messages,
    setHistory,
    setHistoryId,
    setMessages,
    selectedModel
  } = useMessage()
  const { containerRef, isAtBottom, scrollToBottom } = useSmartScroll(
    messages,
    streaming,
    60
  )

  const bgMsg = useBackgroundMessage()

  const setRecentMessagesOnLoad = async () => {
    const isEnabled = await copilotResumeLastChat()
    if (!isEnabled) {
      return
    }
    if (messages.length === 0) {
      const recentChat = await getRecentChatFromCopilot()
      if (recentChat) {
        setHistoryId(recentChat.history.id)
        setHistory(formatToChatHistory(recentChat.messages))
        setMessages(formatToMessage(recentChat.messages))
      }
    }
  }

  React.useEffect(() => {
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
  }, [])

  React.useEffect(() => {
    setRecentMessagesOnLoad()
  }, [])

  React.useEffect(() => {
    if (bgMsg && !streaming) {
      if (selectedModel) {
        onSubmit({
          message: bgMsg.text,
          messageType: bgMsg.type,
          image: ""
        })
      } else {
        notification.error({
          message: t("formError.noModel")
        })
      }
    }
  }, [bgMsg])

  return (
    <div className="flex h-full w-full">
      <main className="relative h-dvh w-full">
        <div className="relative z-10 w-full">
          <SidepanelHeader />
        </div>
        <div
          ref={drop}
          className={`relative flex h-full flex-col items-center ${
            dropState === "dragging" ? "bg-gray-100 dark:bg-gray-800" : ""
          } bg-white dark:bg-[#171717]`}>
          <div
            ref={containerRef}
            className="custom-scrollbar  flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto px-5">
            <SidePanelBody />
          </div>

          <div className="absolute bottom-0 w-full">
            {!isAtBottom && (
              <div className="fixed bottom-32 z-20 left-0 right-0 flex justify-center">
                <button
                  onClick={scrollToBottom}
                  className="bg-gray-50 shadow border border-gray-200 dark:border-none dark:bg-white/20 p-1.5 rounded-full pointer-events-auto">
                  <ChevronDown className="size-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            )}
            <SidepanelForm dropedFile={dropedFile} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default SidepanelChat
