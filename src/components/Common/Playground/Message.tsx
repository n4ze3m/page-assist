import Markdown from "../../Common/Markdown"
import React from "react"
import { Image, Tooltip } from "antd"
import { WebSearch } from "./WebSearch"
import {
  CheckIcon,
  ClipboardIcon,
  Pen,
  PlayIcon,
  RotateCcw,
  Square
} from "lucide-react"
import { EditMessageForm } from "./EditMessageForm"
import { useTranslation } from "react-i18next"
import { MessageSource } from "./MessageSource"
import { useTTS } from "@/hooks/useTTS"

type Props = {
  message: string
  hideCopy?: boolean
  botAvatar?: JSX.Element
  userAvatar?: JSX.Element
  isBot: boolean
  name: string
  images?: string[]
  currentMessageIndex: number
  totalMessages: number
  onRengerate: () => void
  onEditFormSubmit: (value: string) => void
  isProcessing: boolean
  webSearch?: {}
  isSearchingInternet?: boolean
  sources?: any[]
  hideEditAndRegenerate?: boolean
  onSourceClick?: (source: any) => void
  isTTSEnabled?: boolean
}

export const PlaygroundMessage = (props: Props) => {
  const [isBtnPressed, setIsBtnPressed] = React.useState(false)
  const [editMode, setEditMode] = React.useState(false)

  const { t } = useTranslation("common")
  const { cancel, isSpeaking, speak } = useTTS()

  return (
    <div className="group w-full text-gray-800 dark:text-gray-100">
      <div className="text-base  md:max-w-2xl lg:max-w-xl xl:max-w-3xl flex lg:px-0 m-auto w-full">
        <div className="flex flex-row gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 lg:px-0 m-auto w-full">
          <div className="w-8 flex flex-col relative items-end">
            <div className="relative h-7 w-7 p-1 rounded-sm text-white flex items-center justify-center  text-opacity-100r">
              {props.isBot ? (
                !props.botAvatar ? (
                  <div className="absolute h-8 w-8 rounded-full bg-gradient-to-r from-green-300 to-purple-400"></div>
                ) : (
                  props.botAvatar
                )
              ) : !props.userAvatar ? (
                <div className="absolute h-8 w-8 rounded-full from-blue-400 to-blue-600 bg-gradient-to-r"></div>
              ) : (
                props.userAvatar
              )}
            </div>
          </div>
          <div className="flex w-[calc(100%-50px)] flex-col gap-3 lg:w-[calc(100%-115px)]">
            <span className="text-xs font-bold text-gray-800 dark:text-white">
              {props.isBot ? props.name : "You"}
            </span>

            {props.isBot &&
            props.isSearchingInternet &&
            props.currentMessageIndex === props.totalMessages - 1 ? (
              <WebSearch />
            ) : null}

            <div className="flex flex-grow flex-col">
              {!editMode ? (
                props.isBot ? (
                  <Markdown message={props.message} />
                ) : (
                  <p className="prose dark:prose-invert whitespace-pre-line	 prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark">
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
            {/* source if aviable */}
            {props.images &&
              props.images &&
              props.images.filter((img) => img.length > 0).length > 0 && (
                <div className="flex md:max-w-2xl lg:max-w-xl xl:max-w-3xl mt-4 m-auto w-full">
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
              <div className="mb-3 flex flex-wrap gap-2">
                {props?.sources?.map((source, index) => (
                  <MessageSource
                    onSourceClick={props.onSourceClick}
                    key={index}
                    source={source}
                  />
                ))}
              </div>
            )}
            {!props.isProcessing && !editMode && (
              <div
                className={`space-x-2 gap-2 mt-3 ${
                  props.currentMessageIndex !== props.totalMessages - 1
                    ? "hidden group-hover:flex"
                    : "flex"
                }`}>
                {props.isTTSEnabled && (
                  <Tooltip title={t("tts")}>
                    <button
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
                        <PlayIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                      ) : (
                        <Square className="w-3 h-3 text-red-400 group-hover:text-red-500" />
                      )}
                    </button>
                  </Tooltip>
                )}
                {props.isBot && (
                  <>
                    {!props.hideCopy && (
                      <Tooltip title={t("copyToClipboard")}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(props.message)
                            setIsBtnPressed(true)
                            setTimeout(() => {
                              setIsBtnPressed(false)
                            }, 2000)
                          }}
                          className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                          {!isBtnPressed ? (
                            <ClipboardIcon className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                          ) : (
                            <CheckIcon className="w-3 h-3 text-green-400 group-hover:text-green-500" />
                          )}
                        </button>
                      </Tooltip>
                    )}

                    {!props.hideEditAndRegenerate &&
                      props.currentMessageIndex === props.totalMessages - 1 && (
                        <Tooltip title={t("regenerate")}>
                          <button
                            onClick={props.onRengerate}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                            <RotateCcw className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                          </button>
                        </Tooltip>
                      )}
                  </>
                )}
                {!props.hideEditAndRegenerate && (
                  <Tooltip title={t("edit")}>
                    <button
                      onClick={() => setEditMode(true)}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                      <Pen className="w-3 h-3 text-gray-400 group-hover:text-gray-500" />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
