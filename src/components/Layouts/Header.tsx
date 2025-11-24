import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { CogIcon, Gauge, UserCircle2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLocation, NavLink, useNavigate } from "react-router-dom"
import { SelectedKnowledge } from "../Option/Knowledge/SelectedKnowledge"
import { ModelSelect } from "../Common/ModelSelect"
import { PromptSelect } from "../Common/PromptSelect"
import PromptSearch from "../Common/PromptSearch"
import { useQuery } from "@tanstack/react-query"
import { useServerOnline } from "@/hooks/useServerOnline"
import { fetchChatModels } from "@/services/tldw-server"
import { getTitleById, updateHistory } from "@/db"
import { useStoreChatModelSettings } from "@/store/model"
import { useMessageOption } from "~/hooks/useMessageOption"
import { Avatar, Select, Input, Divider, Dropdown } from "antd"
import QuickIngestModal from "../Common/QuickIngestModal"
import {
  UploadCloud,
  Microscope,
  BookText,
  LayoutGrid,
  StickyNote,
  Layers,
  NotebookPen,
  BookMarked,
  BookOpen,
  ChevronDown
} from "lucide-react"
import { getAllPrompts } from "@/db/dexie/helpers"
import { ProviderIcons } from "../Common/ProviderIcon"
import { NewChat } from "./NewChat"
import { MoreOptions } from "./MoreOptions"
import { browser } from "wxt/browser"
import { CharacterSelect } from "../Common/CharacterSelect"
import { PrimaryToolbar } from "./PrimaryToolbar"
import { useConnectionState } from "@/hooks/useConnectionState"
import { useShortcutConfig, formatShortcut } from "@/hooks/keyboard/useShortcutConfig"
import { ConnectionPhase } from "@/types/connection"
import type { Character } from "@/types/character"
import type { TFunction } from "i18next"
import { Link } from "react-router-dom"
import { hasPromptStudio } from "@/services/prompt-studio"

const classNames = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ")

type Props = {
  setSidebarOpen: (open: boolean) => void
  setOpenModelSettings: (open: boolean) => void
  showSelectors?: boolean
}

type NavigationItem =
  | {
      type: "link"
      to: string
      icon: React.ComponentType<{ className?: string }>
      label: string
    }
  | {
      type: "component"
      key: string
      node: React.ReactNode
    }

type CoreMode =
  | "playground"
  | "review"
  | "media"
  | "knowledge"
  | "notes"
  | "prompts"
  | "promptStudio"
  | "flashcards"
  | "worldBooks"
  | "dictionaries"
  | "characters"
  | "tts"

