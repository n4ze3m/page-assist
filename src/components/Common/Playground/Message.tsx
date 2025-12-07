import React, { useEffect } from "react"
import { Tag, Image, Tooltip, Collapse, Popover, Avatar } from "antd"
import { IconButton } from "../IconButton"
import { ActionInfo } from "./ActionInfo"
import {
  CheckIcon,
  CopyIcon,
  GitBranchIcon,
  InfoIcon,
  Pen,
  PlayCircle,
  RotateCcw,
  Square,
  Volume2Icon
} from "lucide-react"
import { StopCircle as StopCircleIcon } from "lucide-react"
import { EditMessageForm } from "./EditMessageForm"
import { useTranslation } from "react-i18next"
import { MessageSource } from "./MessageSource"
import { useTTS } from "@/hooks/useTTS"
import { tagColors } from "@/utils/color"
import { removeModelSuffix } from "@/db/dexie/models"
import { GenerationInfo } from "./GenerationInfo"
import { parseReasoning } from "@/libs/reasoning"
import {
  decodeChatErrorPayload,
  type ChatErrorPayload
} from "@/utils/chat-error-message"
import { humanizeMilliseconds } from "@/utils/humanize-milliseconds"
import { useStorage } from "@plasmohq/storage/hook"
import { PlaygroundUserMessageBubble } from "./PlaygroundUserMessage"
import { copyToClipboard } from "@/utils/clipboard"
import { ChatDocuments } from "@/models/ChatTypes"
import { PiGitBranch } from "react-icons/pi"
import { buildChatTextClass } from "@/utils/chat-style"

const Markdown = React.lazy(() => import("../../Common/Markdown"))

const ErrorBubble: React.FC<{
  payload: ChatErrorPayload
  toggleLabels: { show: string; hide: string }
}> = ({ payload, toggleLabels }) => {
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-100">
      <p className="font-semibold">{payload.summary}</p>
      {payload.hint && (
        <p className="mt-1 text-xs text-red-900 dark:text-red-100">
          {payload.hint}
        </p>
      )}
      {payload.detail && (
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="mt-2 text-xs font-medium text-red-800 underline hover:text-red-700 dark:text-red-200 dark:hover:text-red-100">
          {showDetails ? toggleLabels.hide : toggleLabels.show}
        </button>
      )}
      {showDetails && payload.detail && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-red-100/70 p-2 text-xs text-red-900 dark:bg-red-900/40 dark:text-red-100">
          {payload.detail}
        </pre>
      )}
    </div>
  )
}

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
  hideContinue?: boolean
  onSourceClick?: (source: any) => void
  isTTSEnabled?: boolean
  generationInfo?: any
  isStreaming: boolean
  reasoningTimeTaken?: number
  openReasoning?: boolean
  modelImage?: string
  modelName?: string
  onContinue?: () => void
  documents?: ChatDocuments
  actionInfo?: string | null
  onNewBranch?: () => void
  temporaryChat?: boolean
  onStopStreaming?: () => void
  serverChatId?: string | null
  serverMessageId?: string | null
}

