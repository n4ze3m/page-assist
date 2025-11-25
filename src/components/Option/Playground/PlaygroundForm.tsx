import { useForm } from "@mantine/form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import React from "react"
import useDynamicTextareaSize from "~/hooks/useDynamicTextareaSize"
import { toBase64 } from "~/libs/to-base64"
import { useMessageOption } from "~/hooks/useMessageOption"
import {
  Checkbox,
  Dropdown,
  Switch,
  Tooltip,
  notification,
  Popover,
  Modal
} from "antd"
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
  Gauge
} from "lucide-react"
import { getVariable } from "@/utils/select-variable"
import { useTranslation } from "react-i18next"
import { KnowledgeSelect } from "../Knowledge/KnowledgeSelect"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { handleChatInputKeyDown } from "@/utils/key-down"
import { getIsSimpleInternetSearch } from "@/services/search"
import { useStorage } from "@plasmohq/storage/hook"
import { useTabMentions } from "~/hooks/useTabMentions"
import { useFocusShortcuts } from "~/hooks/keyboard"
import { MentionsDropdown } from "./MentionsDropdown"
import { DocumentChip } from "./DocumentChip"
import { otherUnsupportedTypes } from "../Knowledge/utils/unsupported-types"
import { PASTED_TEXT_CHAR_LIMIT } from "@/utils/constant"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { CurrentChatModelSettings } from "@/components/Common/Settings/CurrentChatModelSettings"
import { PromptSelect } from "@/components/Common/PromptSelect"
import { useConnectionState } from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { Link } from "react-router-dom"
import { fetchChatModels } from "@/services/tldw-server"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { CharacterSelect } from "@/components/Common/CharacterSelect"
import { ProviderIcons } from "@/components/Common/ProviderIcon"
type Props = {
  dropedFile: File | undefined
}

