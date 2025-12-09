import {
  formatToChatHistory,
  formatToMessage,
  getRecentChatFromCopilot,
  generateID
} from "@/db/dexie/helpers"
import useBackgroundMessage from "@/hooks/useBackgroundMessage"
import { useMigration } from "@/hooks/useMigration"
import { useSmartScroll } from "@/hooks/useSmartScroll"
import {
  useChatShortcuts,
  useSidebarShortcuts,
  useChatModeShortcuts
} from "@/hooks/keyboard/useKeyboardShortcuts"
import { useConnectionActions } from "@/hooks/useConnectionState"
import { useAntdNotification } from "@/hooks/useAntdNotification"
import { copilotResumeLastChat } from "@/services/app"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { ChevronDown } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { SidePanelBody } from "~/components/Sidepanel/Chat/body"
import { SidepanelForm } from "~/components/Sidepanel/Chat/form"
import { SidepanelHeaderSimple } from "~/components/Sidepanel/Chat/SidepanelHeaderSimple"
import NoteQuickSaveModal from "~/components/Sidepanel/Notes/NoteQuickSaveModal"
import { useMessage } from "~/hooks/useMessage"
import type { ChatHistory, Message as ChatMessage } from "~/store/option"

const deriveNoteTitle = (
  content: string,
  pageTitle?: string,
  url?: string
): string => {
  const cleanedTitle = (pageTitle || "").trim()
  if (cleanedTitle) return cleanedTitle
  const normalized = (content || "").trim().replace(/\s+/g, " ")
  if (normalized) {
    const words = normalized.split(" ").slice(0, 8).join(" ")
    return words + (normalized.length > words.length ? "..." : "")
  }
  if (url) {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }
  return ""
}

