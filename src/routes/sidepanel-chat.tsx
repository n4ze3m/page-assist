import {
  formatToChatHistory,
  formatToMessage,
  getRecentChatFromCopilot
} from "@/db"
import useBackgroundMessage from "@/hooks/useBackgroundMessage"
import { copilotResumeLastChat } from "@/services/app"
import { notification } from "antd"
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
    <div
      ref={drop}
      className={`flex ${
        dropState === "dragging" && chatMode === "normal"
          ? "bg-neutral-200 dark:bg-gray-800 z-10"
          : "bg-neutral-50 dark:bg-[#171717]"
      } flex-col min-h-screen mx-auto max-w-7xl`}>
      <div className="sticky top-0 z-10">
        <SidepanelHeader />
      </div>
      <SidePanelBody />

      <div className="bottom-0 w-full bg-transparent border-0 fixed pt-2">
        <div className="stretch mx-2 flex flex-row gap-3 md:mx-4 lg:mx-auto lg:max-w-2xl xl:max-w-3xl">
          <div className="relative flex flex-col h-full flex-1 items-stretch md:flex-col">
            <SidepanelForm dropedFile={dropedFile} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SidepanelChat