export const PlaygroundForm = ({ dropedFile }: Props) => {
  const { t } = useTranslation(["playground", "common", "option"])
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
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    setSelectedKnowledge,
    selectedKnowledge,
    temporaryChat,
    setTemporaryChat,
    clearChat,
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
    clearUploadedFiles,
    queuedMessages,
    addQueuedMessage,
    clearQueuedMessages,
    serverChatId
  } = useMessageOption()

  const [autoSubmitVoiceMessage] = useStorage("autoSubmitVoiceMessage", false)
  const [openModelSettings, setOpenModelSettings] = React.useState(false)
  const [isContextModalOpen, setIsContextModalOpen] = React.useState(false)

  const { phase, isConnected } = useConnectionState()
  const isConnectionReady = isConnected && phase === ConnectionPhase.CONNECTED
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const hasServerAudio =
    isConnectionReady && !capsLoading && capabilities?.hasAudio
  const [hasShownConnectBanner, setHasShownConnectBanner] = React.useState(false)
  const [showConnectBanner, setShowConnectBanner] = React.useState(false)
  const [showQueuedBanner, setShowQueuedBanner] = React.useState(true)
  const [autoStopTimeout] = useStorage("autoStopTimeout", 2000)
  const [sttModel] = useStorage("sttModel", "whisper-1")
  const [sttUseSegmentation] = useStorage("sttUseSegmentation", false)
  const [sttTimestampGranularities] = useStorage(
    "sttTimestampGranularities",
    "segment"
  )
  const [sttPrompt] = useStorage("sttPrompt", "")
  const [sttTask] = useStorage("sttTask", "transcribe")
  const [sttResponseFormat] = useStorage("sttResponseFormat", "json")
  const [sttTemperature] = useStorage("sttTemperature", 0)
  const [sttSegK] = useStorage("sttSegK", 6)
  const [sttSegMinSegmentSize] = useStorage("sttSegMinSegmentSize", 5)
  const [sttSegLambdaBalance] = useStorage("sttSegLambdaBalance", 0.01)
  const [sttSegUtteranceExpansionWidth] = useStorage(
    "sttSegUtteranceExpansionWidth",
    2
  )
  const [sttSegEmbeddingsProvider] = useStorage("sttSegEmbeddingsProvider", "")
  const [sttSegEmbeddingsModel] = useStorage("sttSegEmbeddingsModel", "")

  const {
    tabMentionsEnabled,
    showMentions,
    mentionPosition,
    filteredTabs,
    availableTabs,
    selectedDocuments,
    handleTextChange,
    insertMention,
    closeMentions,
    addDocument,
    removeDocument,
    clearSelectedDocuments,
    reloadTabs,
    handleMentionsOpen
  } = useTabMentions(textareaRef)

  const { data: composerModels } = useQuery({
    queryKey: ["playground:chatModels"],
    queryFn: () => fetchChatModels({ returnEmpty: true }),
    enabled: true
  })

  const modelSummaryLabel = React.useMemo(() => {
    if (!selectedModel) {
      return t(
        "playground:composer.modelPlaceholder",
        "API / model"
      )
    }
    const models = (composerModels as any[]) || []
    const match = models.find((m) => m.model === selectedModel)
    return (
      match?.nickname ||
      match?.model ||
      selectedModel
    )
  }, [composerModels, selectedModel, t])

  const promptSummaryLabel = React.useMemo(() => {
    if (selectedSystemPrompt) {
      return t(
        "playground:composer.summary.systemPrompt",
        "System prompt"
      )
    }
    if (selectedQuickPrompt) {
      return t(
        "playground:composer.summary.customPrompt",
        "Custom prompt"
      )
    }
    return t(
      "playground:composer.summary.noPrompt",
      "No prompt"
    )
  }, [selectedQuickPrompt, selectedSystemPrompt, t])

  // Enable focus shortcuts (Shift+Esc to focus textarea)
  useFocusShortcuts(textareaRef, true)

  const [pasteLargeTextAsFile] = useStorage("pasteLargeTextAsFile", false)
  const textAreaFocus = React.useCallback(() => {
    const el = textareaRef.current
    if (!el) {
      return
    }
    if (el.selectionStart === el.selectionEnd) {
      const ua =
        typeof navigator !== "undefined" ? navigator.userAgent : ""
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua
        )
      if (!isMobile) {
        el.focus()
      } else {
        el.blur()
      }
    }
  }, [])

  const form = useForm({
    initialValues: {
      message: "",
      image: ""
    }
  })

  // Allow other components (e.g., connection card) to request focus
  React.useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        textAreaFocus()
      }
    }
    window.addEventListener('tldw:focus-composer', handler)
    return () => window.removeEventListener('tldw:focus-composer', handler)
  }, [textAreaFocus])

  // Seed composer when a media item requests discussion (e.g., from Quick ingest)
  React.useEffect(() => {
    try {
      if (typeof window === "undefined") return
      const raw = localStorage.getItem("tldw:discussMediaPrompt")
      if (!raw) return
      localStorage.removeItem("tldw:discussMediaPrompt")
      const payload = JSON.parse(raw) as { mediaId?: string; url?: string }
      const hint = payload?.url
        ? `Let's talk about the media I just ingested: ${payload.url}`
        : payload?.mediaId
          ? `Let's talk about media ${payload.mediaId}.`
          : ""
      if (!hint) return
      form.setFieldValue("message", hint)
      textAreaFocus()
    } catch {
      // ignore storage/parse errors
    }
  }, [form, textAreaFocus])

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as any
      if (!detail) return
      const hint = detail.url
        ? `Let's talk about the media I just ingested: ${detail.url}`
        : detail.mediaId
          ? `Let's talk about media ${detail.mediaId}.`
          : ""
      if (!hint) return
      form.setFieldValue("message", hint)
      textAreaFocus()
    }
    window.addEventListener("tldw:discuss-media", handler as any)
    return () => {
      window.removeEventListener("tldw:discuss-media", handler as any)
    }
  }, [form, textAreaFocus])

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

  React.useEffect(() => {
    if (isConnectionReady) {
      setShowConnectBanner(false)
    }
  }, [isConnectionReady])

  React.useEffect(() => {
    if (queuedMessages.length > 0) {
      setShowQueuedBanner(true)
    } else {
      setShowQueuedBanner(false)
    }
  }, [queuedMessages])

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

  const handleDisconnectedFocus = () => {
    if (!isConnectionReady && !hasShownConnectBanner) {
      setShowConnectBanner(true)
      setHasShownConnectBanner(true)
    }
  }

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
    if (!selectedQuickPrompt) {
      return
    }

    const currentMessage = form.values.message || ""
    const promptText = selectedQuickPrompt

    const applyOverwrite = () => {
      const word = getVariable(promptText)
      form.setFieldValue("message", promptText)
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
      setSelectedQuickPrompt(null)
      return
    }

    const applyAppend = () => {
      const next =
        currentMessage.trim().length > 0
          ? `${currentMessage}\n\n${promptText}`
          : promptText
      form.setFieldValue("message", next)
      setSelectedQuickPrompt(null)
    }

    if (!currentMessage.trim()) {
      applyOverwrite()
      return
    }

    Modal.confirm({
      title: t("option:promptInsert.confirmTitle", {
        defaultValue: "Use prompt in chat?"
      }),
      content: t("option:promptInsert.confirmDescription", {
        defaultValue:
          "Your message already has text. Do you want to overwrite it with this prompt or append the prompt below it?"
      }),
      okText: t("option:promptInsert.overwrite", {
        defaultValue: "Overwrite message"
      }),
      cancelText: t("option:promptInsert.append", {
        defaultValue: "Append"
      }),
      closable: false,
      maskClosable: false,
      onOk: () => {
        applyOverwrite()
      },
      onCancel: () => {
        applyAppend()
      }
    })
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
      if (!isConnectionReady) {
        addQueuedMessage({
          message: value.message.trim(),
          image: value.image
        })
        form.reset()
        clearSelectedDocuments()
        clearUploadedFiles()
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

  const submitFormFromQueued = (message: string, image: string) => {
    if (!isConnectionReady) {
      return
    }
    form.onSubmit(async () => {
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
        image,
        message,
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

  const handleToggleTemporaryChat = React.useCallback(
    (next: boolean) => {
      if (isFireFoxPrivateMode) {
        notification.error({
          message: t(
            "common:privateModeSaveErrorTitle",
            "tldw Assistant can't save data"
          ),
          description: t(
            "playground:errors.privateModeDescription",
            "Firefox Private Mode does not support saving chat. Temporary chat is enabled by default. More fixes coming soon."
          )
        })
        return
      }
      setTemporaryChat(next)
      if (history.length > 0) {
        clearChat()
      }
    },
    [clearChat, history.length]
  )

  const handleClearContext = React.useCallback(() => {
    setHistory([])
  }, [setHistory])

  const handleImageUpload = React.useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleDocumentUpload = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const serverRecorderRef = React.useRef<MediaRecorder | null>(null)
  const serverChunksRef = React.useRef<BlobPart[]>([])
  const [isServerDictating, setIsServerDictating] = React.useState(false)

  const stopServerDictation = React.useCallback(() => {
    const rec = serverRecorderRef.current
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop()
      } catch {}
    }
  }, [])

  const handleSpeechToggle = React.useCallback(() => {
    if (isListening) {
      stopSpeechRecognition()
    } else {
      resetTranscript()
      startListening({
        continuous: true,
        lang: speechToTextLanguage
      })
    }
  }, [isListening, resetTranscript, speechToTextLanguage, startListening, stopSpeechRecognition])

  const handleServerDictationToggle = React.useCallback(async () => {
    if (isServerDictating) {
      stopServerDictation()
      return
    }
    if (!hasServerAudio) {
      notification.error({
        message: t("playground:actions.speechErrorTitle", "Dictation unavailable"),
        description: t(
          "playground:actions.speechErrorBody",
          "Connect to a tldw server that exposes the audio transcriptions API to use dictation."
        )
      })
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      serverChunksRef.current = []
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          serverChunksRef.current.push(ev.data)
        }
      }
      recorder.onerror = (event: Event) => {
        console.error("MediaRecorder error", event)
        notification.error({
          message: t("playground:actions.speechErrorTitle", "Dictation failed"),
          description: t(
            "playground:actions.speechErrorBody",
            "Microphone recording error. Check your permissions and try again."
          )
        })
      }
      recorder.onstop = async () => {
        try {
          const blob = new Blob(serverChunksRef.current, {
            type: recorder.mimeType || "audio/webm"
          })
          if (blob.size === 0) {
            return
          }
          const sttOptions: Record<string, any> = {
            language: speechToTextLanguage
          }
          if (sttModel && sttModel.trim().length > 0) {
            sttOptions.model = sttModel.trim()
          }
          if (sttTimestampGranularities) {
            sttOptions.timestamp_granularities = sttTimestampGranularities
          }
          if (sttPrompt && sttPrompt.trim().length > 0) {
            sttOptions.prompt = sttPrompt.trim()
          }
          if (sttTask) {
            sttOptions.task = sttTask
          }
          if (sttResponseFormat) {
            sttOptions.response_format = sttResponseFormat
          }
          if (typeof sttTemperature === "number") {
            sttOptions.temperature = sttTemperature
          }
          if (sttUseSegmentation) {
            sttOptions.segment = true
            if (typeof sttSegK === "number") {
              sttOptions.seg_K = sttSegK
            }
            if (typeof sttSegMinSegmentSize === "number") {
              sttOptions.seg_min_segment_size = sttSegMinSegmentSize
            }
            if (typeof sttSegLambdaBalance === "number") {
              sttOptions.seg_lambda_balance = sttSegLambdaBalance
            }
            if (typeof sttSegUtteranceExpansionWidth === "number") {
              sttOptions.seg_utterance_expansion_width =
                sttSegUtteranceExpansionWidth
            }
            if (sttSegEmbeddingsProvider?.trim()) {
              sttOptions.seg_embeddings_provider =
                sttSegEmbeddingsProvider.trim()
            }
            if (sttSegEmbeddingsModel?.trim()) {
              sttOptions.seg_embeddings_model = sttSegEmbeddingsModel.trim()
            }
          }
          const res = await tldwClient.transcribeAudio(blob, sttOptions)
          let text = ""
          if (res) {
            if (typeof res === "string") {
              text = res
            } else if (typeof (res as any).text === "string") {
              text = (res as any).text
            } else if (typeof (res as any).transcript === "string") {
              text = (res as any).transcript
            } else if (Array.isArray((res as any).segments)) {
              text = (res as any).segments
                .map((s: any) => s?.text || "")
                .join(" ")
                .trim()
            }
          }
          if (text) {
            form.setFieldValue("message", text)
          } else {
            notification.error({
              message: t("playground:actions.speechErrorTitle", "Dictation failed"),
              description: t(
                "playground:actions.speechNoText",
                "The transcription did not return any text."
              )
            })
          }
        } catch (e: any) {
          notification.error({
            message: t("playground:actions.speechErrorTitle", "Dictation failed"),
            description: e?.message || t(
              "playground:actions.speechErrorBody",
              "Transcription request failed. Check tldw server health."
            )
          })
        } finally {
          try {
            stream.getTracks().forEach((trk) => trk.stop())
          } catch {}
          serverRecorderRef.current = null
          setIsServerDictating(false)
        }
      }
      serverRecorderRef.current = recorder
      recorder.start()
      setIsServerDictating(true)
    } catch (e: any) {
      notification.error({
        message: t("playground:actions.speechErrorTitle", "Dictation failed"),
        description: t(
          "playground:actions.speechMicError",
          "Unable to access your microphone. Check browser permissions and try again."
        )
      })
    }
  }, [
    hasServerAudio,
    isServerDictating,
    speechToTextLanguage,
    sttModel,
    sttTimestampGranularities,
    sttUseSegmentation,
    stopServerDictation,
    t,
    form
  ])

  React.useEffect(() => {
    if (isContextModalOpen) {
      reloadTabs()
    }
  }, [isContextModalOpen, reloadTabs])

  const moreToolsContent = React.useMemo(() => (
    <div className="flex w-64 flex-col gap-3">
      {!selectedKnowledge && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {webSearch
              ? t("playground:actions.webSearchOn")
              : t("playground:actions.webSearchOff")}
          </span>
          <Switch
            size="small"
            checked={webSearch}
            onChange={(value) => setWebSearch(value)}
            checkedChildren={t("form.webSearch.on")}
            unCheckedChildren={t("form.webSearch.off")}
          />
        </div>
      )}
      {!selectedKnowledge && (
        <button
          type="button"
          onClick={handleImageUpload}
          disabled={chatMode === "rag"}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200 dark:hover:bg-[#2a2a2a]"
        >
          <span>{t("playground:actions.upload", "Attach image")}</span>
          <ImageIcon className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={handleDocumentUpload}
        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-[#2a2a2a]"
      >
        <span>{t("tooltip.uploadDocuments")}</span>
        <PaperclipIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleClearContext}
        disabled={history.length === 0}
        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200 dark:hover:bg-[#2a2a2a]"
      >
        <span>{t("tooltip.clearContext")}</span>
        <EraserIcon className="h-4 w-4" />
      </button>
    </div>
  ), [
    chatMode,
    handleClearContext,
    handleDocumentUpload,
    handleImageUpload,
    history.length,
    selectedKnowledge,
    setWebSearch,
    t,
    webSearch
  ])

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
            className={` bg-neutral-50  dark:bg-[#2D2D2D] relative w-full max-w-[48rem] p-1 backdrop-blur-lg duration-100 border border-gray-300 rounded-t-xl  dark:border-gray-600 data-[istemporary-chat='true']:bg-purple-900 data-[istemporary-chat='true']:dark:bg-purple-900 data-[checkwidemode='true']:max-w-none ${
              !isConnectionReady ? "opacity-80" : ""
            }`}>
            <div
              className={`border-b border-gray-200 dark:border-gray-600 relative ${
                form.values.image.length === 0 ? "hidden" : "block"
              }`}>
              <button
                type="button"
                onClick={() => {
                  form.setFieldValue("image", "")
                }}
                className="absolute top-1 left-1 flex items-center justify-center z-10 bg-white dark:bg-[#2D2D2D] p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-black dark:text-gray-100">
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
              <div className="p-3" data-playground-tabs="true" tabIndex={-1}>
                <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
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
              <div
                className="p-3 border-b border-gray-200 dark:border-gray-600"
                data-playground-uploads="true"
                tabIndex={-1}
              >
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
                <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <div className="flex flex-wrap gap-1.5">
                    {uploadedFiles.map((file) => (
                      <button
                        key={file.id}
                        className="relative group p-1.5 w-60 flex items-center gap-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 rounded-2xl text-left"
                        type="button">
                        <div className="p-3 bg-black/20 dark:bg-white/10 text-white rounded-xl">
                          <FileIcon className="size-5" />
                        </div>
                        <div className="flex flex-col justify-center -space-y-0.5 px-2.5 w-full">
                          <div className="dark:text-gray-100 text-sm font-medium line-clamp-1 mb-1">
                            {file.filename}
                          </div>
                          <div className="flex justify-between text-gray-500 text-xs line-clamp-1">
                            File{" "}
                            <span className="capitalize">
                              {new Intl.NumberFormat(undefined, {
                                style: "unit",
                                unit: "megabyte",
                                maximumFractionDigits: 2
                              }).format(file.size / (1024 * 1024))}
                            </span>
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1">
                          <button
                            onClick={() => removeUploadedFile(file.id)}
                            className="bg-white dark:bg-gray-700 text-black dark:text-gray-100 border border-gray-50 dark:border-gray-600 rounded-full group-hover:visible invisible transition"
                            type="button">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
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

                  <div
                    className={`w-full flex flex-col px-2 ${
                      !isConnectionReady
                        ? "rounded-md border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-[#1b1b1b]"
                        : ""
                    }`}>
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
                        onKeyDown={(e) => {
                          if (!isConnectionReady) {
                            if (e.key === "Enter") {
                              e.preventDefault()
                            }
                            return
                          }
                          handleKeyDown(e)
                        }}
                        onFocus={handleDisconnectedFocus}
                        ref={textareaRef}
                        className={`px-2 py-2 w-full resize-none bg-transparent focus-within:outline-none focus:ring-0 focus-visible:ring-0 ring-0 dark:ring-0 border-0 dark:text-gray-100 ${
                          !isConnectionReady
                            ? "cursor-not-allowed text-gray-500 placeholder:text-gray-400 dark:text-gray-400 dark:placeholder:text-gray-500"
                            : ""
                        }`}
                        onPaste={handlePaste}
                        rows={1}
                        style={{ minHeight: "35px" }}
                        tabIndex={0}
                        placeholder={
                          isConnectionReady
                            ? t("form.textarea.placeholder")
                            : t(
                                "playground:composer.connectionPlaceholder",
                                "Connect to tldw to start chatting."
                              )
                        }
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
                        onSelect={() => {
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
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                        <span className="font-semibold uppercase tracking-wide">
                          {t("playground:composer.contextLabel", "Context:")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const trigger =
                              document.querySelector<HTMLElement>(
                                "[data-playground-knowledge-trigger='true']"
                              )
                            if (trigger) {
                              trigger.focus()
                              if (trigger instanceof HTMLButtonElement) {
                                trigger.click()
                              }
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-[#262626]">
                          <span className="font-medium">
                            {selectedKnowledge?.title ||
                              t(
                                "playground:composer.contextKnowledgeEmpty",
                                "No knowledge selected"
                              )}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const chips =
                              document.querySelector<HTMLElement>(
                                "[data-playground-tabs='true']"
                              )
                            chips?.focus()
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-[#262626]">
                          <span>
                            {t("playground:composer.contextTabs", {
                              defaultValue: "{{count}} tabs",
                              count: selectedDocuments.length
                            } as any) as string}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const files =
                              document.querySelector<HTMLElement>(
                                "[data-playground-uploads='true']"
                              )
                            if (files) {
                              files.focus()
                              files.scrollIntoView({ block: "nearest" })
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 hover:border-gray-300 hover:bg-gray-50 dark:hover:border-gray-600 dark:hover:bg-[#262626]">
                          <span>
                            {t("playground:composer.contextFiles", {
                              defaultValue: "{{count}} files",
                              count: uploadedFiles.length
                            } as any) as string}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsContextModalOpen(true)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                          {t("playground:composer.contextManager", "Context Management")}
                        </button>
                      </div>
                      <div className="mt-1 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex flex-col gap-0.5 text-xs text-gray-700 dark:text-gray-200">
                            <div className="flex items-center gap-1">
                              <Switch
                                size="small"
                                checked={temporaryChat}
                                onChange={handleToggleTemporaryChat}
                                aria-label={t("playground:actions.temporaryOff", "Save chat") as string}
                              />
                              <span>
                                {temporaryChat
                                  ? t("playground:actions.temporaryOn", "Temporary chat")
                                  : t("playground:actions.temporaryOff", "Save chat")}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              {temporaryChat
                                ? t(
                                    "playground:composer.persistence.ephemeral",
                                    "Not saved in history; clears when you close this tab."
                                  )
                                : serverChatId
                                  ? t(
                                      "playground:composer.persistence.server",
                                      "Saved in this browser and on your tldw server."
                                    )
                                  : t(
                                      "playground:composer.persistence.local",
                                      "Saved in this browser only."
                                    )}
                            </p>
                          </div>
                          <KnowledgeSelect />
                        </div>
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                          <CharacterSelect className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100" iconClassName="size-5" />
                          {(browserSupportsSpeechRecognition || hasServerAudio) && (
                            <Tooltip title={t("playground:tooltip.speechToText", "Speech to Text") as string}>
                              <button
                                type="button"
                                onClick={hasServerAudio ? handleServerDictationToggle : handleSpeechToggle}
                                className={`inline-flex items-center justify-center rounded-full border px-2 py-1 text-xs transition hover:bg-gray-100 dark:hover:bg-[#2a2a2a] ${
                                  (hasServerAudio && isServerDictating) || (!hasServerAudio && isListening)
                                    ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                                    : "border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-200"
                                }`}
                                aria-label={
                                  hasServerAudio
                                    ? (isServerDictating
                                        ? (t("playground:actions.speechStop", "Stop dictation") as string)
                                        : (t("playground:actions.speechStart", "Start dictation") as string))
                                    : (isListening
                                        ? (t("playground:actions.speechStop", "Stop dictation") as string)
                                        : (t("playground:actions.speechStart", "Start dictation") as string))
                                }>
                                <MicIcon className="h-4 w-4" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip
                            title={
                              t(
                                "common:currentChatModelSettings"
                              ) as string
                            }>
                            <button
                              type="button"
                              onClick={() => setOpenModelSettings(true)}
                              aria-label={
                                t(
                                  "common:currentChatModelSettings"
                                ) as string
                              }
                              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                              <Gauge
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              <span className="flex flex-col items-start text-left">
                                <span className="font-medium">
                                  {t("playground:composer.chatSettings", "Chat Settings")}
                                </span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {modelSummaryLabel} • {promptSummaryLabel}
                                </span>
                              </span>
                            </button>
                          </Tooltip>
                          <Popover
                            trigger="click"
                            placement="topRight"
                            content={moreToolsContent}
                            overlayClassName="playground-more-tools">
                            <button
                              type="button"
                              aria-label={t("playground:composer.moreTools", "More tools") as string}
                              title={t("playground:composer.moreTools", "More tools") as string}
                              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                              <span>
                                {t(
                                  "playground:composer.toolsButton",
                                  "+Tools"
                                )}
                              </span>
                            </button>
                          </Popover>

                          {!isSending ? (
                            <Dropdown.Button
                              htmlType="submit"
                              disabled={isSending || !isConnectionReady}
                              title={
                                !isConnectionReady
                                  ? (t(
                                      "playground:composer.connectToSend",
                                      "Connect to your tldw server to start chatting."
                                    ) as string)
                                  : undefined
                              }
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
                                {t("common:send", "Send")}
                              </div>
                            </Dropdown.Button>
                          ) : (
                            <Tooltip
                              title={
                                t("tooltip.stopStreaming") as string
                              }>
                              <button
                                type="button"
                                onClick={stopStreamingRequest}
                                className="text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md p-1">
                                <StopCircleIcon className="size-5" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                    {showConnectBanner && !isConnectionReady && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500 dark:bg-[#2a2310] dark:text-amber-100">
                        <p className="max-w-xs text-left">
                          {t(
                            "playground:composer.connectNotice",
                            "Connect to your tldw server in Settings to send messages."
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to="/settings/tldw"
                            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:bg-[#3a2b10] dark:text-amber-50 dark:hover:bg-[#4a3512]"
                          >
                            {t("settings:tldw.setupLink", "Set up server")}
                          </Link>
                          <Link
                            to="/settings/health"
                            className="text-xs font-medium text-amber-900 underline hover:text-amber-700 dark:text-amber-100 dark:hover:text-amber-300"
                          >
                            {t("settings:healthSummary.diagnostics", "Diagnostics")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowConnectBanner(false)}
                            className="inline-flex items-center rounded-full p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-[#3a2b10]"
                            aria-label={t("common:close", "Dismiss")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    {queuedMessages.length > 0 && showQueuedBanner && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-900 dark:border-green-500 dark:bg-[#102a10] dark:text-green-100">
                        <p className="max-w-xs text-left">
                          <span className="block font-medium">
                            {t(
                              "playground:composer.queuedBanner.title",
                              "Queued while offline"
                            )}
                          </span>
                          {t(
                            "playground:composer.queuedBanner.body",
                            "We’ll hold these messages and send them once your tldw server is connected."
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className={`rounded-md border border-green-300 bg-white px-2 py-1 text-xs font-medium text-green-900 hover:bg-green-100 dark:bg-[#163816] dark:text-green-50 dark:hover:bg-[#194419] ${
                              !isConnectionReady ? "cursor-not-allowed opacity-60" : ""
                            }`}
                            disabled={!isConnectionReady}
                            onClick={async () => {
                              if (!isConnectionReady) return
                              for (const item of queuedMessages) {
                                await submitFormFromQueued(item.message, item.image)
                              }
                              clearQueuedMessages()
                            }}>
                            {t(
                              "playground:composer.queuedBanner.sendNow",
                              "Send queued messages"
                            )}
                          </button>
                          <button
                            type="button"
                            className="text-xs font-medium text-green-900 underline hover:text-green-700 dark:text-green-100 dark:hover:text-green-300"
                            onClick={() => {
                              clearQueuedMessages()
                            }}>
                            {t(
                              "playground:composer.queuedBanner.clear",
                              "Clear queue"
                            )}
                          </button>
                          <Link
                            to="/settings/health"
                            className="text-xs font-medium text-green-900 underline hover:text-green-700 dark:text-green-100 dark:hover:text-green-300"
                          >
                            {t("settings:healthSummary.diagnostics", "Diagnostics")}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowQueuedBanner(false)}
                            className="inline-flex items-center rounded-full p-1 text-green-700 hover:bg-green-100 dark:text-green-200 dark:hover:bg-[#163816]"
                            aria-label={t("common:close", "Dismiss")}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
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
      {/* Modal/Drawer for current conversation settings */}
      <Modal
        open={isContextModalOpen}
        title={t("playground:composer.contextManagerTitle", "Context Management")}
        onCancel={() => setIsContextModalOpen(false)}
        footer={null}
        width={760}
        destroyOnHidden>
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t("playground:composer.contextMedia", "Media / Notes")}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("playground:composer.contextMediaHint", "Attach knowledge or notes that should steer the response.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const trigger =
                    document.querySelector<HTMLElement>(
                      "[data-playground-knowledge-trigger='true']"
                    )
                  if (trigger) {
                    trigger.click()
                  }
                  setIsContextModalOpen(false)
                }}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                {t("playground:composer.addKnowledge", "Add media / notes")}
              </button>
              {selectedKnowledge && (
                <button
                  type="button"
                  onClick={() => setSelectedKnowledge(null)}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                  {t("common:remove", "Remove")}
                </button>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1a1a1a]">
            {selectedKnowledge ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {selectedKnowledge.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedKnowledge?.db_type || t("playground:composer.contextMediaSelected", "Knowledge item")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKnowledge(null)}
                  className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2a2a2a]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("playground:composer.contextMediaEmpty", "No media or notes selected yet.")}
              </div>
            )}
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t("playground:composer.contextTabsTitle", "Tabs in context")}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("playground:composer.contextTabsHint", "Review or remove referenced tabs, or add more from your open browser tabs.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => reloadTabs()}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                {t("common:refresh", "Refresh")}
              </button>
              {selectedDocuments.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelectedDocuments}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                  {t("playground:composer.clearTabs", "Remove all tabs")}
                </button>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1a1a1a]">
            {selectedDocuments.length > 0 ? (
              <div className="flex flex-col gap-2">
                {selectedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-[#111]">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                        {doc.title}
                      </div>
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {doc.url}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(doc.id)}
                      className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2a2a2a]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("playground:composer.contextTabsEmpty", "No tabs added yet.")}
              </div>
            )}
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t("playground:composer.contextTabsAvailable", "Open tabs")}
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                {availableTabs.length > 0 ? (
                  availableTabs.map((tab) => (
                    <div
                      key={tab.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-[#161616]">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                          {tab.title}
                        </div>
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {tab.url}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addDocument(tab)}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                        {t("common:add", "Add")}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("playground:composer.noTabsFound", "No eligible open tabs found.")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t("playground:composer.contextFilesTitle", "Files in context")}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("playground:composer.contextFilesHint", "Review attached files, remove them, or add more.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click()
                }}
                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                {t("playground:composer.addFile", "Add file")}
              </button>
              {uploadedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={clearUploadedFiles}
                  className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-[#2a2a2a]">
                  {t("playground:composer.clearFiles", "Remove all files")}
                </button>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#1a1a1a]">
            {uploadedFiles.length > 0 ? (
              <div className="flex flex-col gap-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-[#111]">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                        {file.filename}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(file.id)}
                      className="rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#2a2a2a]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("playground:composer.contextFilesEmpty", "No files attached yet.")}
              </div>
            )}
          </div>
        </div>
      </Modal>
      <CurrentChatModelSettings
        open={openModelSettings}
        setOpen={setOpenModelSettings}
        isOCREnabled={useOCR}
      />
    </div>
  )
}
