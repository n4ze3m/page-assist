import { cleanUrl } from "~/libs/clean-url"
import {
  defaultEmbeddingModelForRag,
  getOllamaURL,
  geWebSearchFollowUpPrompt,
  promptForRag
} from "~/services/ollama"
import { type ChatHistory, type Message } from "~/store/option"
import { addFileToSession, generateID, getSessionFiles } from "@/db/dexie/helpers"
import { generateHistory } from "@/utils/generate-history"
import { pageAssistModel } from "@/models"
import { humanMessageFormatter } from "@/utils/human-message"
import {
  isReasoningEnded,
  isReasoningStarted,
  mergeReasoningContent,
  removeReasoning
} from "@/libs/reasoning"
import { getModelNicknameByID } from "@/db/dexie/nickname"
import { formatDocs } from "@/chain/chat-with-x"
import { getAllDefaultModelSettings } from "@/services/model-settings"
import { getNoOfRetrievedDocs } from "@/services/app"
import { pageAssistEmbeddingModel } from "@/models/embedding"
import { UploadedFile } from "@/db/dexie/types"
import { getSystemPromptForWeb, isQueryHaveWebsite } from "@/web/web"
import { PAMemoryVectorStore } from "@/libs/PAMemoryVectorStore"
import { getMaxContextSize } from "@/services/kb"

