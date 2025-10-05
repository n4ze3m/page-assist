import { useForm } from "@mantine/form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "~/hooks/useDynamicTextareaSize"
import { toBase64 } from "~/libs/to-base64"
import { useMessageOption } from "~/hooks/useMessageOption"
import { Checkbox, Dropdown, Switch, Tooltip } from "antd"
import { Image } from "antd"
import { useWebUI } from "~/store/webui"
import { defaultEmbeddingModelForRag } from "~/services/ollama"
import {
  EraserIcon,
  ImageIcon,
  MicIcon,
  StopCircleIcon,
  X,
  FileIcon,
  FileText,
  PaperclipIcon
} from "lucide-react"
import { getVariable } from "@/utils/select-variable"
import { useTranslation } from "react-i18next"
import { KnowledgeSelect } from "../Knowledge/KnowledgeSelect"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { PiGlobe } from "react-icons/pi"
import { handleChatInputKeyDown } from "@/utils/key-down"
import { getIsSimpleInternetSearch } from "@/services/search"
import { useStorage } from "@plasmohq/storage/hook"
import { useTabMentions } from "~/hooks/useTabMentions"
import { useFocusShortcuts } from "~/hooks/keyboard"
import { MentionsDropdown } from "./MentionsDropdown"
import { DocumentChip } from "./DocumentChip"
import { otherUnsupportedTypes } from "../Knowledge/utils/unsupported-types"
import { PASTED_TEXT_CHAR_LIMIT } from "@/utils/constant"
import { PlaygroundFile } from "./PlaygroundFile"
type Props = {
  dropedFile: File | undefined
}

