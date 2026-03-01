import { useForm } from "@mantine/form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "~/hooks/useDynamicTextareaSize"
import { toBase64 } from "~/libs/to-base64"
import { useMessageOption } from "~/hooks/useMessageOption"
import { Checkbox, Dropdown, Switch, Tooltip, Select, Popover } from "antd"
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
  PaperclipIcon,
  Brain,
  PlusIcon,
  MinusIcon,
  ArrowUp
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
import { isThinkingCapableModel, isGptOssModel } from "~/libs/model-utils"
import { useStoreChatModelSettings } from "~/store/model"
import { useMessageQueue } from "@/hooks/useMessageQueue"
import { QueuedMessagesList } from "@/components/Common/QueuedMessagesList"
type Props = {
  dropedFile: File | undefined
}

export const PlaygroundForm = ({ dropedFile }: Props) => {
  const { t } = useTranslation(["playground", "common"])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const combinedUploadInputRef = React.useRef<HTMLInputElement>(null)

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

  // Thinking mode state
  const [defaultThinkingMode] = useStorage("defaultThinkingMode", false)
  const thinking = useStoreChatModelSettings((state) => state.thinking)
  const setThinking = useStoreChatModelSettings((state) => state.setThinking)

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
  const [persistChatInput] = useStorage("persistChatInput", false)
  const [persistedMessage, setPersistedMessage] = useStorage(
    "playgroundPersistedMessage",
    ""
  )
  const [enableMessageQueue] = useStorage("enableMessageQueue", false)
  const [optimizeQueueForSmallScreen] = useStorage(
    "optimizeQueueForSmallScreen",
    false
  )

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
      image: "",
      images: [] as string[]
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

  // Separate effect for restoring persisted message to handle async useStorage
  React.useEffect(() => {
    if (persistChatInput && persistedMessage && !form.values.message) {
      form.setFieldValue("message", persistedMessage)
    }
  }, [persistChatInput, persistedMessage])

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
        const currentImages = form.values.images || []
        form.setFieldValue("images", [...currentImages, base64])
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
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)

      for (const file of files) {
        const isUnsupported = otherUnsupportedTypes.includes(file.type)

        if (isUnsupported) {
          console.error("File type not supported:", file.type)
          continue
        }

        const isImage = file.type.startsWith("image/")
        if (isImage) {
          const base64 = await toBase64(file)
          const currentImages = form.values.images || []
          form.setFieldValue("images", [...currentImages, base64])
        } else {
          await handleFileUpload(file)
        }
      }
    }
  }

  const onCombinedUploadInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }
    const files = Array.from(e.target.files)
    for (const file of files) {
      await onInputChange(file)
    }
    e.target.value = ""
  }
  const removeImage = (index: number) => {
    const currentImages = form.values.images || []
    const newImages = currentImages.filter((_, i) => i !== index)
    form.setFieldValue("images", newImages)
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

  const validateBeforeMessageSend = async () => {
    if (!selectedModel || selectedModel.length === 0) {
      form.setFieldError("message", t("formError.noModel"))
      return false
    }

    if (webSearch) {
      const defaultEM = await defaultEmbeddingModelForRag()
      const simpleSearch = await getIsSimpleInternetSearch()
      if (!defaultEM && !simpleSearch) {
        form.setFieldError("message", t("formError.noEmbeddingModel"))
        return false
      }
    }

    return true
  }

  const sendQueuedTextMessage = async (payload: {
    message: string
    images: string[]
  }) => {
    const trimmedMessage = payload.message.trim()
    const hasImages = payload.images.length > 0
    if (!trimmedMessage && !hasImages) {
      throw new Error("Queue item is empty")
    }

    const isValid = await validateBeforeMessageSend()
    if (!isValid) {
      throw new Error("Validation failed")
    }

    await sendMessage({
      image: payload.images.length > 0 ? payload.images[0] : "",
      images: payload.images,
      message: trimmedMessage,
      docs: []
    })
  }

  const {
    queuedMessages,
    enqueueMessage,
    deleteQueuedMessage,
    takeQueuedMessage,
    sendQueuedMessageNow
  } = useMessageQueue({
    enabled: enableMessageQueue,
    streaming: isSending,
    onSendMessage: sendQueuedTextMessage,
    onStopStreaming: stopStreamingRequest
  })
  const [isQueuePanelExpanded, setIsQueuePanelExpanded] = React.useState(false)
  const hasQueuedMessages = queuedMessages.length > 0
  const useCompactActions = optimizeQueueForSmallScreen
  const [isCompactActionsPopoverOpen, setIsCompactActionsPopoverOpen] =
    React.useState(false)

  React.useEffect(() => {
    if (
      !enableMessageQueue ||
      !optimizeQueueForSmallScreen ||
      !hasQueuedMessages
    ) {
      setIsQueuePanelExpanded(false)
    }
  }, [enableMessageQueue, hasQueuedMessages, optimizeQueueForSmallScreen])

  React.useEffect(() => {
    if (!useCompactActions) {
      setIsCompactActionsPopoverOpen(false)
    }
  }, [useCompactActions])

  const sendFormValue = async (value: {
    message: string
    image: string
    images: string[]
  }) => {
    if (
      value.message.trim().length === 0 &&
      (!value.images || value.images.length === 0) &&
      selectedDocuments.length === 0 &&
      uploadedFiles.length === 0
    ) {
      return
    }

    const isValid = await validateBeforeMessageSend()
    if (!isValid) {
      return
    }

    form.reset()
    clearSelectedDocuments()
    clearUploadedFiles()
    if (persistChatInput) {
      setPersistedMessage("")
    }
    textAreaFocus()

    await sendMessage({
      image: value.images && value.images.length > 0 ? value.images[0] : "",
      images: value.images,
      message: value.message.trim(),
      docs: selectedDocuments.map((doc) => ({
        type: "tab",
        tabId: doc.id,
        title: doc.title,
        url: doc.url,
        favIconUrl: doc.favIconUrl
      }))
    })
  }

  const handleFormSubmit = async (value: {
    message: string
    image: string
    images: string[]
  }) => {
    await stopListening()

    if (enableMessageQueue && isSending) {
      const enqueued = enqueueMessage({
        message: value.message,
        images: value.images || []
      })
      if (enqueued) {
        form.setFieldValue("message", "")
        form.setFieldValue("images", [])
        if (persistChatInput) {
          setPersistedMessage("")
        }
        closeMentions()
      }
      return
    }

    await sendFormValue(value)
  }

  const submitForm = () => {
    form.onSubmit(handleFormSubmit)()
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
        isSending: isSending && !enableMessageQueue
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

  const compactActionsPopoverContent = (
    <div className="w-60 space-y-2">
      {!selectedKnowledge && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 dark:border-[#404040]">
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {t("tooltip.searchInternet")}
          </span>
          <Switch
            size="small"
            value={webSearch}
            onChange={(enabled) => setWebSearch(enabled)}
            checkedChildren={t("form.webSearch.on")}
            unCheckedChildren={t("form.webSearch.off")}
          />
        </div>
      )}
      {defaultThinkingMode && isThinkingCapableModel(selectedModel) && (
        isGptOssModel(selectedModel) ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 dark:border-[#404040]">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {t("tooltip.thinking")}
            </span>
            <Select
              size="small"
              value={typeof thinking === "string" ? thinking : "medium"}
              onChange={(value) =>
                setThinking?.(value as "low" | "medium" | "high")
              }
              options={[
                {
                  value: "low",
                  label: t("form.thinking.levels.low")
                },
                {
                  value: "medium",
                  label: t("form.thinking.levels.medium")
                },
                {
                  value: "high",
                  label: t("form.thinking.levels.high")
                }
              ]}
              className="w-24"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 dark:border-[#404040]">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {t("tooltip.thinking")}
            </span>
            <Switch
              size="small"
              checked={!!thinking}
              onChange={(enabled) => setThinking?.(enabled)}
              checkedChildren={t("form.thinking.on")}
              unCheckedChildren={t("form.thinking.off")}
            />
          </div>
        )
      )}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 dark:border-[#404040]">
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {t("sendWhenEnter")}
        </span>
        <Switch
          size="small"
          checked={sendWhenEnter}
          onChange={(enabled) => setSendWhenEnter(enabled)}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 dark:border-[#404040]">
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {t("useOCR")}
        </span>
        <Switch
          size="small"
          checked={useOCR}
          onChange={(enabled) => setUseOCR(enabled)}
        />
      </div>
      {history.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setHistory([])
            setIsCompactActionsPopoverOpen(false)
          }}
          className={`flex w-full items-center justify-between rounded-lg border border-gray-200 px-2 py-1.5 text-left dark:border-[#404040] ${
            chatMode === "rag" ? "hidden" : "flex"
          }`}>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {t("tooltip.clearContext")}
          </span>
          <EraserIcon className="h-4 w-4 text-gray-500 dark:text-gray-300" />
        </button>
      )}
    </div>
  )

  return (
    <div className="flex w-full flex-col items-center px-2">
      <div className="relative z-10 flex w-full flex-col items-center justify-center gap-2 text-base">
        <div className="relative flex w-full flex-row justify-center gap-2 lg:w-3/5">
          <div
            data-istemporary-chat={temporaryChat}
            data-checkwidemode={checkWideMode}
            className={` bg-neutral-50/70  dark:bg-[#2a2a2a]/70 relative w-full max-w-[48rem] p-1 backdrop-blur-3xl duration-100 border border-gray-300 rounded-t-xl  dark:border-[#404040] data-[istemporary-chat='true']:bg-gray-200/70 data-[istemporary-chat='true']:dark:bg-black/70 data-[checkwidemode='true']:max-w-none`}>
            {enableMessageQueue &&
              optimizeQueueForSmallScreen &&
              hasQueuedMessages && (
                <div className="px-2 pt-2 md:hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setIsQueuePanelExpanded((previous) => !previous)
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-dashed border-gray-300 bg-white/70 px-3 py-2 text-xs text-gray-700 dark:border-[#4a4a4a] dark:bg-[#303030]/70 dark:text-gray-200"
                    aria-expanded={isQueuePanelExpanded}
                    aria-controls="playground-queued-messages">
                    <span className="inline-flex items-center gap-2 font-medium">
                      {t("form.queue.title", "Queued messages")}
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-[#454545] dark:text-gray-200">
                        {queuedMessages.length}
                      </span>
                    </span>
                    {isQueuePanelExpanded ? (
                      <MinusIcon className="h-3.5 w-3.5" />
                    ) : (
                      <PlusIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            {enableMessageQueue && (
              <div
                id="playground-queued-messages"
                className={
                  optimizeQueueForSmallScreen && !isQueuePanelExpanded
                    ? "hidden md:block"
                    : "block"
                }>
                <QueuedMessagesList
                  queuedMessages={queuedMessages}
                  onDelete={deleteQueuedMessage}
                  onEdit={(id) => {
                    const queuedItem = takeQueuedMessage(id)
                    if (!queuedItem) {
                      return
                    }
                    form.setFieldValue("message", queuedItem.message)
                    form.setFieldValue("images", queuedItem.images || [])
                    if (persistChatInput) {
                      setPersistedMessage(queuedItem.message)
                    }
                    textAreaFocus()
                  }}
                  onSend={sendQueuedMessageNow}
                  title={t("form.queue.title", "Queued messages")}
                />
              </div>
            )}
            {form.values.images && form.values.images.length > 0 && (
              <div className="p-3 border-b border-gray-200 dark:border-[#404040]">
                <div className="flex flex-wrap gap-2">
                  {form.values.images.map((img, index) => (
                    <div key={index} className="relative">
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 flex items-center justify-center z-10 bg-white dark:bg-[#2a2a2a] p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#404040] text-black dark:text-gray-100 shadow-md">
                        <X className="h-3 w-3" />
                      </button>
                      <Image
                        src={img}
                        alt={`Uploaded Image ${index + 1}`}
                        preview={true}
                        className="rounded-md max-h-32 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  onSubmit={form.onSubmit(handleFormSubmit)}
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
                  <input
                    id="combined-upload"
                    name="combined-upload"
                    type="file"
                    className="sr-only"
                    ref={combinedUploadInputRef}
                    accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                    multiple={true}
                    onChange={onCombinedUploadInputChange}
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
                          // Persist message as user types
                          if (persistChatInput) {
                            setPersistedMessage(e.target.value)
                          }
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
                      <div
                        className={`items-center gap-3 ${
                          useCompactActions ? "hidden md:flex" : "flex"
                        }`}>
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
                        {defaultThinkingMode && isThinkingCapableModel(selectedModel) &&
                          (isGptOssModel(selectedModel) ? (
                            // For gpt-oss: Only show level selector (no on/off toggle)
                            <div className="inline-flex items-center gap-2">
                              <Tooltip title="Adjust reasoning intensity (always enabled)">
                                <div className="inline-flex items-center gap-2">
                                  <Brain className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                              </Tooltip>
                              <Select
                                size="small"
                                value={
                                  typeof thinking === "string"
                                    ? thinking
                                    : "medium"
                                }
                                onChange={(value) =>
                                  setThinking?.(
                                    value as "low" | "medium" | "high"
                                  )
                                }
                                options={[
                                  {
                                    value: "low",
                                    label: t("form.thinking.levels.low")
                                  },
                                  {
                                    value: "medium",
                                    label: t("form.thinking.levels.medium")
                                  },
                                  {
                                    value: "high",
                                    label: t("form.thinking.levels.high")
                                  }
                                ]}
                                className="w-24"
                              />
                            </div>
                          ) : (
                            // For other models: Show toggle (can enable/disable)
                            <div className="inline-flex items-center gap-2">
                              <Tooltip title={t("tooltip.thinking")}>
                                <div className="inline-flex items-center gap-2">
                                  <Brain className="h-5 w-5 dark:text-gray-300" />
                                  <Switch
                                    checked={!!thinking}
                                    onChange={(e) => setThinking?.(e)}
                                    checkedChildren={t("form.thinking.on")}
                                    unCheckedChildren={t("form.thinking.off")}
                                  />
                                </div>
                              </Tooltip>
                            </div>
                          ))}
                      </div>
                      <div
                        className={`flex items-center gap-3 ${
                          useCompactActions
                            ? "w-full justify-between md:w-auto md:justify-end"
                            : "!justify-end"
                        }`}>
                        {useCompactActions && (
                          <Popover
                            trigger="click"
                            placement="topRight"
                            open={isCompactActionsPopoverOpen}
                            onOpenChange={setIsCompactActionsPopoverOpen}
                            content={compactActionsPopoverContent}>
                            <Tooltip title={t("common:more", "More")}>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md border border-gray-300 p-1.5 dark:border-[#404040] dark:text-gray-300 md:hidden">
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          </Popover>
                        )}
                        <div
                          className={`flex items-center gap-3 ${
                            useCompactActions ? "ml-auto" : ""
                          }`}>
                        <div
                          className={`items-center gap-3 ${
                            useCompactActions ? "hidden md:flex" : "flex"
                          }`}>
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
                        </div>
                        <KnowledgeSelect />
                        <Tooltip title={t("tooltip.uploadDocuments")}>
                          <button
                            type="button"
                            onClick={() => {
                              if (useCompactActions) {
                                combinedUploadInputRef.current?.click()
                                return
                              }
                              fileInputRef.current?.click()
                            }}
                            className={`flex items-center justify-center dark:text-gray-300 ${
                              useCompactActions ? "p-1.5" : ""
                            }`}>
                            <PaperclipIcon className="h-5 w-5" />
                          </button>
                        </Tooltip>
                        {useCompactActions && browserSupportsSpeechRecognition && (
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
                              className="inline-flex items-center justify-center p-1.5 dark:text-gray-300 md:hidden">
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

                        {isSending && !enableMessageQueue ? (
                          <Tooltip title={t("tooltip.stopStreaming")}>
                            <button
                              type="button"
                              onClick={stopStreamingRequest}
                              className="text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-[#404040] rounded-md p-1">
                              <StopCircleIcon className="size-5" />
                            </button>{" "}
                          </Tooltip>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {isSending && (
                              <Tooltip title={t("tooltip.stopStreaming")}>
                                <button
                                  type="button"
                                  onClick={stopStreamingRequest}
                                  className="text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-[#404040] rounded-md p-1">
                                  <StopCircleIcon className="size-5" />
                                </button>
                              </Tooltip>
                            )}
                            {useCompactActions ? (
                              <Tooltip
                                title={
                                  isSending && enableMessageQueue
                                    ? t("form.queue.add", "Queue")
                                    : t("common:submit")
                                }>
                                <button
                                  type="submit"
                                  disabled={isSending && !enableMessageQueue}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-black disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-gray-100">
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            ) : (
                              <Dropdown.Button
                                htmlType="submit"
                                disabled={isSending && !enableMessageQueue}
                                className="!justify-end !w-auto"
                                icon={
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24">
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
                                  {isSending && enableMessageQueue
                                    ? t("form.queue.add", "Queue")
                                    : t("common:submit")}
                                </div>
                              </Dropdown.Button>
                            )}
                          </div>
                        )}
                        </div>
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