export const PlaygroundMessage = (props: Props) => {
  const [isBtnPressed, setIsBtnPressed] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const [checkWideMode] = useStorage("checkWideMode", false)
  const [isUserChatBubble] = useStorage("userChatBubble", true)
  const [autoCopyResponseToClipboard] = useStorage(
    "autoCopyResponseToClipboard",
    false
  )
  const [autoPlayTTS] = useStorage("isTTSAutoPlayEnabled", false)
  const [copyAsFormattedText] = useStorage("copyAsFormattedText", false)
  const [userTextColor] = useStorage("chatUserTextColor", "default")
  const [assistantTextColor] = useStorage("chatAssistantTextColor", "default")
  const [userTextFont] = useStorage("chatUserTextFont", "default")
  const [assistantTextFont] = useStorage("chatAssistantTextFont", "default")
  const [userTextSize] = useStorage("chatUserTextSize", "md")
  const [assistantTextSize] = useStorage("chatAssistantTextSize", "md")
  const { t } = useTranslation("common")
  const { cancel, isSpeaking, speak } = useTTS()
  const isLastMessage: boolean =
    props.currentMessageIndex === props.totalMessages - 1
  const errorPayload = decodeChatErrorPayload(props.message)
  const errorFriendlyText = React.useMemo(() => {
    if (!errorPayload) return null
    return [errorPayload.summary, errorPayload.hint, errorPayload.detail]
      .filter(Boolean)
      .join("\n")
  }, [errorPayload])

  const autoCopyToClipboard = async () => {
    if (
      autoCopyResponseToClipboard &&
      props.isBot &&
      isLastMessage &&
      !props.isStreaming &&
      !props.isProcessing &&
      props.message.trim().length > 0 &&
      !errorPayload
    ) {
      await copyToClipboard({
        text: props.message,
        formatted: copyAsFormattedText
      })
      setIsBtnPressed(true)
      setTimeout(() => {
        setIsBtnPressed(false)
      }, 2000)
    }
  }

  useEffect(() => {
    autoCopyToClipboard()
  }, [
    autoCopyResponseToClipboard,
    props.isBot,
    props.currentMessageIndex,
    props.totalMessages,
    props.isStreaming,
    props.isProcessing,
    props.message
  ])

  const userTextClass = React.useMemo(
    () => buildChatTextClass(userTextColor, userTextFont, userTextSize),
    [userTextColor, userTextFont, userTextSize]
  )

  const assistantTextClass = React.useMemo(
    () =>
      buildChatTextClass(
        assistantTextColor,
        assistantTextFont,
        assistantTextSize
      ),
    [assistantTextColor, assistantTextFont, assistantTextSize]
  )

  const chatTextClass = props.isBot ? assistantTextClass : userTextClass
  useEffect(() => {
    if (
      autoPlayTTS &&
      props.isTTSEnabled &&
      props.isBot &&
      isLastMessage &&
      !props.isStreaming &&
      !props.isProcessing &&
      props.message.trim().length > 0 &&
      !errorPayload
    ) {
      let messageToSpeak = props.message

      speak({
        utterance: messageToSpeak
      })
    }
  }, [
    autoPlayTTS,
    props.isTTSEnabled,
    props.isBot,
    props.currentMessageIndex,
    props.totalMessages,
    props.isStreaming,
    props.isProcessing,
    props.message,
    errorPayload
  ])

  if (isUserChatBubble && !props.isBot) {
    return <PlaygroundUserMessageBubble {...props} />
  }

  const MARKDOWN_BASE_CLASSES =
    "prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark"

  return (
    <div
      className={`group relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 md:px-4 text-gray-800 dark:text-gray-100 ${checkWideMode ? "max-w-none" : ""}`}>
      {/* Inline stop button while streaming on the latest assistant message */}
      {props.isBot && (props.isStreaming || props.isProcessing) && isLastMessage && props.onStopStreaming && (
        <div className="absolute right-2 top-0 z-10">
          <Tooltip title={t("playground:tooltip.stopStreaming") as string}>
            <button
              type="button"
              onClick={props.onStopStreaming}
              className="text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md p-1 bg-white/70 dark:bg-[#1f1f1f]/70 backdrop-blur hover:bg-white dark:hover:bg-[#2a2a2a]">
              <StopCircleIcon className="w-5 h-5" />
              <span className="sr-only">{t("playground:composer.stopStreaming")}</span>
            </button>
          </Tooltip>
        </div>
      )}
      {/* <div className="text-base md:max-w-2xl lg:max-w-xl xl:max-w-3xl flex lg:px-0 m-auto w-full"> */}
      <div className="flex flex-row gap-4 md:gap-6 my-2 m-auto w-full">
        <div className="w-8 flex flex-col relative items-end">
          {props.isBot ? (
            !props.modelImage ? (
              <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center  text-opacity-100">
                <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-green-300 to-purple-400"></div>
              </div>
            ) : (
              <Avatar
                src={props.modelImage}
                alt={props.name}
                className="size-8"
              />
            )
          ) : !props.userAvatar ? (
            <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center  text-opacity-100">
              <div className="absolute h-8 w-8 rounded-full from-blue-400 to-blue-600 bg-gradient-to-r"></div>
            </div>
          ) : (
            props.userAvatar
          )}
        </div>
        <div className="flex w-[calc(100%-50px)] flex-col gap-2 lg:w-[calc(100%-115px)]">
          <span className="text-xs font-bold text-gray-800 dark:text-white">
            {props.isBot
              ? removeModelSuffix(
                  `${props?.modelName || props?.name}`?.replaceAll(
                    /accounts\/[^\/]+\/models\//g,
                    ""
                  )
                )
              : "You"}
          </span>

          {props.isBot && props.isSearchingInternet && isLastMessage ? (
            <ActionInfo action={"webSearch"} />
          ) : null}
          {props.isBot && props.actionInfo && isLastMessage ? (
            <ActionInfo action={props.actionInfo} />
          ) : null}
          <div>
            {props?.message_type && (
              <Tag color={tagColors[props?.message_type] || "default"}>
                {t(`copilot.${props?.message_type}`)}
              </Tag>
            )}
          </div>
          <div className="flex flex-grow flex-col">
            {!editMode ? (
              props.isBot ? (
                errorPayload ? (
                  <ErrorBubble
                    payload={errorPayload}
                    toggleLabels={{
                      show: t(
                        "error.showDetails",
                        "Show technical details"
                      ) as string,
                      hide: t(
                        "error.hideDetails",
                        "Hide technical details"
                      ) as string
                    }}
                  />
                ) : (
                  <>
                    {parseReasoning(props.message).map((e, i) => {
                      if (e.type === "reasoning") {
                        return (
                          <Collapse
                            key={i}
                            className="border-none text-gray-500 dark:text-gray-400 !mb-3 "
                            defaultActiveKey={
                              props?.openReasoning ? "reasoning" : undefined
                            }
                            items={[
                              {
                                key: "reasoning",
                                label:
                                  props.isStreaming && e?.reasoning_running ? (
                                    <div className="flex items-center gap-2">
                                      <span className="italic shimmer-text">
                                        {t("reasoning.thinking", "Thinking…")}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <span>
                                        {t(
                                          "reasoning.thought",
                                          "Model’s reasoning (optional)"
                                        )}
                                      </span>
                                      {props.reasoningTimeTaken != null && (
                                        <span className="text-[11px] text-gray-400">
                                          {humanizeMilliseconds(
                                            props.reasoningTimeTaken
                                          )}
                                        </span>
                                      )}
                                    </span>
                                  ),
                                children: (
                                  <React.Suspense
                                    fallback={
                                      <p
                                        className={`text-sm text-gray-500 dark:text-gray-400 ${assistantTextClass}`}>
                                        {t("reasoning.loading")}
                                      </p>
                                    }>
                                    <Markdown
                                      message={e.content}
                                      className={`${MARKDOWN_BASE_CLASSES} ${assistantTextClass}`}
                                    />
                                  </React.Suspense>
                                )
                              }
                            ]}
                          />
                        )
                      }

                      return (
                        <React.Suspense
                          key={i}
                          fallback={
                            <p
                              className={`text-sm text-gray-500 dark:text-gray-400 ${assistantTextClass}`}>
                              {t("loading.content")}
                            </p>
                          }>
                          <Markdown
                            message={e.content}
                            className={`${MARKDOWN_BASE_CLASSES} ${assistantTextClass}`}
                          />
                        </React.Suspense>
                      )
                    })}
                  </>
                )
              ) : (
                <p
                  className={`prose dark:prose-invert whitespace-pre-line prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark ${chatTextClass} ${
                    props.message_type &&
                    "italic text-gray-500 dark:text-gray-400 text-sm"
                  }
                  ${checkWideMode ? "max-w-none" : ""}
                  `}>
                  {props.message}
                </p>
              )
            ) : (
              <EditMessageForm
                value={props.message}
                onSumbit={props.onEditFormSubmit}
                onClose={() => setEditMode(false)}
                isBot={props.isBot}
              />
            )}
          </div>
          {/* images if available */}
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
                      className="rounded-md relative"
                    />
                  ))}
              </div>
            )}

          {/* uploaded documents if available */}
          {/* {props.documents && props.documents.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {props.documents.map((doc, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                    <FileIcon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{doc.filename || "Unknown file"}</span>
                      {doc.fileSize && (
                        <span className="text-xs opacity-70">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                          {doc.processed !== undefined && (
                            <span className="ml-2">
                              {doc.processed ? "✓ Processed" : "⚠ Processing..."}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {props.isBot && props?.sources && props?.sources.length > 0 && (
            <Collapse
              className="mt-6"
              ghost
              items={[
                {
                  key: "1",
                  label: (
                    <div className="italic text-gray-500 dark:text-gray-400">
                      {t("citations")}
                    </div>
                  ),
                  children: (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {props?.sources?.map((source, index) => (
                        <MessageSource
                          onSourceClick={props.onSourceClick}
                          key={index}
                          source={source}
                        />
                      ))}
                    </div>
                  )
                }
              ]}
            />
          )}
          {!props.isProcessing && !editMode ? (
            <div
              className={`space-x-2 gap-2 flex ${
                props.currentMessageIndex !== props.totalMessages - 1
                  ? "invisible group-hover:visible group-focus-within:visible"
                  : ""
              }`}>
              {props.isTTSEnabled && (
                <Tooltip title={t("tts")}>
                  <IconButton
                    ariaLabel={t("tts") as string}
                    onClick={() => {
                      if (isSpeaking) {
                        cancel()
                      } else {
                        speak({
                          utterance: errorFriendlyText || props.message
                        })
                      }
                    }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    <span className="inline-flex items-center gap-1">
                      {!isSpeaking ? (
                        <Volume2Icon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      ) : (
                        <Square className="w-3 h-3 text-red-400 group-hover:text-red-500" />
                      )}
                      <span
                        className={`text-[10px] text-gray-500 dark:text-gray-400 hidden group-focus-within:inline ${
                          isLastMessage ? "inline" : ""
                        }`}
                      >
                        {t("ttsShort", "TTS")}
                      </span>
                    </span>
                  </IconButton>
                </Tooltip>
              )}
              {!props.hideCopy && (
                <Tooltip title={t("copyToClipboard")}>
                  <IconButton
                    ariaLabel={t("copyToClipboard") as string}
                    onClick={async () => {
                      await copyToClipboard({
                        text: errorFriendlyText || props.message,
                        formatted: copyAsFormattedText
                      })

                      // navigator.clipboard.writeText(props.message)
                      setIsBtnPressed(true)
                      setTimeout(() => {
                        setIsBtnPressed(false)
                      }, 2000)
                    }}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    <span className="inline-flex items-center gap-1">
                      {!isBtnPressed ? (
                        <CopyIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      ) : (
                        <CheckIcon className="w-3 h-3 text-green-400 group-hover:text-green-500" />
                      )}
                      <span
                        className={`text-[10px] text-gray-500 dark:text-gray-400 hidden group-focus-within:inline ${
                          isLastMessage ? "inline" : ""
                        }`}
                      >
                        {t("copyShort", "Copy")}
                      </span>
                    </span>
                  </IconButton>
                </Tooltip>
              )}
              {props.isBot && (
                <>
                  {props.generationInfo && (
                    <Popover
                      content={
                        <GenerationInfo generationInfo={props.generationInfo} />
                      }
                      title={t("generationInfo")}>
                      <IconButton
                        ariaLabel={t("generationInfo") as string}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <InfoIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      </IconButton>
                    </Popover>
                  )}

                  {!props.hideEditAndRegenerate && isLastMessage && (
                    <Tooltip title={t("regenerate")}>
                      <IconButton
                        ariaLabel={t("regenerate") as string}
                        onClick={props.onRengerate}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <RotateCcw className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      </IconButton>
                    </Tooltip>
                  )}

                  {props?.onNewBranch && !props?.temporaryChat && (
                    <Tooltip title={t("newBranch")}>
                      <IconButton
                        ariaLabel={t("newBranch") as string}
                        onClick={props?.onNewBranch}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <GitBranchIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                          <span
                            className={`text-[10px] text-gray-500 dark:text-gray-400 hidden group-focus-within:inline ${
                              isLastMessage ? "inline" : ""
                            }`}
                          >
                            {t("branchShort", "Branch")}
                          </span>
                        </span>
                      </IconButton>
                    </Tooltip>
                  )}

                  {!props.hideContinue && isLastMessage && (
                    <Tooltip title={t("continue")}>
                      <IconButton
                        ariaLabel={t("continue") as string}
                        onClick={props?.onContinue}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <PlayCircle className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
              {!props.hideEditAndRegenerate && (
                <Tooltip title={t("edit")}>
                  <IconButton
                    onClick={() => setEditMode(true)}
                    ariaLabel={t("edit") as string}
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Pen className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      <span
                        className={`text-[10px] text-gray-500 dark:text-gray-400 hidden group-focus-within:inline ${
                          isLastMessage ? "inline" : ""
                        }`}
                      >
                        {t("edit", "Edit")}
                      </span>
                    </span>
                  </IconButton>
                </Tooltip>
              )}
            </div>
          ) : (
            // add invisible div to prevent layout shift
            <div className="invisible">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-[#242424] hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"></div>
            </div>
          )}
        </div>
      </div>
      {/* </div> */}
    </div>
  )
}
