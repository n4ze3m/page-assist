import { useForm } from "@mantine/form"
import { useMutation } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "@/hooks/useDynamicTextareaSize"
import { useMessage } from "@/hooks/useMessage"
import { toBase64 } from "@/libs/to-base64"
import {
  Checkbox,
  Dropdown,
  Image,
  Switch,
  Tooltip,
  Popover,
  Radio
} from "antd"
import { useWebUI } from "@/store/webui"
import { defaultEmbeddingModelForRag } from "@/services/ai/ollama"
import {
  ImageIcon,
  MicIcon,
  StopCircleIcon,
  X,
  EyeIcon,
  EyeOffIcon,
  Brain,
  BrainCircuit
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { ModelSelect } from "@/components/Common/ModelSelect"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { PiGlobeX, PiGlobe } from "react-icons/pi"
import { handleChatInputKeyDown } from "@/utils/key-down"
import { getIsSimpleInternetSearch } from "@/services/features/search"
import { useStorage } from "@plasmohq/storage/hook"
import { useFocusShortcuts } from "@/hooks/keyboard"
import { isThinkingCapableModel, isGptOssModel } from "@/libs/model-utils"
import { useStoreChatModelSettings } from "@/store/model"
import { getVariable } from "@/utils/select-variable"

type Props = {
  dropedFile: File | undefined
}

export const SidepanelForm = ({ dropedFile }: Props) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { sendWhenEnter, setSendWhenEnter } = useWebUI()
  const [typing, setTyping] = React.useState<boolean>(false)
  const { t } = useTranslation(["playground", "common"])
  const [chatWithWebsiteEmbedding] = useStorage(
    "chatWithWebsiteEmbedding",
    false
  )
  const [persistChatInput] = useStorage("persistChatInput", false)
  const [persistedMessage, setPersistedMessage] = useStorage(
    "sidepanelPersistedMessage",
    ""
  )

  const form = useForm({
    initialValues: {
      message: "",
      image: "",
      images: [] as string[]
    }
  })
  const {
    transcript,
    isListening,
    resetTranscript,
    start: startListening,
    stop: stopSpeechRecognition,
    supported: browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  const stopListening = async () => {
    if (isListening) {
      stopSpeechRecognition()
    }
  }

  const onInputChange = async (
    e: React.ChangeEvent<HTMLInputElement> | File
  ) => {
    if (e instanceof File) {
      const base64 = await toBase64(e)
      const currentImages = form.values.images || []
      form.setFieldValue("images", [...currentImages, base64])
    } else {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files)
        for (const file of files) {
          const base64 = await toBase64(file)
          const currentImages = form.values.images || []
          form.setFieldValue("images", [...currentImages, base64])
        }
      }
    }
  }

  const removeImage = (index: number) => {
    const currentImages = form.values.images || []
    const newImages = currentImages.filter((_, i) => i !== index)
    form.setFieldValue("images", newImages)
  }
  const textAreaFocus = () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  useFocusShortcuts(textareaRef, true)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Process" || e.key === "229") return
    if (
      handleChatInputKeyDown({
        e,
        sendWhenEnter,
        typing,
        isSending
      })
    ) {
      e.preventDefault()
      form.onSubmit(async (value) => {
        if (
          value.message.trim().length === 0 &&
          (!value.images || value.images.length === 0)
        ) {
          return
        }
        await stopListening()
        if (!selectedModel || selectedModel.length === 0) {
          form.setFieldError("message", t("formError.noModel"))
          return
        }
        if (chatMode === "rag") {
          const defaultEM = await defaultEmbeddingModelForRag()
          if (!defaultEM && chatWithWebsiteEmbedding) {
            form.setFieldError("message", t("formError.noEmbeddingModel"))
            return
          }
        }
        if (webSearch) {
          const defaultEM = await defaultEmbeddingModelForRag()
          const simpleSearch = await getIsSimpleInternetSearch()
          if (!defaultEM && !simpleSearch) {
            form.setFieldError("message", t("formError.noEmbeddingModel"))
            return
          }
        }
        form.reset()
        // Clear persisted message when sent
        if (persistChatInput) {
          setPersistedMessage("")
        }
        textAreaFocus()
        await sendMessage({
          image: value.images && value.images.length > 0 ? value.images[0] : "",
          images: value.images,
          message: value.message.trim()
        })
      })()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      onInputChange(e.clipboardData.files[0])
    }
  }

  const {
    onSubmit,
    selectedModel,
    chatMode,
    stopStreamingRequest,
    streaming,
    setChatMode,
    webSearch,
    setWebSearch,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    speechToTextLanguage,
    useOCR,
    setUseOCR,
    defaultInternetSearchOn,
    defaultChatWithWebsite,
    temporaryChat
  } = useMessage()

  // Thinking mode state
  const [defaultThinkingMode] = useStorage("defaultThinkingMode", false)
  const thinking = useStoreChatModelSettings((state) => state.thinking)
  const setThinking = useStoreChatModelSettings((state) => state.setThinking)

  React.useEffect(() => {
    if (dropedFile) {
      onInputChange(dropedFile)
    }
  }, [dropedFile])

  useDynamicTextareaSize(textareaRef, form.values.message, 120)

  React.useEffect(() => {
    if (isListening) {
      form.setFieldValue("message", transcript)
    }
  }, [transcript])

  React.useEffect(() => {
    if (selectedQuickPrompt) {
      const word = getVariable(selectedQuickPrompt)
      form.setFieldValue("message", selectedQuickPrompt)
      if (word) {
        textareaRef.current?.focus()
        const interval = setTimeout(() => {
          textareaRef.current?.setSelectionRange(word.start, word.end)
          setSelectedQuickPrompt(null)
        }, 100)
        return () => {
          clearInterval(interval)
        }
      }
    }
  }, [selectedQuickPrompt])
  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: onSubmit,
    onSuccess: () => {
      textAreaFocus()
    },
    onError: (error) => {
      textAreaFocus()
    }
  })

  React.useEffect(() => {
    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].type === "text/plain") {
            e.dataTransfer.items[i].getAsString((text) => {
              form.setFieldValue("message", text)
            })
          }
        }
      }
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    textareaRef.current?.addEventListener("drop", handleDrop)
    textareaRef.current?.addEventListener("dragover", handleDragOver)

    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }

    if (defaultChatWithWebsite) {
      setChatMode("rag")
    }

    return () => {
      textareaRef.current?.removeEventListener("drop", handleDrop)
      textareaRef.current?.removeEventListener("dragover", handleDragOver)
    }
  }, [])

  // Separate effect for restoring persisted message to handle async useStorage
  React.useEffect(() => {
    if (persistChatInput && persistedMessage && !form.values.message) {
      form.setFieldValue("message", persistedMessage)
    }
  }, [persistChatInput, persistedMessage])

  React.useEffect(() => {
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
  }, [defaultInternetSearchOn])

  return (
    <div className="flex w-full flex-col items-center px-2">
      <div className="relative z-10 flex w-full flex-col items-center justify-center gap-2 text-base">
        <div className="relative flex w-full flex-row justify-center gap-2 lg:w-4/5">
          <div
            data-istemporary-chat={temporaryChat}
            className={` bg-neutral-50  dark:bg-[#262626] relative w-full max-w-[48rem] p-1 backdrop-blur-lg duration-100 border border-gray-300 rounded-t-xl  dark:border-[#404040] data-[istemporary-chat='true']:bg-gray-200 data-[istemporary-chat='true']:dark:bg-black`}>
            {form.values.images && form.values.images.length > 0 && (
              <div className="p-2 border-b border-gray-200 dark:border-[#404040]">
                <div className="flex flex-wrap gap-2">
                  {form.values.images.map((img, index) => (
                    <div key={index} className="relative">
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 flex items-center justify-center z-10 bg-white dark:bg-[#262626] p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#404040] text-black dark:text-gray-100 shadow-md">
                        <X className="h-3 w-3" />
                      </button>
                      <Image
                        src={img}
                        alt={`Uploaded Image ${index + 1}`}
                        preview={true}
                        className="rounded-md max-h-24 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="flex">
                <form
                  onSubmit={form.onSubmit(async (value) => {
                    if (!selectedModel || selectedModel.length === 0) {
                      form.setFieldError("message", t("formError.noModel"))
                      return
                    }
                    if (chatMode === "rag") {
                      const defaultEM = await defaultEmbeddingModelForRag()
                      if (!defaultEM && chatWithWebsiteEmbedding) {
                        form.setFieldError(
                          "message",
                          t("formError.noEmbeddingModel")
                        )
                        return
                      }
                    }
                    if (webSearch) {
                      const defaultEM = await defaultEmbeddingModelForRag()
                      const simpleSearch = await getIsSimpleInternetSearch()
                      if (!defaultEM && !simpleSearch) {
                        form.setFieldError(
                          "message",
                          t("formError.noEmbeddingModel")
                        )
                        return
                      }
                    }
                    await stopListening()
                    if (
                      value.message.trim().length === 0 &&
                      (!value.images || value.images.length === 0)
                    ) {
                      return
                    }
                    form.reset()
                    // Clear persisted message when sent
                    if (persistChatInput) {
                      setPersistedMessage("")
                    }
                    textAreaFocus()
                    await sendMessage({
                      image:
                        value.images && value.images.length > 0
                          ? value.images[0]
                          : "",
                      images: value.images,
                      message: value.message.trim()
                    })
                  })}
                  className="shrink-0 flex-grow  flex flex-col items-center ">
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    ref={inputRef}
                    accept="image/*"
                    multiple={true}
                    onChange={onInputChange}
                  />
                  <div className="w-full  flex flex-col px-1">
                    <textarea
                      onKeyDown={(e) => handleKeyDown(e)}
                      ref={textareaRef}
                      className="pa-textarea px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
                      onPaste={handlePaste}
                      rows={1}
                      style={{ minHeight: "60px" }}
                      tabIndex={0}
                      onCompositionStart={() => {
                        if (import.meta.env.BROWSER !== "firefox") {
                          setTyping(true)
                        }
                      }}
                      onCompositionEnd={() => {
                        if (import.meta.env.BROWSER !== "firefox") {
                          setTyping(false)
                        }
                      }}
                      placeholder={t("form.textarea.placeholder")}
                      {...form.getInputProps("message")}
                      onChange={(e) => {
                        form.getInputProps("message").onChange(e)
                        // Persist message as user types
                        if (persistChatInput) {
                          setPersistedMessage(e.target.value)
                        }
                      }}
                    />
                    <div className="flex mt-4 justify-end gap-3">
                      {chatMode !== "vision" && (
                        <Tooltip title={t("tooltip.searchInternet")}>
                          <button
                            type="button"
                            onClick={() => setWebSearch(!webSearch)}
                            className={`inline-flex items-center gap-2   ${
                              chatMode === "rag" ? "hidden" : "block"
                            }`}>
                            {webSearch ? (
                              <PiGlobe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <PiGlobeX className="h-4 w-4 text-[#404040] dark:text-gray-400" />
                            )}
                          </button>
                        </Tooltip>
                      )}
                      {defaultThinkingMode &&
                        isThinkingCapableModel(selectedModel) &&
                        (isGptOssModel(selectedModel) ? (
                          <Popover
                            content={
                              <div>
                                <Radio.Group
                                  value={thinking || "medium"}
                                  onChange={(e) =>
                                    setThinking?.(e.target.value)
                                  }
                                  className="flex flex-col gap-2">
                                  <Radio value="low">
                                    {t(
                                      "common:modelSettings.form.thinking.levels.low"
                                    )}
                                  </Radio>
                                  <Radio value="medium">
                                    {t(
                                      "common:modelSettings.form.thinking.levels.medium"
                                    )}
                                  </Radio>
                                  <Radio value="high">
                                    {t(
                                      "common:modelSettings.form.thinking.levels.high"
                                    )}
                                  </Radio>
                                </Radio.Group>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 px-1 border-t border-gray-200 dark:border-gray-700 pt-2">
                                  Note: This model always includes reasoning
                                </div>
                              </div>
                            }
                            title="Reasoning Level"
                            trigger="click">
                            <Tooltip title="Adjust reasoning intensity">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2">
                                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </button>
                            </Tooltip>
                          </Popover>
                        ) : (
                          <Tooltip title={t("tooltip.thinking")}>
                            <button
                              type="button"
                              onClick={() => setThinking?.(!thinking)}
                              className="inline-flex items-center gap-2">
                              {thinking ?? true ? (
                                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <BrainCircuit className="h-4 w-4 text-[#404040] dark:text-gray-400" />
                              )}
                            </button>
                          </Tooltip>
                        ))}
                      <ModelSelect iconClassName="size-4" />
                      {browserSupportsSpeechRecognition && (
                        <Tooltip title={t("tooltip.speechToText")}>
                          <button
                            type="button"
                            onClick={async () => {
                              if (isListening) {
                                stopListening()
                              } else {
                                resetTranscript()
                                startListening({
                                  continuous: true,
                                  lang: speechToTextLanguage
                                })
                              }
                            }}
                            className={`flex items-center justify-center dark:text-gray-300`}>
                            {!isListening ? (
                              <MicIcon className="h-4 w-4" />
                            ) : (
                              <div className="relative">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                                <MicIcon className="h-4 w-4" />
                              </div>
                            )}
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip title={t("tooltip.vision")}>
                        <button
                          type="button"
                          onClick={() => {
                            if (chatMode === "vision") {
                              setChatMode("normal")
                            } else {
                              setChatMode("vision")
                            }
                          }}
                          disabled={chatMode === "rag"}
                          className={`flex items-center justify-center dark:text-gray-300 ${
                            chatMode === "rag" ? "hidden" : "block"
                          } disabled:opacity-50`}>
                          {chatMode === "vision" ? (
                            <EyeIcon className="h-4 w-4" />
                          ) : (
                            <EyeOffIcon className="h-4 w-4" />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip title={t("tooltip.uploadImage")}>
                        <button
                          type="button"
                          onClick={() => {
                            inputRef.current?.click()
                          }}
                          disabled={chatMode === "vision"}
                          className={`flex items-center justify-center disabled:opacity-50 dark:text-gray-300 ${
                            chatMode === "rag" ? "hidden" : "block"
                          }`}>
                          <ImageIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {!streaming ? (
                        <Dropdown.Button
                          htmlType="submit"
                          disabled={isSending}
                          className="!justify-end !w-auto"
                          icon={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m19.5 8.25-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          }
                          menu={{
                            items: [
                              {
                                key: 1,
                                label: (
                                  <Checkbox
                                    checked={sendWhenEnter}
                                    onChange={(e) =>
                                      setSendWhenEnter(e.target.checked)
                                    }>
                                    {t("sendWhenEnter")}
                                  </Checkbox>
                                )
                              },
                              {
                                key: 2,
                                label: (
                                  <Checkbox
                                    checked={chatMode === "rag"}
                                    onChange={(e) => {
                                      setChatMode(
                                        e.target.checked ? "rag" : "normal"
                                      )
                                    }}>
                                    {t("common:chatWithCurrentPage")}
                                  </Checkbox>
                                )
                              },
                              {
                                key: 3,
                                label: (
                                  <Checkbox
                                    checked={useOCR}
                                    onChange={(e) =>
                                      setUseOCR(e.target.checked)
                                    }>
                                    {t("useOCR")}
                                  </Checkbox>
                                )
                              }
                            ]
                          }}>
                          <div className="inline-flex gap-2">
                            {sendWhenEnter ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                className="h-4 w-4"
                                viewBox="0 0 24 24">
                                <path d="M9 10L4 15 9 20"></path>
                                <path d="M20 4v7a4 4 0 01-4 4H4"></path>
                              </svg>
                            ) : null}
                            {t("common:submit")}
                          </div>
                        </Dropdown.Button>
                      ) : (
                        <Tooltip title={t("tooltip.stopStreaming")}>
                          <button
                            type="button"
                            onClick={stopStreamingRequest}
                            className="text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-[#404040] rounded-md p-1">
                            <StopCircleIcon className="h-5 w-5" />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              {form.errors.message && (
                <div className="text-red-500 text-center text-sm mt-1">
                  {form.errors.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
