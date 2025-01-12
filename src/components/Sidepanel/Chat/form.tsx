import { useForm } from "@mantine/form"
import { useMutation } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "~/hooks/useDynamicTextareaSize"
import { useMessage } from "~/hooks/useMessage"
import { toBase64 } from "~/libs/to-base64"
import { Checkbox, Dropdown, Image, Switch, Tooltip } from "antd"
import { useWebUI } from "~/store/webui"
import { defaultEmbeddingModelForRag } from "~/services/ollama"
import {
  ImageIcon,
  MicIcon,
  StopCircleIcon,
  X,
  EyeIcon,
  EyeOffIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { ModelSelect } from "@/components/Common/ModelSelect"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { PiGlobeX, PiGlobe } from "react-icons/pi"
import { handleChatInputKeyDown } from "@/utils/key-down"

type Props = {
  dropedFile: File | undefined
}

export const SidepanelForm = ({ dropedFile }: Props) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { sendWhenEnter, setSendWhenEnter } = useWebUI()
  const [typing, setTyping] = React.useState<boolean>(false)
  const { t } = useTranslation(["playground", "common"])
  const form = useForm({
    initialValues: {
      message: "",
      image: ""
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
      form.setFieldValue("image", base64)
    } else {
      if (e.target.files) {
        const base64 = await toBase64(e.target.files[0])
        form.setFieldValue("image", base64)
      }
    }
  }
  const textAreaFocus = () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }
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
        if (value.message.trim().length === 0 && value.image.length === 0) {
          return
        }
        await stopListening()
        if (!selectedModel || selectedModel.length === 0) {
          form.setFieldError("message", t("formError.noModel"))
          return
        }
        if (chatMode === "rag") {
          const defaultEM = await defaultEmbeddingModelForRag()
          if (!defaultEM) {
            form.setFieldError("message", t("formError.noEmbeddingModel"))
            return
          }
        }
        if (webSearch) {
          const defaultEM = await defaultEmbeddingModelForRag()
          if (!defaultEM) {
            form.setFieldError("message", t("formError.noEmbeddingModel"))
            return
          }
        }
        form.reset()
        textAreaFocus()
        await sendMessage({
          image: value.image,
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
    defaultInternetSearchOn
  } = useMessage()

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

    return () => {
      textareaRef.current?.removeEventListener("drop", handleDrop)
      textareaRef.current?.removeEventListener("dragover", handleDragOver)
    }
  }, [])

  React.useEffect(() => {
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
  }, [defaultInternetSearchOn])

  return (
    <div className="px-3 pt-3 md:px-6 md:pt-6 bg-white dark:bg-[#262626] border rounded-t-xl border-gray-300 dark:border-gray-600">
      <div
        className={`h-full rounded-md shadow relative ${
          form.values.image.length === 0 ? "hidden" : "block"
        }`}>
        <div className="relative">
          <Image
            src={form.values.image}
            alt="Uploaded Image"
            width={180}
            preview={false}
            className="rounded-md"
          />
          <button
            onClick={() => {
              form.setFieldValue("image", "")
            }}
            className="flex items-center justify-center absolute top-0 m-2 bg-white  dark:bg-[#262626] p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
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
                if (!defaultEM) {
                  form.setFieldError("message", t("formError.noEmbeddingModel"))
                  return
                }
              }
              if (webSearch) {
                const defaultEM = await defaultEmbeddingModelForRag()
                if (!defaultEM) {
                  form.setFieldError("message", t("formError.noEmbeddingModel"))
                  return
                }
              }
              await stopListening()
              if (
                value.message.trim().length === 0 &&
                value.image.length === 0
              ) {
                return
              }
              form.reset()
              textAreaFocus()
              await sendMessage({
                image: value.image,
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
              multiple={false}
              onChange={onInputChange}
            />
            <div className="w-full border-x border-t border-gray-300 flex flex-col dark:border-gray-600 rounded-t-xl p-2">
              <textarea
                onKeyDown={(e) => handleKeyDown(e)}
                ref={textareaRef}
                className="px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
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
                        <PiGlobe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <PiGlobeX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </Tooltip>
                )}
                <ModelSelect />
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
                        <MicIcon className="h-5 w-5" />
                      ) : (
                        <div className="relative">
                          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                          <MicIcon className="h-5 w-5" />
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
                      <EyeIcon className="h-5 w-5" />
                    ) : (
                      <EyeOffIcon className="h-5 w-5" />
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
                    <ImageIcon className="h-5 w-5" />
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
                        className="w-5 h-5">
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
                                setChatMode(e.target.checked ? "rag" : "normal")
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
                              onChange={(e) => setUseOCR(e.target.checked)}>
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
                          className="h-5 w-5"
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
                      className="text-gray-800 dark:text-gray-300">
                      <StopCircleIcon className="h-6 w-6" />
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
  )
}
