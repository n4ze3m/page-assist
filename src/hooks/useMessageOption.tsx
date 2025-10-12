import React from "react"
import { type ChatHistory, type Message } from "~/store/option"
import { useStoreMessageOption } from "~/store/option"
import { removeMessageUsingHistoryId } from "@/db/dexie/helpers"
import { useNavigate } from "react-router-dom"
import { notification } from "antd"
import { useTranslation } from "react-i18next"
import { usePageAssist } from "@/context"
import { useWebUI } from "@/store/webui"
import { useStorage } from "@plasmohq/storage/hook"
import { useStoreChatModelSettings } from "@/store/model"
import { ChatDocuments } from "@/models/ChatTypes"
import { searchChatMode } from "./chat-modes/searchChatMode"
import { normalChatMode } from "./chat-modes/normalChatMode"
import { continueChatMode } from "./chat-modes/continueChatMode"
import { ragMode } from "./chat-modes/ragMode"
import {
  focusTextArea,
  validateBeforeSubmit,
  createSaveMessageOnSuccess,
  createSaveMessageOnError
} from "./utils/messageHelpers"
import {
  createRegenerateLastMessage,
  createEditMessage,
  createStopStreamingRequest,
  createBranchMessage
} from "./handlers/messageHandlers"
import { tabChatMode } from "./chat-modes/tabChatMode"
import { documentChatMode } from "./chat-modes/documentChatMode"
import { generateID } from "@/db/dexie/helpers"
import { UploadedFile } from "@/db/dexie/types"
import { updatePageTitle } from "@/utils/update-page-title"

