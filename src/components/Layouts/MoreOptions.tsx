import {
  MoreHorizontal,
  FileText,
  Share2,
  FileJson,
  FileCode,
  ImageIcon
} from "lucide-react"
import { Dropdown, MenuProps, message } from "antd"
import { Message } from "@/types/message"
import { useState } from "react"
import { ShareModal } from "../Common/ShareModal"
import { useTranslation } from "react-i18next"
import { removeModelSuffix } from "@/db/models"
import { PlaygroundMessage } from "../Common/Playground/Message"
import ReactDOM from "react-dom"
import html2canvas from "html2canvas"
import { ImageExportWrapper } from "../Common/ImageExport"
interface MoreOptionsProps {
  messages: Message[]
  historyId: string
  shareModeEnabled: boolean
}
const formatAsText = (messages: Message[]) => {
  return messages
    .map((msg) => {
      const text = `${msg.isBot ? removeModelSuffix(`${msg.modelName || msg.name}`?.replaceAll(/accounts\/[^\/]+\/models\//g, "")) : "You"}: ${msg.message}`
      return text
    })
    .join("\n\n")
}
const formatAsMarkdown = (messages: Message[]) => {
  return messages
    .map((msg) => {
      let content = `**${msg.isBot ? removeModelSuffix(`${msg.modelName || msg.name}`?.replaceAll(/accounts\/[^\/]+\/models\//g, "")) : "You"}**:\n${msg.message}`

      if (msg.images && msg.images.length > 0) {
        const imageMarkdown = msg.images
          .filter((img) => img.length > 0)
          .map((img) => `\n\n![Image](${img})`)
          .join("\n")
        content += imageMarkdown
      }

      return content
    })
    .join("\n\n")
}

const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const generateChatImage = async (messages: Message[]) => {
  const root = document.createElement("div")
  document.body.appendChild(root)
  const element = <ImageExportWrapper messages={messages} />
  ReactDOM.render(element, root)
  await new Promise((resolve) => setTimeout(resolve, 100))
  const container = document.getElementById("export-container")
  if (!container) {
    throw new Error("Export container not found")
  }
  const canvas = await html2canvas(container, {
    useCORS: true,
    backgroundColor: "#ffffff",
    scale: 2
  })
  ReactDOM.unmountComponentAtNode(root)
  document.body.removeChild(root)

  return canvas.toDataURL("image/png")
}

export const MoreOptions = ({
  shareModeEnabled = false,
  historyId,
  messages
}: MoreOptionsProps) => {
  const { t } = useTranslation("option")
  const [onShareOpen, setOnShareOpen] = useState(false)
  const baseItems: MenuProps["items"] = [
    {
      type: "group",
      label: t("more.copy.group"),
      children: [
        {
          key: "copy-text",
          label: t("more.copy.asText"),
          icon: <FileText className="w-4 h-4" />,
          onClick: () => {
            navigator.clipboard.writeText(formatAsText(messages))
            message.success(t("more.copy.success"))
          }
        },
        {
          key: "copy-markdown",
          label: t("more.copy.asMarkdown"),
          icon: <FileCode className="w-4 h-4" />,
          onClick: () => {
            navigator.clipboard.writeText(formatAsMarkdown(messages))
            message.success(t("more.copy.success"))
          }
        }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "group",
      label: t("more.download.group"),
      children: [
        {
          key: "download-txt",
          label: t("more.download.text"),
          icon: <FileText className="w-4 h-4" />,
          onClick: () => {
            downloadFile(formatAsText(messages), "chat.txt")
          }
        },
        {
          key: "download-md",
          label: t("more.download.markdown"),
          icon: <FileCode className="w-4 h-4" />,
          onClick: () => {
            downloadFile(formatAsMarkdown(messages), "chat.md")
          }
        },
        {
          key: "download-json",
          label: t("more.download.json"),
          icon: <FileJson className="w-4 h-4" />,
          onClick: () => {
            const jsonContent = JSON.stringify(messages, null, 2)
            downloadFile(jsonContent, "chat.json")
          }
        },
        {
          key: "download-image",
          label: t("more.download.image"),
          icon: <ImageIcon className="w-4 h-4" />,
          onClick: async () => {
            try {
              const dataUrl = await generateChatImage(messages)
              const link = document.createElement("a")
              link.download = `chat_${new Date().toISOString()}.png`
              link.href = dataUrl
              link.click()
            } catch (e) {
              message.error("Failed to generate image")
            }
          }
        }
      ]
    }
  ]

  const shareItem = {
    type: "divider"
  } as const

  const shareOption = {
    key: "share",
    label: t("more.share"),
    icon: <Share2 className="w-4 h-4" />,
    onClick: () => {
      setOnShareOpen(true)
    }
  }

  const items = shareModeEnabled
    ? [...baseItems, shareItem, shareOption]
    : baseItems

  return (
    <>
      <Dropdown
        menu={{
          items
        }}
        trigger={["click"]}
        placement="bottomRight">
        <button className="!text-gray-500 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </Dropdown>
      <ShareModal
        open={onShareOpen}
        historyId={historyId}
        messages={messages}
        setOpen={setOnShareOpen}
      />
    </>
  )
}
