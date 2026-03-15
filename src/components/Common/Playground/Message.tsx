import Markdown from "../../Common/Markdown"
import React, { useEffect } from "react"
import { Tag, Image, Tooltip, Collapse, Popover, Avatar } from "antd"
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
import { EditMessageForm } from "./EditMessageForm"
import { useTranslation } from "react-i18next"
import { MessageSource } from "./MessageSource"
import { useTTS } from "@/hooks/useTTS"
import { tagColors } from "@/utils/color"
import { removeModelSuffix } from "@/db/dexie/models"
import { GenerationInfo } from "./GenerationInfo"
import { parseReasoning } from "@/libs/reasoning"
import { humanizeMilliseconds } from "@/utils/humanize-milliseconds"
import { useStorage } from "@plasmohq/storage/hook"
import { PlaygroundUserMessageBubble } from "./PlaygroundUserMessage"
import { copyToClipboard } from "@/utils/clipboard"
import { ChatDocuments } from "@/models/ChatTypes"
import { ChatActionInfo, ChatMessageKind, McpToolCall } from "@/libs/mcp/types"
import { isTraceMessageKind } from "@/libs/mcp/utils"
import {
  PlaygroundMessageSegment,
  PlaygroundToolInvocation
} from "./message-groups"
import { McpInvocationBlock } from "./McpInvocationBlock"

const messageRenderStyle: React.CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "220px"
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
  isLastMessage: boolean
  actionIndex: number
  onRengerate?: () => void
  onEditFormSubmit: (
    messageIndex: number,
    isHuman: boolean,
    value: string,
    isSend: boolean
  ) => void
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
  actionInfo?: ChatActionInfo | null
  onNewBranch?: (messageIndex: number) => void
  temporaryChat?: boolean
  messageKind?: ChatMessageKind
  toolCalls?: McpToolCall[]
  toolCallId?: string
  toolName?: string
  toolServerName?: string
  toolError?: boolean
  segments?: PlaygroundMessageSegment[]
}

const hasStandaloneAssistantText = (segments?: PlaygroundMessageSegment[]) =>
  (segments || []).some(
    (segment) =>
      segment.type === "text" && segment.message.message.trim().length > 0
  )

const getPrimaryAssistantText = (
  message: string,
  segments?: PlaygroundMessageSegment[]
) => {
  const textSegment = [...(segments || [])]
    .reverse()
    .find(
      (segment) =>
        segment.type === "text" && segment.message.message.trim().length > 0
    )

  if (textSegment?.type === "text") {
    return textSegment.message.message
  }

  return segments ? "" : message
}

const renderAssistantText = ({
  keyPrefix,
  message,
  isStreaming,
  openReasoning,
  hideReasoningWidget,
  reasoningTimeTaken,
  t
}: {
  keyPrefix: string
  message: string
  isStreaming: boolean
  openReasoning?: boolean
  hideReasoningWidget: boolean
  reasoningTimeTaken?: number
  t: (key: string, options?: any) => string
}) =>
  parseReasoning(message).map((entry, index) => {
    if (entry.type === "reasoning" && !hideReasoningWidget) {
      return (
        <Collapse
          key={`${keyPrefix}-reasoning-${index}`}
          className="border-none text-gray-500 dark:text-gray-400 !mb-3 "
          defaultActiveKey={openReasoning ? "reasoning" : undefined}
          items={[
            {
              key: "reasoning",
              label:
                isStreaming && entry?.reasoning_running ? (
                  <div className="flex items-center gap-2">
                    <span className="italic shimmer-text">
                      {t("reasoning.thinking")}
                    </span>
                  </div>
                ) : (
                  t("reasoning.thought", {
                    time: humanizeMilliseconds(reasoningTimeTaken)
                  })
                ),
              children: <Markdown message={entry.content} />
            }
          ]}
        />
      )
    }

    return <Markdown key={`${keyPrefix}-content-${index}`} message={entry.content} />
  })

