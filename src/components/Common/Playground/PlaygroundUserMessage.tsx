import { useTTS } from "@/hooks/useTTS"
import { useStorage } from "@plasmohq/storage/hook"
import React from "react"
import { useTranslation } from "react-i18next"
import { EditMessageForm } from "./EditMessageForm"
import { Image, Tag, Tooltip } from "antd"
import { CheckIcon, CopyIcon, Pen, PlayIcon, Square } from "lucide-react"
import { HumanMessage } from "./HumanMessge"

type Props = {
  message: string
  message_type?: string
  hideCopy?: boolean
  botAvatar?: JSX.Element
  userAvatar?: JSX.Element
  isBot: boolean
  name: string
  images?: string[]
  currentMessageIndex: number
  totalMessages: number
  onRengerate: () => void
  onEditFormSubmit: (value: string, isSend: boolean) => void
  isProcessing: boolean
  webSearch?: {}
  isSearchingInternet?: boolean
  sources?: any[]
  hideEditAndRegenerate?: boolean
  onSourceClick?: (source: any) => void
  isTTSEnabled?: boolean
  generationInfo?: any
  isStreaming: boolean
  reasoningTimeTaken?: number
  openReasoning?: boolean
  modelImage?: string
  modelName?: string
}

export const PlaygroundUserMessageBubble: React.FC<Props> = (props) => {
  const [checkWideMode] = useStorage("checkWideMode", false)
  const [isBtnPressed, setIsBtnPressed] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const { t } = useTranslation("common")
  const { cancel, isSpeaking, speak } = useTTS()

  return (
    <div
      className={`group gap-2 relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 md:px-4 lg:w-4/5 text-[#242424] dark:text-gray-100 ${checkWideMode ? "max-w-none" : ""}`}>
      {!editMode && props?.message_type ? (
        <Tag color={tagColors[props?.message_type] || "default"}>
          {t(`copilot.${props?.message_type}`)}
        </Tag>
      ) : null}
      <div
        dir="auto"
        className={`message-bubble bg-gray-50 dark:bg-[#242424] rounded-3xl prose dark:prose-invert break-words text-primary min-h-7 prose-p:opacity-95 prose-strong:opacity-100 bg-foreground border border-input-border max-w-[100%] sm:max-w-[90%] px-4 py-2.5 rounded-br-lg dark:border-[#2D2D2D] ${
          props.message_type && !editMode ? "italic" : ""
        }`}>
        {!editMode ? (
          <HumanMessage message={props.message} />
        ) : (
          <div className="w-screen max-w-[100%]">
            <EditMessageForm
              value={props.message}
              onSumbit={props.onEditFormSubmit}
              onClose={() => setEditMode(false)}
              isBot={props.isBot}
            />
          </div>
        )}
      </div>

      {props.images &&
        props.images.filter((img) => img.length > 0).length > 0 && (
          <div>
            {props.images
              .filter((image) => image.length > 0)
              .map((image, index) => (
                <Image
                  key={index}
                  src={image}
                  alt="Uploaded Image"
                  width={180}
                  className="rounded-lg relative"
                />
              ))}
          </div>
        )}

      {!props.isProcessing && !editMode ? (
        <div
          className={`space-x-2 gap-2 flex ${
            props.currentMessageIndex !== props.totalMessages - 1
              ? //  there is few style issue so i am commenting this out for v1.4.5 release
                // next release we will fix this
                "invisible group-hover:visible"
              : // ? "hidden group-hover:flex"
                ""
            // : "flex"
          }`}>
          {props.isTTSEnabled && (
            <Tooltip title={t("tts")}>
              <button
                aria-label={t("tts")}
                onClick={() => {
                  if (isSpeaking) {
                    cancel()
                  } else {
                    speak({
                      utterance: props.message
                    })
                  }
                }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                {!isSpeaking ? (
                  <PlayIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                ) : (
                  <Square className="w-3 h-3 text-red-400 group-hover:text-red-500" />
                )}
              </button>
            </Tooltip>
          )}
          {!props.hideCopy && (
            <Tooltip title={t("copyToClipboard")}>
              <button
                aria-label={t("copyToClipboard")}
                onClick={() => {
                  navigator.clipboard.writeText(props.message)
                  setIsBtnPressed(true)
                  setTimeout(() => {
                    setIsBtnPressed(false)
                  }, 2000)
                }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                {!isBtnPressed ? (
                  <CopyIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                ) : (
                  <CheckIcon className="w-3 h-3 text-green-400 group-hover:text-green-500" />
                )}
              </button>
            </Tooltip>
          )}

          {!props.hideEditAndRegenerate && (
            <Tooltip title={t("edit")}>
              <button
                onClick={() => setEditMode(true)}
                aria-label={t("edit")}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                <Pen className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
              </button>
            </Tooltip>
          )}
        </div>
      ) : (
        // add invisible div to prevent layout shift
        <div className="invisible">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"></div>
        </div>
      )}
    </div>
  )
}
