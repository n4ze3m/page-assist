import React from "react"
import { cleanUrl } from "@/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  geWebSearchFollowUpPrompt,
  getOllamaURL,
  promptForRag,
  systemPromptForNonRag
} from "@/services/ai/ollama"
import { useStoreMessageOption, type Message } from "@/store/option"
import { useStoreMessage } from "@/store"
import { getContentFromCurrentTab } from "@/libs/get-html"
import { memoryEmbedding } from "@/utils/memory-embeddings"
import { ChatHistory } from "@/store/option"
import {
  deleteChatForEdit,
  generateID,
  getPromptById,
  removeMessageUsingHistoryId,
  updateMessageByIndex
} from "@/db/dexie/helpers"
import { notification } from "antd"
import { useTranslation } from "react-i18next"
import { usePageAssist } from "@/context"
import { formatDocs } from "@/chain/chat-with-x"
import { useStorage } from "@plasmohq/storage/hook"
import { useStoreChatModelSettings } from "@/store/model"
import { getAllDefaultModelSettings } from "@/services/ai/model-settings"
import { getSystemPromptForWeb, isQueryHaveWebsite } from "@/web/web"
import { pageAssistModel } from "@/models"
import { getPrompt } from "@/services/browser/application"
import { humanMessageFormatter } from "@/utils/human-message"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { PAMemoryVectorStore } from "@/libs/PAMemoryVectorStore"
import { getScreenshotFromCurrentTab } from "@/libs/get-screenshot"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { systemPromptFormatter } from "@/utils/system-message"
import { createBranchMessage } from "./handlers/messageHandlers"
import {
  createSaveMessageOnError,
  createSaveMessageOnSuccess
} from "./utils/messageHelpers"
import { updatePageTitle } from "@/utils/update-page-title"
import { getNoOfRetrievedDocs } from "@/services/features/app"

import { normalChatMode } from "./chat-modes/normalChatMode"
import { searchChatMode } from "./chat-modes/searchChatMode"
import { visionChatMode } from "./chat-modes/visionChatMode"
import { presetChatMode } from "./chat-modes/presetChatMode"
import { ragMode } from "./chat-modes/ragMode"
import { documentChatMode } from "./chat-modes/documentChatMode"
import { tabChatMode } from "./chat-modes/tabChatMode"
import { chatWithWebsiteMode } from "./chat-modes/chatWithWebsiteMode"
import { continueChatMode } from "./chat-modes/continueChatMode"