export const useMessageOption = () => {
  const {
    controller: abortController,
    setController: setAbortController,
    messages,
    setMessages
  } = usePageAssist()
  const {
    history,
    setHistory,
    setStreaming,
    streaming,
    setIsFirstMessage,
    historyId,
    setHistoryId,
    isLoading,
    setIsLoading,
    isProcessing,
    setIsProcessing,
    chatMode,
    setChatMode,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    setIsSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    selectedKnowledge,
    setSelectedKnowledge,
    temporaryChat,
    setTemporaryChat,
    useOCR,
    setUseOCR,
    documentContext,
    setDocumentContext,
    uploadedFiles,
    setUploadedFiles,
    contextFiles,
    setContextFiles,
    actionInfo,
    setActionInfo,
    setFileRetrievalEnabled,
    fileRetrievalEnabled
  } = useStoreMessageOption()
  const [webuiTemporaryChat] = useStorage("webuiTemporaryChat", false)

  const currentChatModelSettings = useStoreChatModelSettings()
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const [defaultInternetSearchOn] = useStorage("defaultInternetSearchOn", false)
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )
  const { ttsEnabled } = useWebUI()

  const { t } = useTranslation("option")

  const navigate = useNavigate()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleFocusTextArea = () => focusTextArea(textareaRef)

  const handleFileUpload = async (file: File) => {
    try {
      const isImage = file.type.startsWith("image/")

      if (isImage) {
        return file
      }

      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        notification.error({
          message: "File Too Large",
          description: "File size must be less than 10MB"
        })
        return
      }

      const fileId = generateID()

      const { processFileUpload } = await import("~/utils/file-processor")
      const source = await processFileUpload(file)

      const uploadedFile: UploadedFile = {
        id: fileId,
        filename: file.name,
        type: file.type,
        content: source.content,
        size: file.size,
        uploadedAt: Date.now(),
        processed: false
      }

      setUploadedFiles([...uploadedFiles, uploadedFile])
      setContextFiles([...contextFiles, uploadedFile])

      return file
    } catch (error) {
      console.error("Error uploading file:", error)
      notification.error({
        message: "Upload Failed",
        description: "Failed to upload file. Please try again."
      })
      throw error
    }
  }

  const removeUploadedFile = async (fileId: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== fileId))
    setContextFiles(contextFiles.filter((f) => f.id !== fileId))
  }

  const clearUploadedFiles = () => {
    setUploadedFiles([])
  }

  const handleSetFileRetrievalEnabled = async (enabled: boolean) => {
    setFileRetrievalEnabled(enabled)
  }

  const clearChat = () => {
    navigate("/")
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
    setIsLoading(false)
    setIsProcessing(false)
    setStreaming(false)
    setContextFiles([])
    updatePageTitle()
    currentChatModelSettings.reset()
    // textareaRef?.current?.focus()
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
    handleFocusTextArea()
    setDocumentContext(null)
    // Clear uploaded files
    setUploadedFiles([])
    setFileRetrievalEnabled(false)
    setActionInfo(null)
    if (webuiTemporaryChat) {
      setTemporaryChat(true)
    }
  }

  const saveMessageOnSuccess = createSaveMessageOnSuccess(
    temporaryChat,
    setHistoryId as (id: string) => void
  )
  const saveMessageOnError = createSaveMessageOnError(
    temporaryChat,
    history,
    setHistory,
    setHistoryId as (id: string) => void
  )

  const validateBeforeSubmitFn = () => validateBeforeSubmit(selectedModel, t)

  const onSubmit = async ({
    message,
    image,
    isRegenerate = false,
    messages: chatHistory,
    memory,
    controller,
    isContinue,
    docs
  }: {
    message: string
    image: string
    isRegenerate?: boolean
    isContinue?: boolean
    messages?: Message[]
    memory?: ChatHistory
    controller?: AbortController
    docs?: ChatDocuments
  }) => {
    setStreaming(true)
    let signal: AbortSignal
    if (!controller) {
      const newController = new AbortController()
      signal = newController.signal
      setAbortController(newController)
    } else {
      setAbortController(controller)
      signal = controller.signal
    }

    const chatModeParams = {
      selectedModel,
      useOCR,
      selectedSystemPrompt,
      selectedKnowledge,
      currentChatModelSettings,
      setMessages,
      setIsSearchingInternet,
      saveMessageOnSuccess,
      saveMessageOnError,
      setHistory,
      setIsProcessing,
      setStreaming,
      setAbortController,
      historyId,
      setHistoryId,
      fileRetrievalEnabled,
      setActionInfo,
      webSearch
    }

    try {
      if (isContinue) {
        await continueChatMode(
          chatHistory || messages,
          memory || history,
          signal,
          chatModeParams
        )
        return
      }
      // console.log("contextFiles", contextFiles)
      if (contextFiles.length > 0) {
        await documentChatMode(
          message,
          image,
          isRegenerate,
          chatHistory || messages,
          memory || history,
          signal,
          contextFiles,
          chatModeParams
        )
        // setFileRetrievalEnabled(false)
        return
      }

      if (docs?.length > 0 || documentContext?.length > 0) {
        const processingTabs = docs || documentContext || []

        if (docs?.length > 0) {
          setDocumentContext(
            Array.from(new Set([...(documentContext || []), ...docs]))
          )
        }
        await tabChatMode(
          message,
          image,
          processingTabs,
          isRegenerate,
          chatHistory || messages,
          memory || history,
          signal,
          chatModeParams
        )
        return
      }

      if (selectedKnowledge) {
        await ragMode(
          message,
          image,
          isRegenerate,
          chatHistory || messages,
          memory || history,
          signal,
          chatModeParams
        )
      } else {
        if (webSearch) {
          await searchChatMode(
            message,
            image,
            isRegenerate,
            chatHistory || messages,
            memory || history,
            signal,
            chatModeParams
          )
        } else {
          // Include uploaded files info even in normal mode
          const enhancedChatModeParams = {
            ...chatModeParams,
            uploadedFiles: uploadedFiles
          }

          await normalChatMode(
            message,
            image,
            isRegenerate,
            chatHistory || messages,
            memory || history,
            signal,
            enhancedChatModeParams
          )
        }
      }
    } catch (e: any) {
      notification.error({
        message: t("error"),
        description: e?.message || t("somethingWentWrong")
      })
      setIsProcessing(false)
      setStreaming(false)
    }
  }

  const regenerateLastMessage = createRegenerateLastMessage({
    validateBeforeSubmitFn,
    history,
    messages,
    setHistory,
    setMessages,
    historyId,
    removeMessageUsingHistoryIdFn: removeMessageUsingHistoryId,
    onSubmit
  })

  const stopStreamingRequest = createStopStreamingRequest(
    abortController,
    setAbortController
  )

  const editMessage = createEditMessage({
    messages,
    history,
    setMessages,
    setHistory,
    historyId,
    validateBeforeSubmitFn,
    onSubmit
  })

  const createChatBranch = createBranchMessage({
    historyId,
    setHistory,
    setHistoryId,
    setMessages,
    setContext: setContextFiles,
    setSelectedSystemPrompt,
    setSystemPrompt: currentChatModelSettings.setSystemPrompt
  })

  return {
    editMessage,
    messages,
    setMessages,
    onSubmit,
    setStreaming,
    streaming,
    setHistory,
    historyId,
    setHistoryId,
    setIsFirstMessage,
    isLoading,
    setIsLoading,
    isProcessing,
    stopStreamingRequest,
    clearChat,
    selectedModel,
    setSelectedModel,
    chatMode,
    setChatMode,
    speechToTextLanguage,
    setSpeechToTextLanguage,
    regenerateLastMessage,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    setIsSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    textareaRef,
    selectedKnowledge,
    setSelectedKnowledge,
    ttsEnabled,
    temporaryChat,
    setTemporaryChat,
    useOCR,
    setUseOCR,
    defaultInternetSearchOn,
    history,
    uploadedFiles,
    fileRetrievalEnabled,
    setFileRetrievalEnabled: handleSetFileRetrievalEnabled,
    handleFileUpload,
    removeUploadedFile,
    clearUploadedFiles,
    actionInfo,
    setActionInfo,
    setContextFiles,
    createChatBranch,
    webuiTemporaryChat
  }
}
