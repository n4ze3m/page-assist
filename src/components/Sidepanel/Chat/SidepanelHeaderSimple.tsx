import logoImage from "~/assets/icon.png"
import { useMessage } from "~/hooks/useMessage"
import { Link } from "react-router-dom"
import { Tooltip, Drawer } from "antd"
import { CogIcon, PlusSquare, XIcon, PencilIcon, Trash2, SearchIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import React from "react"
import { IconButton } from "@/components/Common/IconButton"
import { Sidebar } from "@/components/Option/Sidebar"
import { useStoreChatModelSettings } from "@/store/model"
import { StatusDot } from "./StatusDot"
import { promptInput } from "@/components/Common/prompt-input"
import { useConfirmDanger } from "@/components/Common/confirm-danger"
import { updateHistory, deleteByHistoryId, getTitleById } from "@/db/dexie/helpers"
import { useMutation, useQueryClient } from "@tanstack/react-query"

type SidepanelHeaderSimpleProps =
  | {
      sidebarOpen: boolean
      setSidebarOpen: (open: boolean) => void
      searchQuery?: string
      setSearchQuery?: (query: string) => void
    }
  | {
      sidebarOpen?: undefined
      setSidebarOpen?: undefined
      searchQuery?: string
      setSearchQuery?: (query: string) => void
    }

/**
 * Simplified sidepanel header with minimal controls:
 * - Status dot (connection indicator)
 * - Logo + title
 * - New chat button
 * - Settings link
 *
 * All other controls moved to ControlRow in the composer area.
 */
export const SidepanelHeaderSimple = ({
  sidebarOpen: propSidebarOpen,
  setSidebarOpen: propSetSidebarOpen,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery
}: SidepanelHeaderSimpleProps = {}) => {
  const {
    clearChat,
    messages,
    streaming,
    setMessages,
    setHistory,
    setHistoryId,
    setSelectedModel,
    setSelectedSystemPrompt,
    historyId,
    history,
    temporaryChat
  } = useMessage()
  const { t } = useTranslation(["sidepanel", "common", "option"])
  const [localSidebarOpen, setLocalSidebarOpen] = React.useState(false)
  const [localSearchQuery, setLocalSearchQuery] = React.useState("")
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const { setSystemPrompt } = useStoreChatModelSettings()

  // Use prop or local state for search
  const searchQuery = propSearchQuery ?? localSearchQuery
  const setSearchQuery = propSetSearchQuery ?? setLocalSearchQuery

  const isControlled = typeof propSidebarOpen === "boolean"
  const sidebarOpen = isControlled ? (propSidebarOpen as boolean) : localSidebarOpen
  const handleSidebarOpenChange = (open: boolean) => {
    if (!isControlled) {
      setLocalSidebarOpen(open)
    } else if (propSetSidebarOpen) {
      propSetSidebarOpen(open)
    }
  }

  const confirmDanger = useConfirmDanger()
  const queryClient = useQueryClient()

  const { mutate: editHistory } = useMutation({
    mutationKey: ["editHistory"],
    mutationFn: async (data: { id: string; title: string }) => {
      return await updateHistory(data.id, data.title)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
    }
  })

  const { mutate: deleteHistory } = useMutation({
    mutationKey: ["deleteHistory"],
    mutationFn: deleteByHistoryId,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
      clearChat()
    }
  })

  const handleRenameChat = async () => {
    if (!historyId) return
    const currentTitle = await getTitleById(historyId)
    const newTitle = await promptInput({
      title: t("option:editHistoryTitle", { defaultValue: "Rename chat" }),
      defaultValue: currentTitle || "",
      okText: t("common:save", { defaultValue: "Save" }),
      cancelText: t("common:cancel", { defaultValue: "Cancel" })
    })
    if (newTitle && newTitle !== currentTitle) {
      editHistory({ id: historyId, title: newTitle })
    }
  }

  const handleDeleteChat = async () => {
    if (!historyId) return
    const ok = await confirmDanger({
      title: t("common:confirmTitle", { defaultValue: "Please confirm" }),
      content: t("option:deleteHistoryConfirmation", {
        defaultValue: "Are you sure you want to delete this chat?"
      }),
      okText: t("common:delete", { defaultValue: "Delete" }),
      cancelText: t("common:cancel", { defaultValue: "Cancel" })
    })
    if (!ok) return
    deleteHistory(historyId)
  }

  const handleToggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded)
    if (!isSearchExpanded) {
      // Focus the input when expanding
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      // Clear search when collapsing
      setSearchQuery("")
    }
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    searchInputRef.current?.focus()
  }

  // Handle Ctrl/Cmd+F keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && messages.length > 0) {
        e.preventDefault()
        setIsSearchExpanded(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      if (e.key === "Escape" && isSearchExpanded) {
        setIsSearchExpanded(false)
        setSearchQuery("")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [messages.length, isSearchExpanded, setSearchQuery])

  return (
    <div
      data-istemporary-chat={temporaryChat}
      className="px-3 justify-between bg-white dark:bg-[#171717] border-b border-gray-300 dark:border-gray-700 py-2 items-center absolute top-0 z-10 flex h-12 w-full data-[istemporary-chat='true']:bg-blue-50 data-[istemporary-chat='true']:dark:bg-blue-950/30"
    >
      {/* Left: Status dot + Logo + Title */}
      <div className="flex items-center gap-2">
        <StatusDot />
        <div className="flex items-center dark:text-white">
          <img
            className="h-5 w-auto"
            src={logoImage}
            alt={t("common:pageAssist")}
          />
          <span className="ml-1.5 text-sm font-medium">
            {t("common:pageAssist")}
          </span>
        </div>
      </div>

      {/* Right: Search + New chat + Rename + Delete + Settings */}
      <div className="flex items-center gap-1">
        {/* Search - only show when there are messages */}
        {messages.length > 0 && (
          <>
            {isSearchExpanded ? (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1">
                <SearchIcon className="size-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("common:search", { defaultValue: "Search..." }) as string}
                  className="bg-transparent border-none outline-none text-sm w-24 sm:w-32 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                  aria-label={t("sidepanel:header.searchChatAria", "Search in chat") as string}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label={t("common:clearSearch", { defaultValue: "Clear search" }) as string}
                  >
                    <XIcon className="size-3 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
                <button
                  onClick={handleToggleSearch}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label={t("common:closeSearch", { defaultValue: "Close search" }) as string}
                >
                  <XIcon className="size-3.5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            ) : (
              <Tooltip title={t("common:search", { defaultValue: "Search" }) + " (Ctrl+F)"}>
                <IconButton
                  ariaLabel={t("sidepanel:header.searchChatAria", "Search in chat") as string}
                  onClick={handleToggleSearch}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
                >
                  <SearchIcon className="size-4 text-gray-500 dark:text-gray-400" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}

        {/* New Chat - only show when there are messages and not streaming */}
        {messages.length > 0 && !streaming && !isSearchExpanded && (
          <Tooltip title={t("option:newChat")}>
            <IconButton
              ariaLabel={t("sidepanel:header.newChatAria") as string}
              title={t("option:newChat") as string}
              onClick={() => clearChat()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
            >
              <PlusSquare className="size-4 text-gray-500 dark:text-gray-400" />
            </IconButton>
          </Tooltip>
        )}

        {/* Rename - only show when there's a saved chat (historyId exists) and search is not expanded */}
        {historyId && !streaming && !isSearchExpanded && (
          <Tooltip title={t("common:edit", { defaultValue: "Rename" })}>
            <IconButton
              ariaLabel={t("sidepanel:header.renameChatAria", "Rename chat") as string}
              onClick={handleRenameChat}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
            >
              <PencilIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </IconButton>
          </Tooltip>
        )}

        {/* Delete - only show when there's a saved chat (historyId exists) and search is not expanded */}
        {historyId && !streaming && !isSearchExpanded && (
          <Tooltip title={t("common:delete", { defaultValue: "Delete" })}>
            <IconButton
              ariaLabel={t("sidepanel:header.deleteChatAria", "Delete chat") as string}
              onClick={handleDeleteChat}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
            >
              <Trash2 className="size-4 text-gray-500 dark:text-gray-400" />
            </IconButton>
          </Tooltip>
        )}

        {/* Settings */}
        <Tooltip title={t("sidepanel:header.settingsShortLabel", "Settings")}>
          <Link
            to="/settings"
            aria-label={t("sidepanel:header.openSettingsAria") as string}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700"
          >
            <CogIcon
              className="size-4 text-gray-500 dark:text-gray-400"
              aria-hidden="true"
            />
          </Link>
        </Tooltip>
      </div>

      {/* History Drawer - kept for programmatic access but button removed from header */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span>{t("tooltip.history")}</span>
            <button onClick={() => handleSidebarOpenChange(false)}>
              <XIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        }
        placement="left"
        closeIcon={null}
        onClose={() => handleSidebarOpenChange(false)}
        open={sidebarOpen}
      >
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => handleSidebarOpenChange(false)}
          setMessages={setMessages}
          setHistory={setHistory}
          setHistoryId={setHistoryId}
          setSelectedModel={setSelectedModel}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          clearChat={clearChat}
          historyId={historyId}
          setSystemPrompt={setSystemPrompt}
          temporaryChat={temporaryChat}
          history={history}
        />
      </Drawer>
    </div>
  )
}