export const useMessage = () => {
  const {
    controller: abortController,
    setController: setAbortController,
    messages,
    setMessages,
    embeddingController,
    setEmbeddingController
  } = usePageAssist()
  const { t } = useTranslation("option")
  const [selectedModel, setSelectedModel] = useStorage("selectedModel")
  const currentChatModelSettings = useStoreChatModelSettings()
  const {
    setIsSearchingInternet,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    temporaryChat,
    setTemporaryChat,
    uploadedFiles,
    documentContext,
    fileRetrievalEnabled,
    setActionInfo
  } = useStoreMessageOption()
  const [defaultInternetSearchOn] = useStorage("defaultInternetSearchOn", false)

  const [defaultChatWithWebsite] = useStorage("defaultChatWithWebsite", false)

  const [chatWithWebsiteEmbedding] = useStorage(
    "chatWithWebsiteEmbedding",
    false
  )
  const [maxWebsiteContext] = useStorage("maxWebsiteContext", 4028)

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
    setIsEmbedding,
    isEmbedding,
    currentURL,
    setCurrentURL,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    useOCR,
    setUseOCR
  } = useStoreMessage()
  const [sidepanelTemporaryChat] = useStorage("sidepanelTemporaryChat", false)
  const [speechToTextLanguage, setSpeechToTextLanguage] = useStorage(
    "speechToTextLanguage",
    "en-US"
  )

  const [keepTrackOfEmbedding, setKeepTrackOfEmbedding] = React.useState<{
    [key: string]: PAMemoryVectorStore
  }>({})

  const clearChat = () => {
    stopStreamingRequest()
    setMessages([])
    setHistory([])
    setHistoryId(null)
    setIsFirstMessage(true)
    setIsLoading(false)
    setIsProcessing(false)
    setStreaming(false)
    updatePageTitle()
    currentChatModelSettings.reset()
    if (defaultInternetSearchOn) {
      setWebSearch(true)
    }
    if (defaultChatWithWebsite) {
      setChatMode("rag")
    }
    if (sidepanelTemporaryChat) {
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

  const onSubmit = async ({
    message,
    image,
    images,
    isRegenerate,
    controller,
    memory,
    messages: chatHistory,
    messageType,
    chatType
  }: {
    message: string
    image: string
    images?: string[]
    isRegenerate?: boolean
    messages?: Message[]
    memory?: ChatHistory
    controller?: AbortController
    messageType?: string
    chatType?: string
  }) => {
    let signal: AbortSignal
    if (!controller) {
      const newController = new AbortController()
      signal = newController.signal
      setAbortController(newController)
    } else {
      setAbortController(controller)
      signal = controller.signal
    }

    const commonParams = {
      selectedModel,
      useOCR,
      setMessages,
      saveMessageOnSuccess,
      saveMessageOnError,
      setHistory,
      setIsProcessing,
      setStreaming,
      setAbortController,
      historyId,
      setHistoryId
    }

    if (chatType === "youtube") {
      setChatMode("rag")
      const newEmbeddingController = new AbortController()
      let embeddingSignal = newEmbeddingController.signal
      setEmbeddingController(newEmbeddingController)
      // Assume youtube handled in ragMode or separate, for now use ragMode with youtube docs
      await ragMode(
        message,
        image,
        isRegenerate || false,
        chatHistory || messages,
        memory || history,
        signal,
        {
          ...commonParams,
          selectedKnowledge: { id: "youtube" },
          currentChatModelSettings
        }
      )
      return
    }

    if (messageType) {
      await presetChatMode(
        message,
        image,
        isRegenerate || false,
        chatHistory || messages,
        memory || history,
        signal,
        messageType,
        commonParams
      )
    } else {
      if (chatMode === "normal") {
        if (webSearch) {
          await searchChatMode(
            message,
            image,
            isRegenerate || false,
            chatHistory || messages,
            memory || history,
            signal,
            { ...commonParams, setIsSearchingInternet }
          )
        } else {
          await normalChatMode(
            message,
            image,
            isRegenerate || false,
            chatHistory || messages,
            memory || history,
            signal,
            {
              ...commonParams,
              selectedSystemPrompt: selectedSystemPrompt || "",
              currentChatModelSettings
            }
          )
        }
      } else if (chatMode === "vision") {
        await visionChatMode(
          message,
          image,
          isRegenerate || false,
          chatHistory || messages,
          memory || history,
          signal,
          { ...commonParams }
        )
      } else if (chatMode === "rag") {
        const newEmbeddingController = new AbortController()
        let embeddingSignal = newEmbeddingController.signal
        setEmbeddingController(newEmbeddingController)
        await chatWithWebsiteMode(
          message,
          image,
          isRegenerate || false,
          chatHistory || messages,
          memory || history,
          signal,
          embeddingSignal,
          {
            ...commonParams,
            setEmbeddingController,
            setIsEmbedding,
            chatWithWebsiteEmbedding,
            maxWebsiteContext,
            currentURL,
            setCurrentURL,
            keepTrackOfEmbedding,
            setKeepTrackOfEmbedding,
            currentChatModelSettings,
            temporaryChat
          }
        )
      } else if (chatMode === "document") {
        await documentChatMode(
          message,
          image,
          isRegenerate || false,
          chatHistory || messages,
          memory || history,
          signal,
          uploadedFiles,
          {
            ...commonParams,
            currentChatModelSettings,
            fileRetrievalEnabled,
            setActionInfo,
            webSearch
          }
        )
      } else if (chatMode === "tab") {
        await tabChatMode(
          message,
          image,
          documentContext || [],
          isRegenerate || false,
          chatHistory || messages,
          memory || history,
          signal,
          {
            ...commonParams,
            selectedSystemPrompt: selectedSystemPrompt || "",
            currentChatModelSettings
          }
        )
      }
    }
  }

  const stopStreamingRequest = () => {
    if (isEmbedding) {
      if (embeddingController) {
        embeddingController.abort()
        setEmbeddingController(null)
      }
    }
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }

  const editMessage = async (
    index: number,
    message: string,
    isHuman: boolean
  ) => {
    let newMessages = messages
    let newHistory = history

    if (isHuman) {
      const currentHumanMessage = newMessages[index]
      newMessages[index].message = message
      const previousMessages = newMessages.slice(0, index + 1)
      setMessages(previousMessages)
      const previousHistory = newHistory.slice(0, index)
      setHistory(previousHistory)
      await updateMessageByIndex(historyId, index, message)
      await deleteChatForEdit(historyId, index)
      const abortController = new AbortController()
      await onSubmit({
        message: message,
        image: currentHumanMessage.images[0] || "",
        isRegenerate: true,
        messages: previousMessages,
        memory: previousHistory,
        controller: abortController
      })
    } else {
      newMessages[index].message = message
      setMessages(newMessages)
      newHistory[index].content = message
      setHistory(newHistory)
      await updateMessageByIndex(historyId, index, message)
    }
  }

  const regenerateLastMessage = async () => {
    if (history.length < 2 || messages.length === 0) {
      return
    }
    const lastMessage = history[history.length - 2]
    const newHistory = history.slice(0, -2)
    const newMessages = messages.slice(0, -1)
    setHistory(newHistory)
    setMessages(newMessages)
    await removeMessageUsingHistoryId(historyId)
    if (lastMessage.role === "user") {
      const newController = new AbortController()
      await onSubmit({
        message: lastMessage.content,
        image: lastMessage.image ?? "",
        images: lastMessage.images ?? [],
        isRegenerate: true,
        messages: newMessages,
        memory: newHistory,
        controller: newController,
        messageType: lastMessage.messageType
      })
    }
  }
  const createChatBranch = createBranchMessage({
    historyId,
    setHistory,
    setHistoryId,
    setMessages,
    setSelectedSystemPrompt,
    setSystemPrompt: currentChatModelSettings.setSystemPrompt
  })
  return {
    messages,
    setMessages,
    editMessage,
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
    isEmbedding,
    regenerateLastMessage,
    webSearch,
    setWebSearch,
    isSearchingInternet,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    speechToTextLanguage,
    setSpeechToTextLanguage,
    useOCR,
    setUseOCR,
    defaultInternetSearchOn,
    defaultChatWithWebsite,
    history,
    createChatBranch,
    temporaryChat,
    setTemporaryChat,
    sidepanelTemporaryChat
  }
}