export const documentChatMode = async (
  message: string,
  image: string,
  isRegenerate: boolean,
  messages: Message[],
  history: ChatHistory,
  signal: AbortSignal,
  uploadedFiles: UploadedFile[],
  {
    selectedModel,
    useOCR,
    currentChatModelSettings,
    setMessages,
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
  }: {
    selectedModel: string
    useOCR: boolean
    currentChatModelSettings: any
    setMessages: (
      messages: Message[] | ((prev: Message[]) => Message[])
    ) => void
    saveMessageOnSuccess: (data: any) => Promise<string | null>
    saveMessageOnError: (data: any) => Promise<string | null>
    setHistory: (history: ChatHistory) => void
    setIsProcessing: (value: boolean) => void
    setStreaming: (value: boolean) => void
    setAbortController: (controller: AbortController | null) => void
    historyId: string | null
    setHistoryId: (id: string) => void
    fileRetrievalEnabled: boolean
    setActionInfo: (actionInfo: string | null) => void
    webSearch: boolean
  }
) => {
  const url = await getOllamaURL()
  const userDefaultModelSettings = await getAllDefaultModelSettings()

  let sessionFiles: UploadedFile[] = []
  const currentFiles: UploadedFile[] = uploadedFiles

  if (historyId) {
    sessionFiles = await getSessionFiles(historyId)
  }

  const newFiles = currentFiles.filter(
    (f) => !sessionFiles.some((sf) => sf.id === f.id)
  )

  const allFiles = [...sessionFiles, ...newFiles]
  const ollama = await pageAssistModel({
    model: selectedModel!,
    baseUrl: cleanUrl(url)
  })

  let newMessage: Message[] = []
  let generateMessageId = generateID()
  const modelInfo = await getModelNicknameByID(selectedModel)

  if (!isRegenerate) {
    newMessage = [
      ...messages,
      {
        isBot: false,
        name: "You",
        message,
        sources: [],
        images: image ? [image] : [],
        documents: newFiles.map((f) => ({
          type: "file",
          filename: f.filename,
          fileSize: f.size
        }))
      },
      {
        isBot: true,
        name: selectedModel,
        message: "▋",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  } else {
    newMessage = [
      ...messages,
      {
        isBot: true,
        name: selectedModel,
        message: "▋",
        sources: [],
        id: generateMessageId,
        modelImage: modelInfo?.model_avatar,
        modelName: modelInfo?.model_name || selectedModel
      }
    ]
  }
  setMessages(newMessage)
  let fullText = ""
  let contentToSave = ""

  const embeddingModel = await defaultEmbeddingModelForRag()
  const ollamaUrl = await getOllamaURL()
  const ollamaEmbedding = await pageAssistEmbeddingModel({
    model: embeddingModel || selectedModel,
    baseUrl: cleanUrl(ollamaUrl),
    keepAlive:
      currentChatModelSettings?.keepAlive ?? userDefaultModelSettings?.keepAlive
  })

  let timetaken = 0
  try {
    let query = message
    const { ragPrompt: systemPrompt, ragQuestionPrompt: questionPrompt } =
      await promptForRag()

    let context: string = ""
    let source: any[] = []
    const docSize = await getNoOfRetrievedDocs()

    if (webSearch) {
      //  setIsSearchingInternet(true)
      setActionInfo("webSearch")

      let query = message

      // if (newMessage.length > 2) {
      let questionPrompt = await geWebSearchFollowUpPrompt()
      const lastTenMessages = newMessage.slice(-10)
      lastTenMessages.pop()
      const chat_history = lastTenMessages
        .map((message) => {
          return `${message.isBot ? "Assistant: " : "Human: "}${message.message}`
        })
        .join("\n")
      const promptForQuestion = questionPrompt
        .replaceAll("{chat_history}", chat_history)
        .replaceAll("{question}", message)
      const questionModel = await pageAssistModel({
        model: selectedModel!,
        baseUrl: cleanUrl(url)
      })

      let questionMessage = await humanMessageFormatter({
        content: [
          {
            text: promptForQuestion,
            type: "text"
          }
        ],
        model: selectedModel,
        useOCR: useOCR
      })

      if (image.length > 0) {
        questionMessage = await humanMessageFormatter({
          content: [
            {
              text: promptForQuestion,
              type: "text"
            },
            {
              image_url: image,
              type: "image_url"
            }
          ],
          model: selectedModel,
          useOCR: useOCR
        })
      }
      try {
        const isWebQuery = await isQueryHaveWebsite(query)
        if (!isWebQuery) {
          const response = await questionModel.invoke([questionMessage])
          query = response?.content?.toString() || message
          query = removeReasoning(query)
        }
      } catch (error) {
        console.error("Error in questionModel.invoke:", error)
      }

      const { prompt, source: webSource } = await getSystemPromptForWeb(
        query,
        true
      )

      context += prompt + "\n"
      source = [
        ...source,
        ...webSource.map((source) => {
          return {
            ...source,
            type: "url"
          }
        })
      ]

      setActionInfo(null)
    }
    if (newMessage.length > 2) {
      const lastTenMessages = newMessage.slice(-10)
      lastTenMessages.pop()
      const chat_history = lastTenMessages
        .map((message) => {
          return `${message.isBot ? "Assistant: " : "Human: "}${message.message}`
        })
        .join("\n")
      const promptForQuestion = questionPrompt
        .replaceAll("{chat_history}", chat_history)
        .replaceAll("{question}", message)
      const questionOllama = await pageAssistModel({
        model: selectedModel!,
        baseUrl: cleanUrl(url)
      })
      const response = await questionOllama.invoke(promptForQuestion)
      query = response.content.toString()
      query = removeReasoning(query)
    }
    if (uploadedFiles.length > 0) {
      if (fileRetrievalEnabled) {
        if (!embeddingModel?.length) {
          throw new Error("No embedding model selected")
        }
        setActionInfo("embeddingGen")
        const documents = allFiles.map((file) => ({
          pageContent: file.content,
          metadata: {
            source: file.filename,
            type: file.type,
            size: file.size,
            uploadedAt: file.uploadedAt
          }
        }))

        const textSplitter = await getPageAssistTextSplitter()
        const chunks = await textSplitter.splitDocuments(documents)

        const vectorstore = await PAMemoryVectorStore.fromDocuments(
          chunks,
          ollamaEmbedding
        )
        setActionInfo("semanticSearch")
        const docs = await vectorstore.similaritySearch(query, docSize)
        context += formatDocs(docs)
        source = [
          ...source,
          ...docs.map((doc) => {
            return {
              ...doc,
              name: doc?.metadata?.source || "untitled",
              type: doc?.metadata?.type || "unknown",
              mode: "rag",
              url: ""
            }
          })
        ]

        setActionInfo(null)
      } else {
        const maxContextSize = await getMaxContextSize()

        context += allFiles
          .map((f) => `File: ${f.filename}\nContent: ${f.content}\n---\n`)
          .join("")
          .substring(0, maxContextSize)
        source = [
          ...source,
          ...allFiles.map((file) => ({
            pageContent: file.content.substring(0, 200) + "...",
            metadata: {
              source: file.filename,
              type: file.type,
              mode: "rag"
            },
            name: file.filename,
            type: file.type,
            mode: "rag",
            url: ""
          }))
        ]
      }
    } else {
      context += "No documents uploaded for this conversation."
    }

    let humanMessage = await humanMessageFormatter({
      content: [
        {
          text: systemPrompt
            .replace("{context}", context)
            .replace("{question}", message),
          type: "text"
        }
      ],
      model: selectedModel,
      useOCR: useOCR
    })

    const applicationChatHistory = generateHistory(history, selectedModel)

    let generationInfo: any | undefined = undefined

    const chunks = await ollama.stream(
      [...applicationChatHistory, humanMessage],
      {
        signal: signal,
        callbacks: [
          {
            handleLLMEnd(output: any): any {
              try {
                generationInfo = output?.generations?.[0][0]?.generationInfo
              } catch (e) {
                console.error("handleLLMEnd error", e)
              }
            }
          }
        ]
      }
    )
    let count = 0
    let reasoningStartTime: Date | undefined = undefined
    let reasoningEndTime: Date | undefined = undefined
    let apiReasoning = false

    for await (const chunk of chunks) {
      if (chunk?.additional_kwargs?.reasoning_content) {
        const reasoningContent = mergeReasoningContent(
          fullText,
          chunk?.additional_kwargs?.reasoning_content || ""
        )
        contentToSave = reasoningContent
        fullText = reasoningContent
        apiReasoning = true
      } else {
        if (apiReasoning) {
          fullText += "</think>"
          contentToSave += "</think>"
          apiReasoning = false
        }
      }

      contentToSave += chunk?.content
      fullText += chunk?.content
      if (count === 0) {
        setIsProcessing(true)
      }
      if (isReasoningStarted(fullText) && !reasoningStartTime) {
        reasoningStartTime = new Date()
      }

      if (
        reasoningStartTime &&
        !reasoningEndTime &&
        isReasoningEnded(fullText)
      ) {
        reasoningEndTime = new Date()
        const reasoningTime =
          reasoningEndTime.getTime() - reasoningStartTime.getTime()
        timetaken = reasoningTime
      }
      setMessages((prev) => {
        return prev.map((message) => {
          if (message.id === generateMessageId) {
            return {
              ...message,
              message: fullText + "▋",
              reasoning_time_taken: timetaken
            }
          }
          return message
        })
      })
      count++
    }
    // update the message with the full text
    setMessages((prev) => {
      return prev.map((message) => {
        if (message.id === generateMessageId) {
          return {
            ...message,
            message: fullText,
            sources: source,
            generationInfo,
            reasoning_time_taken: timetaken
          }
        }
        return message
      })
    })

    setHistory([
      ...history,
      {
        role: "user",
        content: message,
        image
      },
      {
        role: "assistant",
        content: fullText
      }
    ])

    const chatHistoryId = await saveMessageOnSuccess({
      historyId,
      setHistoryId,
      isRegenerate,
      selectedModel: selectedModel,
      message,
      image,
      fullText,
      source,
      generationInfo,
      reasoning_time_taken: timetaken,
      documents: uploadedFiles.map((f) => ({
        type: "file",
        filename: f.filename,
        fileSize: f.size,
        processed: f.processed
      }))
    })

    if (chatHistoryId) {
      for (const file of newFiles) {
        await addFileToSession(chatHistoryId, file)
      }
    }

    setIsProcessing(false)
    setStreaming(false)
  } catch (e) {
    console.log(e)
    const errorSave = await saveMessageOnError({
      e,
      botMessage: fullText,
      history,
      historyId,
      image,
      selectedModel,
      setHistory,
      setHistoryId,
      userMessage: message,
      isRegenerating: isRegenerate
    })

    if (!errorSave) {
      throw e // Re-throw to be handled by the calling function
    }
    setIsProcessing(false)
    setStreaming(false)
  } finally {
    setAbortController(null)
  }
}