export const PlaygroundForm = ({ dropedFile }: Props) => {
  const { t } = useTranslation(["playground", "common"])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [typing, setTyping] = React.useState<boolean>(false)
  const [checkWideMode] = useStorage("checkWideMode", false)
  const {
    onSubmit,
    selectedModel,
    chatMode,
    speechToTextLanguage,
    stopStreamingRequest,
    streaming: isSending,
    webSearch,
    setWebSearch,
    selectedQuickPrompt,
    textareaRef,
    setSelectedQuickPrompt,
    selectedKnowledge,
    temporaryChat,
    useOCR,
    setUseOCR,
    defaultInternetSearchOn,
    setHistory,
    history,
    uploadedFiles,
    fileRetrievalEnabled,
    setFileRetrievalEnabled,
    handleFileUpload,
    removeUploadedFile,
    clearUploadedFiles
  } = useMessageOption()

  const [autoSubmitVoiceMessage] = useStorage("autoSubmitVoiceMessage", false)

  const [autoStopTimeout] = useStorage("autoStopTimeout", 2000)

  const {
    tabMentionsEnabled,
    showMentions,
    mentionPosition,
    filteredTabs,
    selectedDocuments,
    handleTextChange,
    insertMention,
    closeMentions,
    removeDocument,
    clearSelectedDocuments,
    reloadTabs,
    handleMentionsOpen
  } = useTabMentions(textareaRef)

  // Enable focus shortcuts (Shift+Esc to focus textarea)
  useFocusShortcuts(textareaRef, true)

  const [pasteLargeTextAsFile] = useStorage("pasteLargeTextAsFile", false)
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  const textAreaFocus = () => {
    if (textareaRef.current) {
      if (
        textareaRef.current.selectionStart === textareaRef.current.selectionEnd
      ) {
        if (!isMobile()) {
          textareaRef.current.focus()
        } else {
          textareaRef.current.blur()
        }
      }
    }
  }

  const form = useForm({
    initialValues: {
      message: "",
      image: ""
    }
  })

  React.useEffect(() => {
    textAreaFocus()
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
  }, [])

  React.useEffect(() => {
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
  }, [defaultInternetSearchOn])

  const onInputChange = async (
    e: React.ChangeEvent<HTMLInputElement> | File
  ) => {
    if (e instanceof File) {
      const isUnsupported = otherUnsupportedTypes.includes(e.type)

      if (isUnsupported) {
        console.error("File type not supported:", e.type)
        return
      }

      const isImage = e.type.startsWith("image/")
      if (isImage) {
        const base64 = await toBase64(e)
        form.setFieldValue("image", base64)
      } else {
        await handleFileUpload(e)
      }
    } else {
      if (e.target.files) {
        onFileInputChange(e)
      }
    }
  }

  const onFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      const isUnsupported = otherUnsupportedTypes.includes(file.type)

      if (isUnsupported) {
        console.error("File type not supported:", file.type)
        return
      }

      const isImage = file.type.startsWith("image/")
      if (isImage) {
        const base64 = await toBase64(file)
        form.setFieldValue("image", base64)
      } else {
        await handleFileUpload(file)
      }
    }
  }
  const handlePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      onInputChange(e.clipboardData.files[0])
      return
    }

    const pastedText = e.clipboardData.getData("text/plain")

    if (
      pasteLargeTextAsFile &&
      pastedText &&
      pastedText.length > PASTED_TEXT_CHAR_LIMIT
    ) {
      e.preventDefault()
      const blob = new Blob([pastedText], { type: "text/plain" })
      const file = new File([blob], `pasted-text-${Date.now()}.txt`, {
        type: "text/plain"
      })

      await handleFileUpload(file)
      return
    }
  }
  React.useEffect(() => {
    if (dropedFile) {
      onInputChange(dropedFile)
    }
  }, [dropedFile])

  useDynamicTextareaSize(textareaRef, form.values.message, 300)

  const {
    transcript,
    isListening,
    resetTranscript,
    start: startListening,
    stop: stopSpeechRecognition,
    supported: browserSupportsSpeechRecognition
  } = useSpeechRecognition({
    autoStop: autoSubmitVoiceMessage,
    autoStopTimeout,
    onEnd: async () => {
      if (autoSubmitVoiceMessage) {
        submitForm()
      }
    }
  })
  const { sendWhenEnter, setSendWhenEnter } = useWebUI()

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

  const queryClient = useQueryClient()

  const { mutateAsync: sendMessage } = useMutation({
    mutationFn: onSubmit,
    onSuccess: () => {
      textAreaFocus()
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
    },
    onError: (error) => {
      textAreaFocus()
    }
  })

  const submitForm = () => {
    form.onSubmit(async (value) => {
      if (
        value.message.trim().length === 0 &&
        value.image.length === 0 &&
        selectedDocuments.length === 0 &&
        uploadedFiles.length === 0
      ) {
        return
      }
      const defaultEM = await defaultEmbeddingModelForRag()
      if (!selectedModel || selectedModel.length === 0) {
        form.setFieldError("message", t("formError.noModel"))
        return
      }

      if (webSearch) {
        const simpleSearch = await getIsSimpleInternetSearch()
        if (!defaultEM && !simpleSearch) {
          form.setFieldError("message", t("formError.noEmbeddingModel"))
          return
        }
      }
      form.reset()
      clearSelectedDocuments()
      clearUploadedFiles()
      textAreaFocus()
      await sendMessage({
        image: value.image,
        message: value.message.trim(),
        docs: selectedDocuments.map((doc) => ({
          type: "tab",
          tabId: doc.id,
          title: doc.title,
          url: doc.url,
          favIconUrl: doc.favIconUrl
        }))
      })
    })()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (import.meta.env.BROWSER !== "firefox") {
      if (e.key === "Process" || e.key === "229") return
    }

    if (
      showMentions &&
      (e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === "Escape")
    ) {
      return
    }

    if (
      handleChatInputKeyDown({
        e,
        sendWhenEnter,
        typing,
        isSending
      })
    ) {
      e.preventDefault()
      stopListening()
      submitForm()
    }
  }

  const stopListening = async () => {
    if (isListening) {
      stopSpeechRecognition()
    }
  }

  return (
    <div className="flex w-full flex-col items-center px-2">
      <div className="relative z-10 flex w-full flex-col items-center justify-center gap-2 text-base">
        <div className="relative flex w-full flex-row justify-center gap-2 lg:w-3/5">
          <div
            data-istemporary-chat={temporaryChat}
            data-checkwidemode={checkWideMode}
            className={` bg-neutral-50  dark:bg-[#2a2a2a] relative w-full max-w-[48rem] p-1 backdrop-blur-lg duration-100 border border-gray-300 rounded-t-xl  dark:border-[#404040] data-[istemporary-chat='true']:bg-gray-200 data-[istemporary-chat='true']:dark:bg-black data-[checkwidemode='true']:max-w-none`}>
            <div
              className={`border-b border-gray-200 dark:border-[#404040] relative ${
                form.values.image.length === 0 ? "hidden" : "block"
              }`}>
              <button
                type="button"
                onClick={() => {
                  form.setFieldValue("image", "")
                }}
                className="absolute top-1 left-1 flex items-center justify-center z-10 bg-white dark:bg-[#2a2a2a] p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#404040] text-black dark:text-gray-100">
                <X className="h-4 w-4" />
              </button>{" "}
              <Image
                src={form.values.image}
                alt="Uploaded Image"
                preview={false}
                className="rounded-md max-h-32"
              />
            </div>
            {selectedDocuments.length > 0 && (
              <div className="p-3">
                <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#404040] scrollbar-track-transparent">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDocuments.map((document) => (
                      <DocumentChip
                        key={document.id}
                        document={document}
                        onRemove={removeDocument}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {uploadedFiles.length > 0 && (
              <div className="p-3 border-b border-gray-200 dark:border-[#404040]">
                <div className="flex items-center justify-end mb-2">
                  <div className="flex items-center gap-2">
                    <Tooltip title={t("fileRetrievalEnabled")}>
                      <div className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 dark:text-gray-300" />
                        <Switch
                          size="small"
                          checked={fileRetrievalEnabled}
                          onChange={setFileRetrievalEnabled}
                        />
                      </div>
                    </Tooltip>
                  </div>
                </div>
                <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#404040] scrollbar-track-transparent">
                  <div className="flex flex-wrap gap-1.5">
                    {uploadedFiles.map((file) => (
                      <PlaygroundFile 
                        key={file.id}
                        file={file}
                        removeUploadedFile={removeUploadedFile}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className={`flex  bg-transparent `}>
                <form
                  onSubmit={form.onSubmit(async (value) => {
                    stopListening()
                    if (!selectedModel || selectedModel.length === 0) {
                      form.setFieldError("message", t("formError.noModel"))
                      return
                    }
                    const defaultEM = await defaultEmbeddingModelForRag()

                    if (webSearch) {
                      const simpleSearch = await getIsSimpleInternetSearch()
                      if (!defaultEM && !simpleSearch) {
                        form.setFieldError(
                          "message",
                          t("formError.noEmbeddingModel")
                        )
                        return
                      }
                    }
                    if (
                      value.message.trim().length === 0 &&
                      value.image.length === 0 &&
                      selectedDocuments.length === 0 &&
                      uploadedFiles.length === 0
                    ) {
                      return
                    }
                    form.reset()
                    clearSelectedDocuments()
                    clearUploadedFiles()
                    textAreaFocus()
                    await sendMessage({
                      image: value.image,
                      message: value.message.trim(),
                      docs: selectedDocuments.map((doc) => ({
                        type: "tab",
                        tabId: doc.id,
                        title: doc.title,
                        url: doc.url
                      }))
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
                  <input
                    id="document-upload"
                    name="document-upload"
                    type="file"
                    className="sr-only"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.txt,.csv"
                    multiple={false}
                    onChange={onFileInputChange}
                  />

                  <div className="w-full  flex flex-col dark:border-[#404040]  px-2 ">
                    <div className="relative">
                      <textarea
                        id="textarea-message"
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
                        onKeyDown={(e) => handleKeyDown(e)}
                        ref={textareaRef}
                        className="px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100"
                        onPaste={handlePaste}
                        rows={1}
                        style={{ minHeight: "35px" }}
                        tabIndex={0}
                        placeholder={t("form.textarea.placeholder")}
                        {...form.getInputProps("message")}
                        onChange={(e) => {
                          form.getInputProps("message").onChange(e)
                          if (tabMentionsEnabled && textareaRef.current) {
                            handleTextChange(
                              e.target.value,
                              textareaRef.current.selectionStart || 0
                            )
                          }
                        }}
                        onSelect={(e) => {
                          if (tabMentionsEnabled && textareaRef.current) {
                            handleTextChange(
                              textareaRef.current.value,
                              textareaRef.current.selectionStart || 0
                            )
                          }
                        }}
                      />

                      <MentionsDropdown
                        show={showMentions}
                        tabs={filteredTabs}
                        mentionPosition={mentionPosition}
                        onSelectTab={(tab) =>
                          insertMention(tab, form.values.message, (value) =>
                            form.setFieldValue("message", value)
                          )
                        }
                        onClose={closeMentions}
                        textareaRef={textareaRef}
                        refetchTabs={async () => {
                          await reloadTabs()
                        }}
                        onMentionsOpen={handleMentionsOpen}
                      />
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <div className="flex">
                        {!selectedKnowledge && (
                          <Tooltip title={t("tooltip.searchInternet")}>
                            <div className="inline-flex items-center gap-2">
                              <PiGlobe
                                className={`h-5 w-5 dark:text-gray-300 `}
                              />
                              <Switch
                                value={webSearch}
                                onChange={(e) => setWebSearch(e)}
                                checkedChildren={t("form.webSearch.on")}
                                unCheckedChildren={t("form.webSearch.off")}
                              />
                            </div>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex !justify-end gap-3">
                        {history.length > 0 && (
                          <Tooltip title={t("tooltip.clearContext")}>
                            <button
                              type="button"
                              onClick={() => {
                                setHistory([])
                              }}
                              className={`flex items-center justify-center dark:text-gray-300 ${
                                chatMode === "rag" ? "hidden" : "block"
                              }`}>
                              <EraserIcon className="h-5 w-5" />
                            </button>
                          </Tooltip>
                        )}
                        {!selectedKnowledge && (
                          <Tooltip title={t("tooltip.uploadImage")}>
                            <button
                              type="button"
                              onClick={() => {
                                inputRef.current?.click()
                              }}
                              className={`flex items-center justify-center dark:text-gray-300 ${
                                chatMode === "rag" ? "hidden" : "block"
                              }`}>
                              <ImageIcon className="h-5 w-5" />
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip title={t("tooltip.uploadDocuments")}>
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click()
                            }}
                            className="flex items-center justify-center dark:text-gray-300">
                            <PaperclipIcon className="h-5 w-5" />
                          </button>
                        </Tooltip>

                        {browserSupportsSpeechRecognition && (
                          <Tooltip title={t("tooltip.speechToText")}>
                            <button
                              type="button"
                              onClick={async () => {
                                if (isListening) {
                                  stopSpeechRecognition()
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
                        <KnowledgeSelect />

                        {!isSending ? (
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
                              className="text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-[#404040] rounded-md p-1">
                              <StopCircleIcon className="size-5" />
                            </button>{" "}
                          </Tooltip>
                        )}
                      </div>
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
