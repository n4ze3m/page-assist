import { Popover, Switch, Tooltip, Upload } from "antd"
import {
  Search,
  MoreHorizontal,
  Eye,
  Globe,
  Image as ImageIcon,
  UploadCloud,
  LayoutGrid,
  BookText,
  StickyNote,
  Layers
} from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { ModelSelect } from "@/components/Common/ModelSelect"
import { PromptSelect } from "@/components/Common/PromptSelect"
import { SaveStatusIcon } from "./SaveStatusIcon"

interface ControlRowProps {
  // Prompt selection
  selectedSystemPrompt: string | undefined
  setSelectedSystemPrompt: (promptId: string | undefined) => void
  setSelectedQuickPrompt: (prompt: string | undefined) => void
  // Save state
  temporaryChat: boolean
  serverChatId?: string | null
  setTemporaryChat: (value: boolean) => void
  // Toggles
  webSearch: boolean
  setWebSearch: (value: boolean) => void
  chatMode: "normal" | "rag" | "vision"
  setChatMode: (mode: "normal" | "rag" | "vision") => void
  // Image upload
  onImageUpload: (file: File) => void
  // RAG toggle
  onToggleRag: () => void
  // Connection state
  isConnected: boolean
}

export const ControlRow: React.FC<ControlRowProps> = ({
  selectedSystemPrompt,
  setSelectedSystemPrompt,
  setSelectedQuickPrompt,
  temporaryChat,
  serverChatId,
  setTemporaryChat,
  webSearch,
  setWebSearch,
  chatMode,
  setChatMode,
  onImageUpload,
  onToggleRag,
  isConnected
}) => {
  const { t } = useTranslation(["sidepanel", "playground", "common"])
  const [moreOpen, setMoreOpen] = React.useState(false)
  const moreBtnRef = React.useRef<HTMLButtonElement>(null)

  const openOptionsPage = React.useCallback((hash: string) => {
    try {
      if (
        typeof browser === "undefined" ||
        !browser.runtime ||
        !browser.tabs
      ) {
        window.open(`/options.html${hash}`, "_blank")
        return
      }
      const url = browser.runtime.getURL(`/options.html${hash}`)
      browser.tabs.create({ url })
    } catch {
      window.open(`/options.html${hash}`, "_blank")
    }
  }, [])

  const handleSaveClick = () => {
    // Toggle between ephemeral and local save
    setTemporaryChat(!temporaryChat)
  }

  const moreMenuContent = (
    <div
      className="flex flex-col gap-2 p-2 min-w-[200px]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault()
          setMoreOpen(false)
          requestAnimationFrame(() => moreBtnRef.current?.focus())
        }
      }}
    >
      {/* Save Mode */}
      <div className="text-xs text-gray-500 font-medium">
        {t("sidepanel:controlRow.saveMode", "Save Mode")}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          {t("sidepanel:controlRow.ephemeral", "Ephemeral")}
        </span>
        <Switch
          size="small"
          checked={temporaryChat}
          onChange={(checked) => setTemporaryChat(checked)}
        />
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* Web Search */}
      <div className="text-xs text-gray-500 font-medium">
        {t("sidepanel:controlRow.searchSection", "Search & Vision")}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm flex items-center gap-1.5">
          <Globe className="size-3.5" />
          {t("sidepanel:controlRow.webSearch", "Web Search")}
        </span>
        <Switch
          size="small"
          checked={webSearch}
          onChange={(checked) => setWebSearch(checked)}
        />
      </div>

      {/* Vision */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm flex items-center gap-1.5">
          <Eye className="size-3.5" />
          {t("sidepanel:controlRow.vision", "Vision")}
        </span>
        <Switch
          size="small"
          checked={chatMode === "vision"}
          onChange={(checked) => setChatMode(checked ? "vision" : "normal")}
        />
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* Upload Image */}
      <Upload
        accept="image/*"
        showUploadList={false}
        beforeUpload={(file) => {
          onImageUpload(file)
          setMoreOpen(false)
          return false
        }}
      >
        <button className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ImageIcon className="size-4 text-gray-500" />
          {t("sidepanel:controlRow.uploadImage", "Upload Image")}
        </button>
      </Upload>

      {/* Quick Ingest */}
      <button
        disabled={!isConnected}
        onClick={() => {
          try {
            browser.runtime.sendMessage({ type: "tldw:ingest", mode: "store" })
          } catch {}
          setMoreOpen(false)
        }}
        className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <UploadCloud className="size-4 text-gray-500" />
        {t("sidepanel:controlRow.quickIngest", "Quick Ingest Page")}
      </button>

      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

      {/* Modes - open full UI */}
      <div className="text-xs text-gray-500 font-medium">
        {t("sidepanel:controlRow.openInFullUI", "Open in Full UI")}
      </div>
      <button
        onClick={() => openOptionsPage("#/")}
        className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <LayoutGrid className="size-4 text-gray-500" />
        {t("sidepanel:controlRow.modeChat", "Chat")}
      </button>
      <button
        onClick={() => openOptionsPage("#/media")}
        className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <BookText className="size-4 text-gray-500" />
        {t("sidepanel:controlRow.modeMedia", "Media")}
      </button>
      <button
        onClick={() => openOptionsPage("#/notes")}
        className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <StickyNote className="size-4 text-gray-500" />
        {t("sidepanel:controlRow.modeNotes", "Notes")}
      </button>
      <button
        onClick={() => openOptionsPage("#/flashcards")}
        className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Layers className="size-4 text-gray-500" />
        {t("sidepanel:controlRow.modeFlashcards", "Flashcards")}
      </button>
    </div>
  )

  return (
    <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a]">
      {/* Left side: Prompt & Model selectors */}
      <div className="flex items-center gap-1">
        <PromptSelect
          selectedSystemPrompt={selectedSystemPrompt}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          setSelectedQuickPrompt={setSelectedQuickPrompt}
          iconClassName="size-4"
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        />
        <ModelSelect iconClassName="size-4" />
      </div>

      {/* Right side: RAG, Save, More */}
      <div className="flex items-center gap-0.5">
        {/* RAG Search Toggle */}
        <Tooltip title={t("sidepanel:controlRow.ragSearch", "RAG Search")}>
          <button
            type="button"
            onClick={onToggleRag}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
            aria-label={t("sidepanel:controlRow.ragSearch", "RAG Search")}
          >
            <Search className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </Tooltip>

        {/* Save Status Icon */}
        <SaveStatusIcon
          temporaryChat={temporaryChat}
          serverChatId={serverChatId}
          onClick={handleSaveClick}
        />

        {/* More Tools Menu */}
        <Popover
          trigger="click"
          open={moreOpen}
          onOpenChange={setMoreOpen}
          content={moreMenuContent}
          placement="topRight"
        >
          <Tooltip title={t("sidepanel:controlRow.moreTools", "More tools")}>
            <button
              ref={moreBtnRef}
              type="button"
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
              aria-label={t("sidepanel:controlRow.moreTools", "More tools")}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </Tooltip>
        </Popover>
      </div>
    </div>
  )
}