const SidepanelChat = () => {
  const drop = React.useRef<HTMLDivElement>(null)
  const [dropedFile, setDropedFile] = React.useState<File | undefined>()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { t } = useTranslation(["playground", "sidepanel", "common"])
  // Per-tab storage (Chrome side panel) or per-window/global (Firefox sidebar).
  // tabId: undefined = not resolved yet, null = resolved but unavailable.
  const [tabId, setTabId] = React.useState<number | null | undefined>(undefined)
  const storageRef = React.useRef(
    new Storage({
      area: "local"
    })
  )
  const [dropState, setDropState] = React.useState<
    "idle" | "dragging" | "error"
  >("idle")
  const [dropFeedback, setDropFeedback] = React.useState<
    { type: "info" | "error"; message: string } | null
  >(null)
  const feedbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const showDropFeedback = React.useCallback(
    (feedback: { type: "info" | "error"; message: string }) => {
      setDropFeedback(feedback)
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
      feedbackTimerRef.current = setTimeout(() => {
        setDropFeedback(null)
        feedbackTimerRef.current = null
      }, 4000)
    },
    []
  )
  useMigration()
  const {
    streaming,
    onSubmit,
    messages,
    history,
    setHistory,
    historyId,
    setHistoryId,
    setMessages,
    selectedModel,
    defaultChatWithWebsite,
    chatMode,
    setChatMode,
    setTemporaryChat,
    sidepanelTemporaryChat,
    clearChat
  } = useMessage()
  const { containerRef, isAutoScrollToBottom, autoScrollToBottom } =
    useSmartScroll(messages, streaming, 100)
  const { checkOnce } = useConnectionActions()
  const notification = useAntdNotification()
  const [noteModalOpen, setNoteModalOpen] = React.useState(false)
  const [noteDraftContent, setNoteDraftContent] = React.useState("")
  const [noteDraftTitle, setNoteDraftTitle] = React.useState("")
  const [noteSuggestedTitle, setNoteSuggestedTitle] = React.useState("")
  const [noteSourceUrl, setNoteSourceUrl] = React.useState<string | undefined>()
  const [noteSaving, setNoteSaving] = React.useState(false)
  const [noteError, setNoteError] = React.useState<string | null>(null)

  const resetNoteModal = React.useCallback(() => {
    setNoteModalOpen(false)
    setNoteDraftContent("")
    setNoteDraftTitle("")
    setNoteSuggestedTitle("")
    setNoteSourceUrl(undefined)
    setNoteSaving(false)
    setNoteError(null)
  }, [])

  const handleNoteSave = React.useCallback(async () => {
    const content = noteDraftContent.trim()
    const title = (noteDraftTitle || noteSuggestedTitle).trim()
    if (!content) {
      setNoteError("Nothing to save")
      return
    }
    if (!title) {
      setNoteError("Add a title to save this note")
      return
    }
    setNoteError(null)
    setNoteSaving(true)
    try {
      await tldwClient.createNote(content, {
        title,
        metadata: {
          source_url: noteSourceUrl,
          origin: "context-menu"
        }
      })
      notification.success({
        message: t("sidepanel:notification.savedToNotes", "Saved to Notes")
      })
      resetNoteModal()
    } catch (e: any) {
      const msg = e?.message || "Failed to save note"
      setNoteError(msg)
      notification.error({ message: msg })
    } finally {
      setNoteSaving(false)
    }
  }, [
    noteDraftContent,
    noteDraftTitle,
    noteSuggestedTitle,
    noteSourceUrl,
    notification,
    resetNoteModal,
    t
  ])

  const handleNoteTitleChange = (value: string) => {
    setNoteDraftTitle(value)
    if (noteError) setNoteError(null)
  }

  const handleNoteContentChange = (value: string) => {
    setNoteDraftContent(value)
    if (noteError) setNoteError(null)
  }

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const toggleChatMode = () => {
    setChatMode(chatMode === "rag" ? "normal" : "rag")
  }

  useChatShortcuts(clearChat, true)
  useSidebarShortcuts(toggleSidebar, true)
  useChatModeShortcuts(toggleChatMode, true)

  const [chatBackgroundImage] = useStorage({
    key: "chatBackgroundImage",
    instance: new Storage({
      area: "local"
    })
  })
  const bgMsg = useBackgroundMessage()
  const lastBgMsgRef = React.useRef<typeof bgMsg | null>(null)

  const getStorageKey = (id: number | null | undefined) =>
    id != null ? `sidepanelChatState:tab-${id}` : "sidepanelChatState"

  type SidepanelChatSnapshot = {
    history: ChatHistory
    messages: ChatMessage[]
    chatMode: typeof chatMode
    historyId: string | null
  }

  const restoreSidepanelState = async () => {
    // Wait until we've attempted to resolve tab id so we don't
    // accidentally attach a tab-specific snapshot to the wrong key.
    if (tabId === undefined) {
      return
    }

    const storage = storageRef.current
    try {
      // Prefer a tab-specific snapshot; fall back to the legacy/global key
      // so existing users don't lose their last session.
      const keysToTry: string[] = [getStorageKey(tabId)]
      if (tabId != null) {
        keysToTry.push(getStorageKey(null))
      }

      let snapshot: SidepanelChatSnapshot | null = null
      for (const key of keysToTry) {
        // eslint-disable-next-line no-await-in-loop
        const candidate = (await storage.get(key)) as SidepanelChatSnapshot | null
        if (candidate && Array.isArray(candidate.messages)) {
          snapshot = candidate
          break
        }
      }

      if (snapshot && Array.isArray(snapshot.messages)) {
        setHistory(snapshot.history || [])
        setMessages(snapshot.messages || [])
        if (snapshot.historyId) {
          setHistoryId(snapshot.historyId)
        }
        if (snapshot.chatMode) {
          setChatMode(snapshot.chatMode)
        }
        return
      }
    } catch {
      // fall through to recent chat resume
    }

    const isEnabled = await copilotResumeLastChat()
    if (!isEnabled) {
      return
    }
    if (messages.length === 0) {
      const recentChat = await getRecentChatFromCopilot()
      if (recentChat) {
        setHistoryId(recentChat.history.id)
        setHistory(formatToChatHistory(recentChat.messages))
        setMessages(formatToMessage(recentChat.messages))
      }
    }
  }

  const persistSidepanelState = React.useCallback(() => {
    const storage = storageRef.current
    const key = getStorageKey(tabId)
    const snapshot: SidepanelChatSnapshot = {
      history,
      messages,
      chatMode,
      historyId
    }
    void storage.set(key, snapshot).catch(() => {
      // ignore persistence errors in sidepanel
    })
  }, [history, messages, chatMode, historyId, tabId])

  React.useEffect(() => {
    void checkOnce()
  }, [checkOnce])

  React.useEffect(() => {
    // Resolve the tab id associated with this sidepanel instance.
    const fetchTabId = async () => {
      try {
        // browser is provided by the extension runtime (see wxt config).
        const resp: any = await browser.runtime.sendMessage({
          type: "tldw:get-tab-id"
        })
        if (resp && typeof resp.tabId === "number") {
          setTabId(resp.tabId)
        } else {
          setTabId(null)
        }
      } catch {
        setTabId(null)
      }
    }
    fetchTabId()
  }, [])

  React.useEffect(() => {
    void restoreSidepanelState()
  }, [tabId])

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      persistSidepanelState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistSidepanelState()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      persistSidepanelState()
    }
  }, [persistSidepanelState])

  React.useEffect(() => {
    if (!drop.current) {
      return
    }
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setDropState("idle")

      const files = Array.from(e.dataTransfer?.files || [])

      const isImage = files.every((file) => file.type.startsWith("image/"))

      if (!isImage) {
        setDropState("error")
        showDropFeedback({
          type: "error",
          message: t(
            "playground:drop.imageOnly",
            "Only images can be dropped here right now."
          )
        })
        return
      }

      const newFiles = Array.from(e.dataTransfer?.files || []).slice(0, 1)
      if (newFiles.length > 0) {
        setDropedFile(newFiles[0])
        showDropFeedback({
          type: "info",
          message: `${newFiles[0]?.name || "Image"} ready to send`
        })
      }
    }

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("dragging")
      showDropFeedback({
        type: "info",
        message: t(
          "playground:drop.imageHint",
          "Drop an image to include it in your message"
        )
      })
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropState("idle")
    }

    drop.current.addEventListener("dragover", handleDragOver)
    drop.current.addEventListener("drop", handleDrop)
    drop.current.addEventListener("dragenter", handleDragEnter)
    drop.current.addEventListener("dragleave", handleDragLeave)

    return () => {
      if (drop.current) {
        drop.current.removeEventListener("dragover", handleDragOver)
        drop.current.removeEventListener("drop", handleDrop)
        drop.current.removeEventListener("dragenter", handleDragEnter)
        drop.current.removeEventListener("dragleave", handleDragLeave)
      }
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (defaultChatWithWebsite) {
      setChatMode("rag")
    }
    if (sidepanelTemporaryChat) {
      setTemporaryChat(true)
    }
  }, [defaultChatWithWebsite, sidepanelTemporaryChat])

  React.useEffect(() => {
    if (!bgMsg) return
    if (lastBgMsgRef.current === bgMsg) return

    if (bgMsg.type === "save-to-notes") {
      lastBgMsgRef.current = bgMsg
      const selected = (bgMsg.text || bgMsg.payload?.selectionText || "").trim()
      if (!selected) {
        notification.warning({
          message: t(
            "sidepanel:notification.noSelectionForNotes",
            "Select text to save to Notes"
          )
        })
        return
      }
      const sourceUrl = (bgMsg.payload?.pageUrl as string | undefined) || undefined
      const suggestedTitle = deriveNoteTitle(
        selected,
        bgMsg.payload?.pageTitle as string | undefined,
        sourceUrl
      )
      setNoteDraftContent(selected)
      setNoteSuggestedTitle(suggestedTitle)
      setNoteDraftTitle(suggestedTitle)
      setNoteSourceUrl(sourceUrl)
      setNoteSaving(false)
      setNoteError(null)
        setNoteModalOpen(true)
      return
    }

    if (streaming) return

    lastBgMsgRef.current = bgMsg

    if (bgMsg.type === "transcription" || bgMsg.type === "transcription+summary") {
      const transcript = (bgMsg.payload?.transcript || bgMsg.text || "").trim()
      const summaryText = (bgMsg.payload?.summary || "").trim()
      const url = (bgMsg.payload?.url as string | undefined) || ""
      const label =
        bgMsg.type === "transcription+summary"
          ? t("sidepanel:notification.transcriptionSummaryTitle", "Transcription + summary")
          : t("sidepanel:notification.transcriptionTitle", "Transcription")
      const parts: string[] = []
      if (url) {
        parts.push(`${t("sidepanel:notification.sourceLabel", "Source")}: ${url}`)
      }
      if (transcript) {
        parts.push(`${t("sidepanel:notification.transcriptLabel", "Transcript")}:\n${transcript}`)
      }
      if (summaryText) {
        parts.push(`${t("sidepanel:notification.summaryLabel", "Summary")}:\n${summaryText}`)
      }
      const messageBody =
        parts.filter(Boolean).join("\n\n") ||
        t(
          "sidepanel:notification.transcriptionFallback",
          "Transcription completed. Open Media in the Web UI to view it."
        )
      const id = generateID()
      setMessages((prev) => [
        ...prev,
        { isBot: true, name: label, message: messageBody, sources: [], id }
      ])
      setHistory([...history, { role: "assistant", content: messageBody }])
      return
    }

    if (selectedModel) {
      onSubmit({
        message: bgMsg.text,
        messageType: bgMsg.type,
        image: ""
      })
    } else {
      notification.error({
        message: t("formError.noModel")
      })
    }
  }, [
    bgMsg,
    streaming,
    selectedModel,
    onSubmit,
    notification,
    t,
    setMessages,
    setHistory,
    history,
    setNoteDraftContent,
    setNoteSuggestedTitle,
    setNoteDraftTitle,
    setNoteSourceUrl,
    setNoteSaving,
    setNoteError,
    setNoteModalOpen
  ])

  return (
    <div className="flex h-full w-full">
      <main className="relative h-dvh w-full">
        <div className="relative z-20 w-full">
          <SidepanelHeaderSimple
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
        <div
          ref={drop}
          className={`relative flex h-full flex-col items-center ${
            dropState === "dragging" ? "bg-gray-100 dark:bg-gray-800" : ""
          } bg-white dark:bg-[#171717]`}
          style={
            chatBackgroundImage
              ? {
                  backgroundImage: `url(${chatBackgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat"
                }
              : {}
          }>
          {/* Background overlay for opacity effect */}
          {chatBackgroundImage && (
            <div
              className="absolute inset-0 bg-white dark:bg-[#171717]"
              style={{ opacity: 0.9, pointerEvents: "none" }}
            />
          )}

          {dropState === "dragging" && (
            <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
              <div className="rounded-2xl border border-dashed border-white/70 bg-black/70 px-5 py-3 text-center text-sm font-medium text-white shadow-lg backdrop-blur-sm dark:border-white/40">
                {t(
                  "playground:drop.overlayInstruction",
                  "Drop the image to attach it to your next reply"
                )}
              </div>
            </div>
          )}

          {dropFeedback && (
            <div className="pointer-events-none absolute top-20 left-0 right-0 z-30 flex justify-center px-4">
              <div
                role="status"
                aria-live="polite"
                className={`max-w-lg rounded-full px-4 py-2 text-sm shadow-lg backdrop-blur-sm ${
                  dropFeedback.type === "error"
                    ? "bg-red-600 text-white"
                    : "bg-slate-900/80 text-white dark:bg-slate-100/90 dark:text-slate-900"
                }`}
              >
                {dropFeedback.message}
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={t("playground:aria.chatTranscript", "Chat messages")}
            className="custom-scrollbar flex h-full w-full flex-col items-center overflow-x-hidden overflow-y-auto px-5 relative z-10">
            <SidePanelBody scrollParentRef={containerRef} />
          </div>

          <div className="absolute bottom-0 w-full z-10">
            {!isAutoScrollToBottom && (
              <div className="fixed bottom-32 z-20 left-0 right-0 flex justify-center">
                <button
                  onClick={() => autoScrollToBottom()}
                  aria-label={t("playground:composer.scrollToLatest", "Scroll to latest messages")}
                  title={t("playground:composer.scrollToLatest", "Scroll to latest messages") as string}
                  className="bg-gray-50 shadow border border-gray-200 dark:border-none dark:bg-white/20 p-1.5 rounded-full pointer-events-auto hover:bg-gray-100 dark:hover:bg-white/30 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
                  <ChevronDown className="size-4 text-gray-600 dark:text-gray-300" aria-hidden="true" />
                </button>
              </div>
            )}
            <SidepanelForm dropedFile={dropedFile} />
          </div>
        </div>
      </main>
      <NoteQuickSaveModal
        open={noteModalOpen}
        title={noteDraftTitle}
        content={noteDraftContent}
        suggestedTitle={noteSuggestedTitle}
        sourceUrl={noteSourceUrl}
        loading={noteSaving}
        error={noteError}
        onTitleChange={handleNoteTitleChange}
        onContentChange={handleNoteContentChange}
        onCancel={resetNoteModal}
        onSave={handleNoteSave}
        modalTitle={t("sidepanel:notes.saveToNotesTitle", "Save to Notes")}
        saveText={t("common:save", "Save")}
        cancelText={t("common:cancel", "Cancel")}
        titleLabel={t("sidepanel:notes.titleLabel", "Title")}
        contentLabel={t("sidepanel:notes.contentLabel", "Content")}
        titleRequiredText={t("sidepanel:notes.titleRequired", "Title is required to create a note.")}
        helperText={t("sidepanel:notes.helperText", "Review or edit the selected text, then Save or Cancel.")}
        sourceLabel={t("sidepanel:notes.sourceLabel", "Source")}
      />
    </div>
  )
}

export default SidepanelChat