export const Header: React.FC<Props> = ({
  setOpenModelSettings,
  setSidebarOpen,
  showSelectors = true
}) => {
  const { t, i18n } = useTranslation(["option", "common", "settings"])
  const isRTL = i18n?.dir() === "rtl"

  const [shareModeEnabled] = useStorage("shareMode", false)
  const [hideCurrentChatModelSettings] = useStorage(
    "hideCurrentChatModelSettings",
    false
  )
  const [selectedCharacter] = useStorage<Character | null>(
    "selectedCharacter",
    null
  )
  const {
    selectedModel,
    setSelectedModel,
    clearChat,
    selectedSystemPrompt,
    selectedQuickPrompt,
    setSelectedQuickPrompt,
    setSelectedSystemPrompt,
    messages,
    streaming,
    historyId,
    temporaryChat
  } = useMessageOption()
  const isOnline = useServerOnline()
  const {
    data: models,
    isLoading: isModelsLoading,
    refetch
  } = useQuery({
    queryKey: ["fetchModel"],
    queryFn: () => fetchChatModels({ returnEmpty: true }),
    refetchIntervalInBackground: false,
    staleTime: 1000 * 60 * 1,
    enabled: isOnline
  })

  const promptStudioCapability = useQuery({
    queryKey: ["prompt-studio", "capability-header"],
    queryFn: hasPromptStudio,
    enabled: isOnline,
    staleTime: 60_000
  })

  const { data: prompts, isLoading: isPromptLoading } = useQuery({
    queryKey: ["fetchAllPromptsLayout"],
    queryFn: getAllPrompts
  })

  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false)
  const [chatTitle, setChatTitle] = React.useState("")
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [quickIngestOpen, setQuickIngestOpen] = React.useState(false)

  const {
    phase,
    isConnected,
    knowledgeStatus
  } = useConnectionState()
  const ingestDisabled = phase === ConnectionPhase.UNCONFIGURED
  const { shortcuts: shortcutConfig } = useShortcutConfig()
  const quickIngestBtnRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const handler = () => {
      if (ingestDisabled) {
        return
      }
      setQuickIngestOpen(true)
      requestAnimationFrame(() => {
        quickIngestBtnRef.current?.focus()
      })
    }
    window.addEventListener("tldw:open-quick-ingest", handler)
    return () => {
      window.removeEventListener("tldw:open-quick-ingest", handler)
    }
  }, [ingestDisabled])

  const currentCoreMode: CoreMode = React.useMemo(() => {
    if (pathname.startsWith("/review")) return "media"
    if (pathname.startsWith("/media-multi") || pathname.startsWith("/media"))
      return "media"
    if (pathname.startsWith("/settings/knowledge")) return "knowledge"
    if (pathname.startsWith("/notes")) return "notes"
    if (pathname.startsWith("/prompts") || pathname.startsWith("/settings/prompt"))
      return "prompts"
    if (
      pathname.startsWith("/prompt-studio") ||
      pathname.startsWith("/settings/prompt-studio")
    )
      return "promptStudio"
    if (
      pathname.startsWith("/world-books") ||
      pathname.startsWith("/settings/world-books")
    )
      return "worldBooks"
    if (
      pathname.startsWith("/dictionaries") ||
      pathname.startsWith("/settings/chat-dictionaries")
    )
      return "dictionaries"
    if (
      pathname.startsWith("/characters") ||
      pathname.startsWith("/settings/characters")
    )
      return "characters"
    if (pathname.startsWith("/flashcards")) return "flashcards"
    if (pathname.startsWith("/tts")) return "tts"
    return "playground"
  }, [pathname])

  const openSidebar = React.useCallback(async () => {
    try {
      if (import.meta.env.BROWSER === "firefox") {
        await browser.sidebarAction.open()
      } else {
        // Chromium sidePanel API
        // @ts-ignore
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tabs?.[0]?.id) {
          // @ts-ignore
          await chrome.sidePanel.open({ tabId: tabs[0].id })
        }
      }
    } catch {}
  }, [])

  const handleCoreModeChange = (mode: CoreMode) => {
    switch (mode) {
      case "playground":
        navigate("/")
        break
      case "review":
        navigate("/media-multi")
        break
      case "media":
        navigate("/media")
        break
      case "knowledge":
        navigate("/knowledge")
        break
      case "notes":
        navigate("/notes")
        break
      case "prompts":
        navigate("/prompts")
        break
      case "promptStudio":
        navigate("/prompt-studio")
        break
      case "flashcards":
        navigate("/flashcards")
        break
      case "worldBooks":
        navigate("/world-books")
        break
      case "dictionaries":
        navigate("/dictionaries")
        break
      case "characters":
        navigate("/characters")
        break
      case "tts":
        navigate("/tts")
        break
    }
  }

  // When the More menu opens, focus the first interactive item for a11y
  React.useEffect(() => {
    if (!moreMenuOpen) return
    const id = requestAnimationFrame(() => {
      const menu = document.getElementById('header-more-menu')
      const first = menu?.querySelector<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])')
      first?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [moreMenuOpen])

  React.useEffect(() => {
    (async () => {
      try {
        if (historyId && historyId !== 'temp' && !temporaryChat) {
          const title = await getTitleById(historyId)
          setChatTitle(title || '')
        } else {
          setChatTitle('')
        }
      } catch {}
    })()
  }, [historyId, temporaryChat])

  const saveTitle = async (value: string) => {
    try {
      if (historyId && historyId !== 'temp' && !temporaryChat) {
        await updateHistory(historyId, value.trim() || 'Untitled')
      }
    } catch (e) {
      console.error('Failed to update chat title', e)
    }
  }

  const getPromptInfoById = (id: string) => {
    return prompts?.find((prompt) => prompt.id === id)
  }

  const handlePromptChange = (value?: string) => {
    if (!value) {
      setSelectedSystemPrompt(undefined)
      setSelectedQuickPrompt(undefined)
      return
    }
    const prompt = getPromptInfoById(value)
    if (prompt?.is_system) {
      setSelectedSystemPrompt(prompt.id)
    } else {
      setSelectedSystemPrompt(undefined)
      setSelectedQuickPrompt(prompt!.content)
    }
  }

  const navigationGroups = React.useMemo(
    (): Array<{ title: string; items: NavigationItem[] }> => [
      {
        title: t("option:header.groupWorkspace", "Workspace"),
        items: [
          {
            type: "link" as const,
            to: "/media-multi",
            icon: Microscope,
            label: t("option:header.review", "Review")
          },
          {
            type: "link" as const,
            to: "/flashcards",
            icon: Layers,
            label: t("option:header.flashcards", "Flashcards")
          },
          {
            type: "link" as const,
            to: "/evaluations",
            icon: Microscope,
            label: t("option:header.evaluations", "Evaluations")
          },
          {
            type: "link" as const,
            to: "/tts",
            icon: Gauge,
            label: t("option:tts.playground", "TTS Playground")
          },
          {
            type: "link" as const,
            to: "/notes",
            icon: StickyNote,
            label: t("option:header.notes", "Notes")
          }
        ]
      },
      {
        title: t("option:header.groupKnowledge", "Knowledge"),
        items: [
          {
            type: "component" as const,
            key: "selected-knowledge",
            node: <SelectedKnowledge />
          },
          {
            type: "link" as const,
            to: "/media",
            icon: BookText,
            label: t("option:header.media", "Media")
          },
          {
            type: "link" as const,
            to: "/media-multi",
            icon: LayoutGrid,
            label: t("option:header.libraryView", "Multi-Item Review")
          }
        ]
      },
      {
        title: t("option:header.groupSettings", "Settings shortcuts"),
        items: [
          {
            type: "link" as const,
            to: "/settings",
            icon: CogIcon,
            label: t("settings")
          },
          {
            type: "link" as const,
            to: "/settings/prompt",
            icon: NotebookPen,
            label: t("settings:managePrompts.title")
          },
          {
            type: "link" as const,
            to: "/settings/world-books",
            icon: BookOpen,
            label: t("settings:manageKnowledge.worldBooks", "World Books")
          },
          {
            type: "link" as const,
            to: "/settings/chat-dictionaries",
            icon: BookMarked,
            label: t("settings:manageKnowledge.chatDictionaries", "Chat dictionaries")
          },
          {
            type: "link" as const,
            to: "/settings/characters",
            icon: UserCircle2,
            label: t("settings:charactersNav", "Characters")
          }
        ]
      }
    ],
    [t]
  )

  // Persist the shortcuts collapse state so the header doesn't reset
  const [shortcutsExpanded, setShortcutsExpanded] = useStorage(
    "headerShortcutsExpanded",
    false
  )
  const shortcutsToggleRef = React.useRef<HTMLButtonElement>(null)
  const shortcutsContainerRef = React.useRef<HTMLDivElement>(null)
  const shortcutsSectionId = "header-shortcuts-section"

  type StatusKind = "unknown" | "ok" | "fail"

  const coreStatus: StatusKind =
    phase === ConnectionPhase.SEARCHING
      ? "unknown"
      : isConnected && phase === ConnectionPhase.CONNECTED
        ? "ok"
        : phase === ConnectionPhase.ERROR || phase === ConnectionPhase.UNCONFIGURED
          ? "fail"
          : "unknown"

  const ragStatus: StatusKind =
    knowledgeStatus === "ready" || knowledgeStatus === "indexing"
      ? "ok"
      : knowledgeStatus === "offline"
        ? "fail"
        : "unknown"

  const statusLabelForCore = (status: StatusKind): string => {
    if (status === "ok") {
      return t("settings:healthSummary.coreOnline", "Server: Online")
    }
    if (status === "fail") {
      return t("settings:healthSummary.coreOffline", "Server: Offline")
    }
    return t("settings:healthSummary.coreChecking", "Server: Checking…")
  }

  const statusLabelForRag = (status: StatusKind): string => {
    if (status === "ok") {
      return t("settings:healthSummary.ragReady", "Knowledge: Ready")
    }
    if (status === "fail") {
      return t("settings:healthSummary.ragOffline", "Knowledge: Offline")
    }
    return t("settings:healthSummary.ragChecking", "Knowledge: Checking…")
  }

  const StatusDot = ({ status }: { status: StatusKind }) => (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${
        status === "ok"
          ? "bg-green-500"
          : status === "fail"
            ? "bg-red-500"
            : "bg-gray-400"
      }`}
    />
  )

  const isChatRoute = React.useMemo(
    () => currentCoreMode === "playground",
    [currentCoreMode]
  )

  // Manage focus for accessibility when expanding/collapsing
  React.useEffect(() => {
    if (shortcutsExpanded) {
      // Wait for the shortcuts container to mount, then focus the first
      // interactive element so keyboard users can continue naturally
      requestAnimationFrame(() => {
        const container = shortcutsContainerRef.current
        if (!container) return
        const firstFocusable = container.querySelector<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      })
    } else {
      // If focus is currently inside the shortcuts container, return it to the toggle
      const container = shortcutsContainerRef.current
      const active = document.activeElement
      if (container && active && container.contains(active)) {
        shortcutsToggleRef.current?.focus()
      }
    }
  }, [shortcutsExpanded])

  return (
    <header
      data-istemporary-chat={temporaryChat}
      data-ischat-route={isChatRoute}
      className="sticky top-0 z-30 flex w-full flex-col gap-3 border-b bg-gray-50/95 p-3 backdrop-blur dark:border-gray-600 dark:bg-[#171717]/95 data-[istemporary-chat='true']:bg-purple-900 data-[istemporary-chat='true']:dark:bg-purple-900 data-[ischat-route='true']:bg-white/95 data-[ischat-route='true']:dark:bg-[#111111]/95">
      {/*
        Top band: place the details bar directly below the PrimaryToolbar (New Chat)
        on all breakpoints to keep the most-used actions grouped together.
      */}
      <div className="flex w-full flex-col gap-3">
        <PrimaryToolbar
          onToggleSidebar={() => setSidebarOpen(true)}
          showBack={pathname !== "/"}
          isRTL={isRTL}>
          <div className="flex items-center gap-3 min-w-0">
            <NewChat clearChat={clearChat} />
            <button
              type="button"
              onClick={() => navigate("/settings/tldw")}
              className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
            >
              <CogIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {t("option:header.serverSettings", "Server settings")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  window.open(
                    "https://github.com/rmusser01/tldw_browser_assistant",
                    "_blank",
                    "noopener"
                  )
                } catch {}
              }}
              className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
            >
              <span className="hidden sm:inline">
                {t("option:githubRepository", "GitHub Repository")}
              </span>
            </button>
            {!temporaryChat && historyId && historyId !== "temp" && (
              <div className="hidden min-w-[160px] max-w-[280px] lg:block">
                {isEditingTitle ? (
                  <Input
                    size="small"
                    autoFocus
                    value={chatTitle}
                    onChange={(e) => setChatTitle(e.target.value)}
                    onPressEnter={async () => {
                      setIsEditingTitle(false)
                      await saveTitle(chatTitle)
                    }}
                    onBlur={async () => {
                      setIsEditingTitle(false)
                      await saveTitle(chatTitle)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="truncate text-left text-sm text-gray-700 hover:underline dark:text-gray-200"
                    title={chatTitle || "Untitled"}
                  >
                    {chatTitle || t("option:header.untitledChat", "Untitled")}
                  </button>
                )}
              </div>
            )}
            {/* Status chips for current selections */}
            <div className="hidden md:flex items-center gap-2">
              {selectedCharacter?.name && (
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 shadow-sm dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-100">
                  {selectedCharacter?.avatar_url ? (
                    <img
                      src={selectedCharacter.avatar_url}
                      className="h-4 w-4 rounded-full"
                    />
                  ) : (
                    <UserCircle2 className="h-4 w-4" />
                  )}
                  <span className="max-w-[140px] truncate">
                    {selectedCharacter.name}
                  </span>
                </span>
              )}
              {selectedModel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
                  {t("option:header.modelLabel", "Model")}:
                  <span className="max-w-[140px] truncate">
                    {(() => {
                      const m = models?.find((m) => m.model === selectedModel)
                      return m?.nickname || m?.model || selectedModel
                    })()}
                  </span>
                </span>
              )}
              {(selectedSystemPrompt || selectedQuickPrompt) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
                  {t("option:header.promptLabel", "Prompt")}:
                  <span className="max-w-[140px] truncate">
                    {selectedSystemPrompt
                      ? (getPromptInfoById(selectedSystemPrompt)?.title || t("option:header.systemPrompt", "System prompt"))
                      : t("option:header.customPrompt", "Custom")}
                  </span>
                </span>
              )}
            </div>
          </div>
        </PrimaryToolbar>

        {showSelectors && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1 min-w-[220px]">
              {(() => {
                const id = "header-model-label"
                return (
                  <span
                    id={id}
                    className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {t("option:header.modelLabel", "Model")}
                  </span>
                )
              })()}
              <div className="hidden lg:block">
                <Select
                  className="min-w-[220px] max-w-[320px]"
                  placeholder={t("common:selectAModel")}
                  aria-label={t("common:selectAModel") as string}
                  aria-labelledby="header-model-label"
                  value={selectedModel}
                  onChange={(value) => {
                    setSelectedModel(value)
                    localStorage.setItem("selectedModel", value)
                  }}
                  filterOption={(input, option) => {
                    // @ts-ignore
                    const haystack = option?.label?.props?.["data-title"] as string | undefined
                    return haystack?.toLowerCase().includes(input.toLowerCase()) ?? false
                  }}
                  showSearch
                  loading={isModelsLoading}
                  options={models?.map((model) => ({
                    label: (
                      <span
                        key={model.model}
                        data-title={model.name}
                        className="flex items-center gap-2">
                        {model?.avatar ? (
                          <Avatar src={model.avatar} alt={model.name} size="small" />
                        ) : (
                          <ProviderIcons provider={model?.provider} className="h-4 w-4" />
                        )}
                        <span className="truncate">
                          {model?.nickname || model.model}
                        </span>
                      </span>
                    ),
                    value: model.model
                  }))}
                  size="large"
                />
              </div>
              <div className="lg:hidden">
                <ModelSelect />
              </div>
            </div>

            <div className="hidden min-w-[240px] flex-col gap-1 lg:flex">
              {(() => {
                const id = "header-prompt-label"
                return (
                  <span
                    id={id}
                    className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {t("option:header.promptLabel", "Prompt")}
                  </span>
                )
              })()}
              <PromptSearch
                inputId="header-prompt-search"
                ariaLabel={t("option:selectAPrompt", "Select a Prompt") as string}
                ariaLabelledby="header-prompt-label"
                onInsertMessage={(content) => {
                  setSelectedSystemPrompt(undefined)
                  setSelectedQuickPrompt(content)
                }}
                onInsertSystem={(content) => {
                  setSelectedSystemPrompt(undefined)
                  const { setSystemPrompt } =
                    useStoreChatModelSettings.getState?.() || ({ setSystemPrompt: undefined } as any)
                  setSystemPrompt?.(content)
                }}
              />
            </div>

            <div className="w-full min-w-[180px] lg:hidden">
              <PromptSelect
                selectedSystemPrompt={selectedSystemPrompt}
                setSelectedSystemPrompt={setSelectedSystemPrompt}
                setSelectedQuickPrompt={setSelectedQuickPrompt}
              />
            </div>

            <CharacterSelect className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100" />
          </div>
        )}
      </div>

      {showSelectors && <Divider className="hidden lg:block" plain />}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <button
              type="button"
              onClick={() => navigate("/settings/health")}
              className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-xs transition hover:border-gray-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
              title={t(
                "settings:healthSummary.coreAria",
                "Server status — click for diagnostics"
              ) as string}
              aria-label={
                statusLabelForCore(coreStatus) +
                ". " +
                t(
                  "settings:healthSummary.diagnosticsTooltip",
                  "Open detailed diagnostics to troubleshoot or inspect health checks."
                )
              }>
              <StatusDot status={coreStatus} />
              <span>{statusLabelForCore(coreStatus)}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings/health")}
              className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-xs transition hover:border-gray-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
              title={t(
                "settings:healthSummary.ragAria",
                "Knowledge status — click for diagnostics"
              ) as string}
              aria-label={
                statusLabelForRag(ragStatus) +
                ". " +
                t(
                  "settings:healthSummary.diagnosticsTooltip",
                  "Open detailed diagnostics to troubleshoot or inspect health checks."
                )
              }>
              <StatusDot status={ragStatus} />
              <span>{statusLabelForRag(ragStatus)}</span>
            </button>
            <Link
              to="/settings/health"
              className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              {t("settings:healthSummary.diagnostics", "Diagnostics")}
            </Link>
          </div>

          {!isChatRoute && (
            <>
              <button
                type="button"
                onClick={() => setOpenModelSettings(true)}
                className="flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm text-gray-600 transition hover:border-gray-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f] sm:w-auto"
              >
                <Gauge className="h-4 w-4" aria-hidden="true" />
                <span>{t("option:header.modelSettings", "Model settings")}</span>
              </button>

              <button
                type="button"
                ref={quickIngestBtnRef}
                onClick={() => setQuickIngestOpen(true)}
                disabled={ingestDisabled}
                title={
                  ingestDisabled
                    ? t("option:header.connectToIngest", "Connect to your server to ingest.")
                    : t("option:header.quickIngestHelp", "Upload URLs/files with analysis and advanced options.")
                }
                className={classNames(
                  "flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:w-auto",
                  ingestDisabled
                    ? "cursor-not-allowed text-gray-400 dark:text-gray-600"
                    : "text-gray-600 hover:border-gray-300 hover:bg-white dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
                )}
                aria-disabled={ingestDisabled}
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                <span>{t("option:header.quickIngest", "Quick ingest")}</span>
              </button>

              {messages.length > 0 && !streaming && (
                <div className="flex items-center gap-1">
                  <MoreOptions
                    shareModeEnabled={shareModeEnabled}
                    historyId={historyId}
                    messages={messages}
                  />
                  <span className="sr-only">{t("option:header.moreActions", "More actions")}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => { void openSidebar() }}
                className="flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm text-gray-600 transition hover:border-gray-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f] sm:w-auto"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                <span>{t("option:header.openSidebar", "Open sidebar")}</span>
              </button>
            </>
          )}

          {isChatRoute && (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "modelSettings",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Gauge className="h-4 w-4" aria-hidden="true" />
                        <span>{t("option:header.modelSettings", "Model settings")}</span>
                      </span>
                    ),
                    onClick: () => setOpenModelSettings(true)
                  },
                  {
                    key: "quickIngest",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <UploadCloud className="h-4 w-4" aria-hidden="true" />
                        <span>{t("option:header.quickIngest", "Quick ingest")}</span>
                      </span>
                    ),
                    onClick: () => setQuickIngestOpen(true)
                  },
                  {
                    key: "diagnostics",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <Microscope className="h-4 w-4" aria-hidden="true" />
                        <span>{t("settings:healthSummary.diagnostics", "Diagnostics")}</span>
                      </span>
                    ),
                    onClick: () => navigate("/settings/health")
                  },
                  {
                    key: "openSidebar",
                    label: (
                      <span className="inline-flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                        <span>{t("option:header.openSidebar", "Open sidebar")}</span>
                      </span>
                    ),
                    onClick: () => { void openSidebar() }
                  }
                ]
              }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:bg-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-[#1f1f1f] sm:w-auto"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                <span>{t("option:header.toolsMenu", "Chat tools")}</span>
              </button>
            </Dropdown>
          )}
        </div>

          <div className="flex flex-col gap-2 lg:flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("option:header.modesLabel", "Modes")}
              </span>
            <div
              className="flex flex-wrap gap-1"
              role="tablist"
              aria-label={t("option:header.modesAriaLabel", "Application modes")}
            >
              {(() => {
                const primaryModes: Array<{
                  key: CoreMode
                  label: string
                  shortcut?: import("@/hooks/keyboard/useKeyboardShortcuts").KeyboardShortcut
                }> = [
                  {
                    key: "playground",
                    label: t("option:header.modePlayground", "Chat"),
                    shortcut: shortcutConfig.modePlayground
                  },
                  {
                    key: "review",
                    label: t("option:header.modeReview", "Review"),
                    shortcut: shortcutConfig.modeReview
                  },
                  {
                    key: "media",
                    label: t("option:header.modeMedia", "Media"),
                    shortcut: shortcutConfig.modeMedia
                  },
                  {
                    key: "knowledge",
                    label: t("option:header.modeKnowledge", "Knowledge"),
                    shortcut: shortcutConfig.modeKnowledge
                  },
                  {
                    key: "notes",
                    label: t("option:header.modeNotes", "Notes"),
                    shortcut: shortcutConfig.modeNotes
                  }
                ]
                const secondaryModes: Array<{
                  key: CoreMode
                  label: string
                  shortcut?: import("@/hooks/keyboard/useKeyboardShortcuts").KeyboardShortcut
                }> = [
                  {
                    key: "prompts",
                    label: t("option:header.modePromptsPlayground", "Prompts Playground"),
                    shortcut: shortcutConfig.modePrompts
                  },
                  {
                    key: "promptStudio",
                    label: t("option:header.modePromptStudio", "Prompt Studio"),
                    shortcut: undefined
                  },
                  {
                    key: "flashcards",
                    label: t("option:header.modeFlashcards", "Flashcards"),
                    shortcut: shortcutConfig.modeFlashcards
                  },
                  {
                    key: "worldBooks",
                    label: t("option:header.modeWorldBooks", "World Books"),
                    shortcut: shortcutConfig.modeWorldBooks
                  },
                  {
                    key: "dictionaries",
                    label: t("option:header.modeDictionaries", "Chat dictionaries"),
                    shortcut: shortcutConfig.modeDictionaries
                  },
                  {
                    key: "characters",
                    label: t("option:header.modeCharacters", "Characters"),
                    shortcut: shortcutConfig.modeCharacters
                  }
                ]
                const renderModeButton = (mode: typeof primaryModes[0]) => {
                  const promptStudioUnavailable = mode.key === "promptStudio" && promptStudioCapability.data === false
                  const isSelected = currentCoreMode === mode.key
                  return (
                    <button
                      key={mode.key}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        if (promptStudioUnavailable) return
                        handleCoreModeChange(mode.key)
                      }}
                      disabled={promptStudioUnavailable}
                      aria-disabled={promptStudioUnavailable}
                      title={
                        mode.shortcut
                          ? t("option:header.modeShortcutHint", "{{shortcut}} to switch", {
                              shortcut: formatShortcut(mode.shortcut)
                            }) || undefined
                          : undefined
                      }
                      className={classNames(
                        "rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
                        isSelected
                          ? "bg-amber-500 text-gray-900 shadow-sm dark:bg-amber-400 dark:text-gray-900"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-[#262626] dark:text-gray-200 dark:hover:bg-[#333333]",
                        promptStudioUnavailable ? "opacity-60 cursor-not-allowed" : ""
                      )}
                    >
                      {mode.label}
                    </button>
                  )
                }
                const isSecondaryActive = secondaryModes.some(m => m.key === currentCoreMode)
                return (
                  <>
                    {primaryModes.map(renderModeButton)}
                    <Dropdown
                      menu={{
                        items: secondaryModes.map((mode) => ({
                          key: mode.key,
                          label: mode.label,
                          disabled: mode.key === "promptStudio" && promptStudioCapability.data === false
                        })),
                        onClick: ({ key }) => handleCoreModeChange(key as CoreMode)
                      }}
                    >
                      <button
                        type="button"
                        className={classNames(
                          "rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
                          isSecondaryActive
                            ? "bg-amber-500 text-gray-900 shadow-sm dark:bg-amber-400 dark:text-gray-900"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-[#262626] dark:text-gray-200 dark:hover:bg-[#333333]"
                        )}
                      >
                        {isSecondaryActive
                          ? secondaryModes.find(m => m.key === currentCoreMode)?.label
                          : t("option:header.moreTools", "More...")}
                      </button>
                    </Dropdown>
                  </>
                )
              })()}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
            aria-expanded={shortcutsExpanded}
            aria-controls={shortcutsSectionId}
            ref={shortcutsToggleRef}
            title={t("option:header.shortcutsKeyHint", "Press ? to toggle shortcuts")}
            className="inline-flex items-center self-start rounded-md border border-transparent px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 transition hover:border-gray-300 hover:bg-white dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]">
            <ChevronDown
              className={classNames(
                "mr-1 h-4 w-4 transition-transform",
                shortcutsExpanded ? "rotate-180" : ""
              )}
            />
            {shortcutsExpanded
              ? t("option:header.hideShortcuts", "Hide shortcuts")
              : t("option:header.showShortcuts", "Show shortcuts")}
            {!shortcutsExpanded && (
              <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                {t("option:header.shortcutsKeyHintInline", "(Press ?)")}
              </span>
            )}
          </button>
          {shortcutsExpanded && (
            <div
              id={shortcutsSectionId}
              ref={shortcutsContainerRef}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  setShortcutsExpanded(false)
                  // focus is returned by effect, but ensure it in next frame
                  requestAnimationFrame(() => {
                    shortcutsToggleRef.current?.focus()
                  })
                }
              }}
              className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
              role="region"
              aria-label={t("option:header.showShortcuts", "Shortcuts")}
            >
              <div className="flex flex-col gap-4 lg:flex-1">
                {navigationGroups.map((group, index) => {
                  const groupId = `header-shortcuts-group-${index}`
                  return (
                    <section
                      key={group.title}
                      className="flex flex-col gap-2"
                      aria-labelledby={groupId}>
                      <h3
                        id={groupId}
                        className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {group.title}
                      </h3>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {group.items.map((item) => {
                        if (item.type === "component") {
                          return (
                            <div key={item.key} className="w-full sm:w-auto">
                              {item.node}
                            </div>
                          )
                        }
                        const Icon = item.icon
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              classNames(
                                "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:w-auto",
                                isActive
                                  ? "border-gray-300 bg-white text-gray-900 dark:border-gray-500 dark:bg-[#1f1f1f] dark:text-white"
                                  : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-white dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
                              )
                            }>
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                    </section>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <QuickIngestModal
        open={quickIngestOpen}
        onClose={() => {
          setQuickIngestOpen(false)
          requestAnimationFrame(() => quickIngestBtnRef.current?.focus())
        }}
      />
    </header>
  )
}
