import Markdown from "../../Common/Markdown"
import React, { useEffect } from "react"
import { Tag, Image, Tooltip, Collapse, Popover, Avatar } from "antd"
import { WebSearch } from "./WebSearch"
import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  Pen,
  PlayCircle,
  PlayIcon,
  RotateCcw,
  SpeakerIcon,
  Square,
  Volume2Icon
} from "lucide-react"
import { EditMessageForm } from "./EditMessageForm"
import { useTranslation } from "react-i18next"
import { MessageSource } from "./MessageSource"
import { useTTS } from "@/hooks/useTTS"
import { tagColors } from "@/utils/color"
import { removeModelSuffix } from "@/db/models"
import { GenerationInfo } from "./GenerationInfo"
import { parseReasoning } from "@/libs/reasoning"
import { humanizeMilliseconds } from "@/utils/humanize-milliseconds"
import { useStorage } from "@plasmohq/storage/hook"
import { PlaygroundUserMessageBubble } from "./PlaygroundUserMessage"
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
  const { t } = useTranslation("common")
  const { cancel, isSpeaking, speak } = useTTS()
  const isLastMessage: boolean =
    props.currentMessageIndex === props.totalMessages - 1

  useEffect(() => {
    if (
      autoCopyResponseToClipboard &&
      props.isBot &&
      isLastMessage &&
      !props.isStreaming &&
      !props.isProcessing &&
      props.message.trim().length > 0
    ) {
      navigator.clipboard.writeText(props.message)
      setIsBtnPressed(true)
      setTimeout(() => {
        setIsBtnPressed(false)
      }, 2000)
    }
  }, [
    autoCopyResponseToClipboard,
    props.isBot,
    props.currentMessageIndex,
    props.totalMessages,
    props.isStreaming,
    props.isProcessing,
    props.message
  ])
  useEffect(() => {
    if (
      autoPlayTTS &&
      props.isTTSEnabled &&
      props.isBot &&
      isLastMessage &&
      !props.isStreaming &&
      !props.isProcessing &&
      props.message.trim().length > 0
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
    props.message
  ])

  if (isUserChatBubble && !props.isBot) {
    return <PlaygroundUserMessageBubble {...props} />
  }

  return (
    <div
      className={`group relative flex w-full max-w-3xl flex-col items-end justify-center pb-2 md:px-4 lg:w-4/5 text-gray-800 dark:text-gray-100 ${checkWideMode ? "max-w-none" : ""}`}>
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

          {props.isBot && props.isSearchingInternet && isLastMessage ? (
            <WebSearch />
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
                <>
                  {parseReasoning(props.message).map((e, i) => {
                    if (e.type === "reasoning") {
                      return (
                        <Collapse
                          key={i}
                          className="border-none !mb-3"
                          defaultActiveKey={
                            props?.openReasoning ? "reasoning" : undefined
                          }
                          items={[
                            {
                              key: "reasoning",
                              label:
                                props.isStreaming && e?.reasoning_running ? (
                                  <div className="flex items-center gap-2">
                                    <span className="italic">
                                      {t("reasoning.thinking")}
                                    </span>
                                  </div>
                                ) : (
                                  t("reasoning.thought", {
                                    time: humanizeMilliseconds(
                                      props.reasoningTimeTaken
                                    )
                                  })
                                ),
                              children: <Markdown message={e.content} />
                            }
                          ]}
                        />
                      )
                    }

                    return <Markdown key={i} message={e.content} />
                  })}
                </>
              ) : (
                <p
                  className={`prose dark:prose-invert whitespace-pre-line prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark ${
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
          {/* source if available */}
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
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    {!isSpeaking ? (
                      <Volume2Icon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
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
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    {!isBtnPressed ? (
                      <CopyIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                    ) : (
                      <CheckIcon className="w-3 h-3 text-green-400 group-hover:text-green-500" />
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
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <InfoIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      </button>
                    </Popover>
                  )}

                  {!props.hideEditAndRegenerate && isLastMessage && (
                    <Tooltip title={t("regenerate")}>
                      <button
                        aria-label={t("regenerate")}
                        onClick={props.onRengerate}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <RotateCcw className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      </button>
                    </Tooltip>
                  )}

                  {!props.hideContinue && isLastMessage && (
                    <Tooltip title={t("continue")}>
                      <button
                        aria-label={t("continue")}
                        onClick={props?.onContinue}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                        <PlayCircle className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
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
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    <Pen className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                  </button>
                </Tooltip>
              )}
            </div>
          ) : (
            // add invisible div to prevent layout shift
            <div className="invisible">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"></div>
            </div>
          )}
        </div>
      </div>
      {/* </div> */}
    </div>
  )
}