const McpInvocationGroup = ({
  content,
  invocations,
  isStreaming,
  openReasoning,
  hideReasoningWidget,
  t
}: {
  content: string
  invocations: PlaygroundToolInvocation[]
  isStreaming: boolean
  openReasoning?: boolean
  hideReasoningWidget: boolean
  t: (key: string, options?: any) => string
}) => (
  <div className="space-y-3  dark:border-white/10">
    {content.trim().length > 0 && (
      <div className="space-y-3">
        {renderAssistantText({
          keyPrefix: `tool-content-${content.length}`,
          message: content,
          isStreaming,
          openReasoning,
          hideReasoningWidget,
          t
        })}
      </div>
    )}

    <div className="space-y-4">
      {invocations.map((invocation) => (
        <McpInvocationBlock key={invocation.id} invocation={invocation} />
      ))}
    </div>
  </div>
)

const PlaygroundMessageComponent = (props: Props) => {
  const [isBtnPressed, setIsBtnPressed] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)
  const [checkWideMode] = useStorage("checkWideMode", false)
  const [isUserChatBubble] = useStorage("userChatBubble", true)
  const [hideReasoningWidget] = useStorage("hideReasoningWidget", false)
  const [autoCopyResponseToClipboard] = useStorage(
    "autoCopyResponseToClipboard",
    false
  )
  const [autoPlayTTS] = useStorage("isTTSAutoPlayEnabled", false)
  const [copyAsFormattedText] = useStorage("copyAsFormattedText", false)
  const { t } = useTranslation("common")
  const { cancel, isSpeaking, speak } = useTTS()
  const hasSegmentedAssistantText = hasStandaloneAssistantText(props.segments)
  const isTraceOnly = props.isBot
    ? props.segments
      ? !hasSegmentedAssistantText
      : isTraceMessageKind(props.messageKind)
    : false
  const primaryAssistantText = getPrimaryAssistantText(
    props.message,
    props.segments
  )
  const copyableMessage = props.isBot ? primaryAssistantText : props.message

  const autoCopyToClipboard = async () => {
    if (
      autoCopyResponseToClipboard &&
      props.isBot &&
      !isTraceOnly &&
      props.isLastMessage &&
      !props.isStreaming &&
      !props.isProcessing &&
      copyableMessage.trim().length > 0
    ) {
      await copyToClipboard({
        text: copyableMessage,
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
    isTraceOnly,
    props.isLastMessage,
    props.isStreaming,
    props.isProcessing,
    copyableMessage
  ])

  useEffect(() => {
    if (
      autoPlayTTS &&
      props.isTTSEnabled &&
      props.isBot &&
      !isTraceOnly &&
      props.isLastMessage &&
      !props.isStreaming &&
      !props.isProcessing &&
      copyableMessage.trim().length > 0
    ) {
      speak({
        utterance: copyableMessage
      })
    }
  }, [
    autoPlayTTS,
    props.isTTSEnabled,
    props.isBot,
    isTraceOnly,
    props.isLastMessage,
    props.isStreaming,
    props.isProcessing,
    copyableMessage
  ])

  if (isUserChatBubble && !props.isBot) {
    return <PlaygroundUserMessageBubble {...props} />
  }

  return (
    <div
      className={`group relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 text-gray-800 dark:text-gray-100 md:px-4 lg:w-4/5 ${checkWideMode ? "max-w-none" : ""}`}
      style={messageRenderStyle}>
      <div className="m-auto my-2 flex w-full flex-row gap-4 md:gap-6">
        <div className="relative flex w-8 flex-col items-end">
          {props.isBot ? (
            !props.modelImage ? (
              <div className="relative flex h-7 w-7 items-center justify-center rounded-sm p-1 text-white text-opacity-100">
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
            <div className="relative flex h-7 w-7 items-center justify-center rounded-sm p-1 text-white text-opacity-100">
              <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
            </div>
          ) : (
            props.userAvatar
          )}
        </div>

        <div className="flex w-[calc(100%-50px)] flex-col gap-2 lg:w-[calc(100%-115px)]">
          <span className="text-xs font-bold text-gray-800 dark:text-white">
            {props.isBot
              ? props.name === "chrome::gemini-nano::page-assist"
                ? "Gemini Nano"
                : removeModelSuffix(
                    `${props?.modelName || props?.name}`?.replaceAll(
                      /accounts\/[^\/]+\/models\//g,
                      ""
                    )
                  )
              : "You"}
          </span>

          {props.isBot && props.isSearchingInternet && props.isLastMessage ? (
            <ActionInfo action={"webSearch"} />
          ) : null}
          {props.isBot && props.actionInfo && props.isLastMessage ? (
            <ActionInfo action={props.actionInfo} />
          ) : null}

          <div>
            {props?.message_type && (
              <Tag color={tagColors[props?.message_type] || "default"}>
                {t(`copilot.${props?.message_type}`)}
              </Tag>
            )}
          </div>

          <div className="flex flex-grow flex-col gap-4">
            {!editMode ? (
              props.isBot ? (
                props.segments && props.segments.length > 0 ? (
                  props.segments.map((segment) => {
                    if (segment.type === "text") {
                      return (
                        <div key={segment.key} className="space-y-3">
                          {renderAssistantText({
                            keyPrefix: segment.key,
                            message: segment.message.message,
                            isStreaming: props.isStreaming,
                            openReasoning: props.openReasoning,
                            hideReasoningWidget,
                            reasoningTimeTaken:
                              segment.message.reasoning_time_taken,
                            t
                          })}
                        </div>
                      )
                    }

                    return (
                      <McpInvocationGroup
                        key={segment.key}
                        content={segment.content}
                        invocations={segment.invocations}
                        isStreaming={props.isStreaming}
                        openReasoning={props.openReasoning}
                        hideReasoningWidget={hideReasoningWidget}
                        t={t}
                      />
                    )
                  })
                ) : (
                  renderAssistantText({
                    keyPrefix: "assistant",
                    message: props.message,
                    isStreaming: props.isStreaming,
                    openReasoning: props.openReasoning,
                    hideReasoningWidget,
                    reasoningTimeTaken: props.reasoningTimeTaken,
                    t
                  })
                )
              ) : (
                <p
                  className={`prose whitespace-pre-line text-sm prose-p:leading-relaxed prose-pre:p-0 dark:prose-invert dark:prose-dark ${
                    props.message_type &&
                    "italic text-sm text-gray-500 dark:text-gray-400"
                  } ${checkWideMode ? "max-w-none" : ""}`}>
                  {props.message}
                </p>
              )
            ) : (
              <EditMessageForm
                value={copyableMessage}
                onSumbit={(value, isSend) =>
                  props.onEditFormSubmit(
                    props.actionIndex,
                    !props.isBot,
                    value,
                    isSend
                  )
                }
                onClose={() => setEditMode(false)}
                isBot={props.isBot}
              />
            )}
          </div>

          {props.images &&
            props.images.filter((img) => img.length > 0).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {props.images
                  .filter((image) => image.length > 0)
                  .map((image, index) => (
                    <Image
                      key={index}
                      src={image}
                      alt={`Uploaded Image ${index + 1}`}
                      width={180}
                      className="relative rounded-md"
                    />
                  ))}
              </div>
            )}

          {props.isBot &&
            !isTraceOnly &&
            props?.sources &&
            props?.sources.length > 0 && (
              <Collapse
                className="mt-2"
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

          {!props.isProcessing && !editMode && !isTraceOnly ? (
            <div
              className={`flex gap-2 space-x-2 ${
                !props.isLastMessage
                  ? "invisible group-hover:visible"
                  : ""
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
                          utterance: copyableMessage
                        })
                      }
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                    {!isSpeaking ? (
                      <Volume2Icon className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                    ) : (
                      <Square className="h-3 w-3 text-red-400 group-hover:text-red-500" />
                    )}
                  </button>
                </Tooltip>
              )}

              {!props.hideCopy && (
                <Tooltip title={t("copyToClipboard")}>
                  <button
                    aria-label={t("copyToClipboard")}
                    onClick={async () => {
                      await copyToClipboard({
                        text: copyableMessage,
                        formatted: copyAsFormattedText
                      })

                      setIsBtnPressed(true)
                      setTimeout(() => {
                        setIsBtnPressed(false)
                      }, 2000)
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                    {!isBtnPressed ? (
                      <CopyIcon className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                    ) : (
                      <CheckIcon className="h-3 w-3 text-green-400 group-hover:text-green-500" />
                    )}
                  </button>
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
                      <button
                        aria-label={t("generationInfo")}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                        <InfoIcon className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                      </button>
                    </Popover>
                  )}

                  {!props.hideEditAndRegenerate &&
                    props.isLastMessage &&
                    props.onRengerate && (
                    <Tooltip title={t("regenerate")}>
                      <button
                        aria-label={t("regenerate")}
                        onClick={props.onRengerate}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                        <RotateCcw className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                      </button>
                    </Tooltip>
                  )}

                  {props?.onNewBranch && !props?.temporaryChat && (
                    <Tooltip title={t("newBranch")}>
                      <button
                        aria-label={t("newBranch")}
                        onClick={() => props?.onNewBranch?.(props.actionIndex)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                        <GitBranchIcon className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                      </button>
                    </Tooltip>
                  )}

                  {!props.hideContinue && props.isLastMessage && (
                    <Tooltip title={t("continue")}>
                      <button
                        aria-label={t("continue")}
                        onClick={props?.onContinue}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                        <PlayCircle className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                      </button>
                    </Tooltip>
                  )}
                </>
              )}

              {!props.hideEditAndRegenerate && (
                <Tooltip title={t("edit")}>
                  <button
                    onClick={() => setEditMode(true)}
                    aria-label={t("edit")}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700">
                    <Pen className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
                  </button>
                </Tooltip>
              )}
            </div>
          ) : (
            !isTraceOnly && (
              <div className="invisible">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-none dark:bg-[#242424] dark:hover:bg-gray-700"></div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

const areSegmentsEqual = (
  a?: PlaygroundMessageSegment[],
  b?: PlaygroundMessageSegment[]
) => {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const sa = a[i]
    const sb = b[i]
    if (sa.type !== sb.type || sa.key !== sb.key) return false
    if (sa.type === "text" && sb.type === "text") {
      if (sa.message.message !== sb.message.message) return false
    } else if (sa.type === "tool_invocations" && sb.type === "tool_invocations") {
      if (
        sa.content !== sb.content ||
        sa.invocations.length !== sb.invocations.length
      )
        return false
      for (let j = 0; j < sa.invocations.length; j++) {
        const ia = sa.invocations[j]
        const ib = sb.invocations[j]
        if (
          ia.id !== ib.id ||
          ia.result?.content !== ib.result?.content ||
          ia.result?.toolError !== ib.result?.toolError
        )
          return false
      }
    }
  }
  return true
}

const arePlaygroundMessagePropsEqual = (previous: Props, next: Props) =>
  previous.message === next.message &&
  previous.message_type === next.message_type &&
  previous.hideCopy === next.hideCopy &&
  previous.botAvatar === next.botAvatar &&
  previous.userAvatar === next.userAvatar &&
  previous.isBot === next.isBot &&
  previous.name === next.name &&
  previous.images === next.images &&
  previous.isLastMessage === next.isLastMessage &&
  previous.actionIndex === next.actionIndex &&
  previous.onRengerate === next.onRengerate &&
  previous.onEditFormSubmit === next.onEditFormSubmit &&
  previous.isProcessing === next.isProcessing &&
  previous.webSearch === next.webSearch &&
  previous.isSearchingInternet === next.isSearchingInternet &&
  previous.sources === next.sources &&
  previous.hideEditAndRegenerate === next.hideEditAndRegenerate &&
  previous.hideContinue === next.hideContinue &&
  previous.onSourceClick === next.onSourceClick &&
  previous.isTTSEnabled === next.isTTSEnabled &&
  previous.generationInfo === next.generationInfo &&
  previous.isStreaming === next.isStreaming &&
  previous.reasoningTimeTaken === next.reasoningTimeTaken &&
  previous.openReasoning === next.openReasoning &&
  previous.modelImage === next.modelImage &&
  previous.modelName === next.modelName &&
  previous.onContinue === next.onContinue &&
  previous.documents === next.documents &&
  previous.actionInfo === next.actionInfo &&
  previous.onNewBranch === next.onNewBranch &&
  previous.temporaryChat === next.temporaryChat &&
  previous.messageKind === next.messageKind &&
  previous.toolCalls === next.toolCalls &&
  previous.toolCallId === next.toolCallId &&
  previous.toolName === next.toolName &&
  previous.toolServerName === next.toolServerName &&
  previous.toolError === next.toolError &&
  areSegmentsEqual(previous.segments, next.segments)

export const PlaygroundMessage = React.memo(
  PlaygroundMessageComponent,
  arePlaygroundMessagePropsEqual
)
