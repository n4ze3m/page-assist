import logoImage from "~/assets/icon.png"
import { useMessage } from "~/hooks/useMessage"
import { Link } from "react-router-dom"
import {
  Tooltip,
  Drawer,
  notification,
  Popover,
  InputNumber,
  Space,
  Button,
  Dropdown
} from "antd"
import type { MenuProps } from "antd"
import {
  BoxesIcon,
  CogIcon,
  EraserIcon,
  HistoryIcon,
  PlusSquare,
  XIcon,
  MessageSquareShareIcon,
  UploadCloud,
  NotebookPen,
  Gauge,
  LayoutGrid,
  Microscope,
  StickyNote,
  Layers,
  BookText
} from "lucide-react"
import { useTranslation } from "react-i18next"
// import { CurrentChatModelSettings } from "@/components/Common/Settings/CurrentChatModelSettings"
import React from "react"
import { IconButton } from "@/components/Common/IconButton"
import { useStorage } from "@plasmohq/storage/hook"
import { CharacterSelect } from "@/components/Common/CharacterSelect"
import { Sidebar } from "@/components/Option/Sidebar"
// import { BsIncognito } from "react-icons/bs"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"

type SidepanelHeaderProps = {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export const SidepanelHeader = ({ 
  sidebarOpen: propSidebarOpen, 
  setSidebarOpen: propSetSidebarOpen 
}: SidepanelHeaderProps = {}) => {
  const [hideCurrentChatModelSettings] = useStorage(
    "hideCurrentChatModelSettings",
    false
  )

  const {
    clearChat,
    isEmbedding,
    messages,
    streaming,
    selectedSystemPrompt,
    setSelectedSystemPrompt,
    setSelectedQuickPrompt,
    setMessages,
    setHistory,
    setHistoryId,
    setSelectedModel,
    historyId,
    history,
    useOCR,
    temporaryChat,
    setTemporaryChat
  } = useMessage()
  const { t } = useTranslation(["sidepanel", "common", "option", "settings"])
  const [openModelSettings, setOpenModelSettings] = React.useState(false)
  const [localSidebarOpen, setLocalSidebarOpen] = React.useState(false)
  const [webuiBtnSidePanel, setWebuiBtnSidePanel] = useStorage(
    "webuiBtnSidePanel",
    false
  )
  const [ingestTimeoutSec, setIngestTimeoutSec] = React.useState<number>(120)
  const [debugOpen, setDebugOpen] = React.useState<boolean>(false)
  const [moreOpen, setMoreOpen] = React.useState<boolean>(false)
  const moreBtnRef = React.useRef<HTMLButtonElement>(null)
  const [debugLogs, setDebugLogs] = React.useState<Array<{ time: number; kind: string; name?: string; data?: string }>>([])

  React.useEffect(() => {
    const onMsg = (msg: any) => {
      if (msg?.type === 'tldw:stream-debug' && msg?.payload) {
        setDebugLogs((prev) => {
          const next = [...prev, msg.payload]
          if (next.length > 200) next.shift()
          return next
        })
      }
    }
    // @ts-ignore
    browser.runtime.onMessage.addListener(onMsg)
    return () => {
      try { /* @ts-ignore */ browser.runtime.onMessage.removeListener(onMsg) } catch {}
    }
  }, [])

  // Use prop state if provided, otherwise use local state
  const sidebarOpen = propSidebarOpen !== undefined ? propSidebarOpen : localSidebarOpen
  const setSidebarOpen = propSetSidebarOpen || setLocalSidebarOpen

  const openOptionsPage = React.useCallback((hash: string) => {
    try {
      const url = browser.runtime.getURL(`/options.html${hash}`)
      browser.tabs.create({ url })
    } catch {
      window.open(`/options.html${hash}`, '_blank')
    }
  }, [])

  const sendQuickIngest = React.useCallback(
    async (mode: 'store' | 'process') => {
      const timeoutMs = Math.max(1, Math.round(Number(ingestTimeoutSec) || 120)) * 1000
      await browser.runtime.sendMessage({ type: 'tldw:ingest', mode, timeoutMs })
      const btn = (
        <Button
          size="small"
          type="link"
          onClick={() => {
            const url = browser.runtime.getURL("/options.html#/media")
            browser.tabs.create({ url })
          }}>
          {t('sidepanel:header.viewProcessed', 'View Media')}
        </Button>
      )
      if (mode === 'store') {
        notification.success({
          message: t('sidepanel:notification.ingestSent'),
          description: t('sidepanel:notification.ingestSentDesc'),
          btn
        })
      } else {
        notification.success({
          message: t('sidepanel:notification.processedLocal'),
          description: t('sidepanel:notification.processedLocalDesc'),
          btn
        })
      }
    },
    [ingestTimeoutSec, t]
  )

  const [ingestOpen, setIngestOpen] = React.useState(false)
  const ingestBtnRef = React.useRef<HTMLButtonElement>(null)
  const [modeOpen, setModeOpen] = React.useState(false)
  const modeBtnRef = React.useRef<HTMLButtonElement>(null)

  const quickIngestMenu = React.useMemo<MenuProps>(
    () => ({
      onClick: ({ key }) => {
        if (key === 'store' || key === 'process') {
          void (async () => {
            try { await sendQuickIngest(key) } finally {
              setIngestOpen(false)
              // Return focus to the trigger for keyboard users
              requestAnimationFrame(() => ingestBtnRef.current?.focus())
            }
          })()
        }
      },
      items: [
        { key: 'store', label: t('sidepanel:header.saveCurrent') },
        { key: 'process', label: t('sidepanel:header.processLocal') }
      ]
    }),
    [sendQuickIngest, t]
  )

  return (
    <div
      data-istemporary-chat={temporaryChat}
      className=" px-3 justify-between bg-white dark:bg-[#171717] border-b border-gray-300 dark:border-gray-700 py-4 items-center absolute top-0 z-10 flex h-14 w-full data-[istemporary-chat='true']:bg-purple-900 data-[istemporary-chat='true']:dark:bg-purple-900">
      <div className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 flex items-center dark:text-white">
        <img
          className="h-6 w-auto"
          src={logoImage}
          alt={t("common:pageAssist")}
        />
        <span className="ml-1 text-sm ">{t("common:pageAssist")}</span>
      </div>

      <div className="flex items-center space-x-3">
        <Popover
          trigger="click"
          open={modeOpen}
          onOpenChange={(o) => {
            setModeOpen(o)
            if (!o) requestAnimationFrame(() => modeBtnRef.current?.focus())
          }}
          content={
            <Space
              size="small"
              direction="vertical"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault()
                  setModeOpen(false)
                  requestAnimationFrame(() => modeBtnRef.current?.focus())
                }
              }}>
              <div className="text-xs text-gray-500">
                {t("sidepanel:header.modesLabel", "Open modes in Web UI")}
              </div>
              <button
                onClick={() =>
                  openOptionsPage("#/")
                }
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <LayoutGrid className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modePlayground", "Chat")}</span>
              </button>
              <button
                onClick={() => openOptionsPage("#/review")}
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <Microscope className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modeReview", "Review")}</span>
              </button>
              <button
                onClick={() => openOptionsPage("#/media")}
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <BookText className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modeMedia", "Media")}</span>
              </button>
              <button
                onClick={() => openOptionsPage("#/settings/knowledge")}
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <LayoutGrid className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modeKnowledge", "Knowledge")}</span>
              </button>
              <button
                onClick={() => openOptionsPage("#/notes")}
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <StickyNote className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modeNotes", "Notes")}</span>
              </button>
              <button
                onClick={() => openOptionsPage("#/settings/prompt")}
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <NotebookPen className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modePrompts", "Prompts")}</span>
              </button>
              <button
                onClick={() => openOptionsPage("#/flashcards")}
                className="flex items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                <Layers className="size-4 text-gray-500 dark:text-gray-400" />
                <span>{t("sidepanel:header.modeFlashcards", "Flashcards")}</span>
              </button>
            </Space>
          }>
          <Tooltip title={t("sidepanel:header.modesLabel", "Open modes in Web UI")}>
            <button
              ref={modeBtnRef}
              type="button"
              aria-label={t(
                "sidepanel:header.modesLabel",
                "Open modes in Web UI"
              )}
              aria-haspopup="menu"
              aria-expanded={modeOpen}
              aria-controls="sidepanel-modes-menu"
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <LayoutGrid className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </Tooltip>
        </Popover>
        <Dropdown
          menu={quickIngestMenu}
          placement="bottomRight"
          trigger={["click"]}
          open={ingestOpen}
          onOpenChange={(open) => {
            setIngestOpen(open)
            if (!open) requestAnimationFrame(() => ingestBtnRef.current?.focus())
          }}
        >
          <Tooltip title={t('sidepanel:header.ingest')}>
            <button
              type="button"
              aria-label={t('sidepanel:header.ingest')}
              aria-haspopup="menu"
              aria-expanded={ingestOpen}
              aria-controls="quick-ingest-menu"
              ref={ingestBtnRef}
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <UploadCloud className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </Tooltip>
        </Dropdown>
        <Tooltip title={t('settings:managePrompts.title')}>
          <button
            type="button"
            aria-label={t('settings:managePrompts.title')}
            onClick={() => openOptionsPage('#/settings/prompt')}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <NotebookPen className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </Tooltip>
        <Tooltip title={t('sidepanel:header.openModelSettingsAria')}>
          <button
            type="button"
            aria-label={t('sidepanel:header.openModelSettingsAria')}
            onClick={() => openOptionsPage('#/settings/model')}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <Gauge className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </Tooltip>
        {/* Consolidate less-used actions into kebab menu */}
        <Popover
          trigger="click"
          open={moreOpen}
          onOpenChange={(o) => {
            setMoreOpen(o)
            if (!o) requestAnimationFrame(() => moreBtnRef.current?.focus())
          }}
          content={
            <Space
              size="small"
              direction="vertical"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setMoreOpen(false)
                  requestAnimationFrame(() => moreBtnRef.current?.focus())
                }
              }}
            >
              <div className="text-xs text-gray-500">{t('sidepanel:header.timeoutLabel')}</div>
              <InputNumber
                min={1}
                size="small"
                value={ingestTimeoutSec}
                onChange={(v) => setIngestTimeoutSec(Number(v || 120))}
              />
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={() => openOptionsPage('#/settings/world-books')}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                World Books
              </button>
              <button
                onClick={() => openOptionsPage('#/settings/chat-dictionaries')}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Chat Dictionaries
              </button>
              <button
                onClick={async () => {
                  const storage = new (await import('@plasmohq/storage')).Storage({ area: 'local' })
                  const current = (await storage.get<string>('uiMode')) || 'sidePanel'
                  const next = current === 'sidePanel' ? 'webui' : 'sidePanel'
                  await storage.set('uiMode', next)
                  await storage.set('actionIconClick', next)
                  await storage.set('contextMenuClick', 'sidePanel')
                  if (next === 'webui') {
                    const url = browser.runtime.getURL('/options.html')
                    browser.tabs.create({ url })
                  }
                }}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {t('sidepanel:header.toggleSidebar')}
              </button>
              <button
                onClick={() => {
                  const url = browser.runtime.getURL('/options.html#/docs/shortcuts')
                  browser.tabs.create({ url })
                }}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {t('sidepanel:header.shortcuts')}
              </button>
              <button
                onClick={async () => {
                  const next = !debugOpen
                  setDebugOpen(next)
                  try { await browser.runtime.sendMessage({ type: 'tldw:debug', enable: next }) } catch {}
                }}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {debugOpen ? t('sidepanel:header.hideDebug') : t('sidepanel:header.showDebug')}
              </button>
            </Space>
          }
        >
          <IconButton
            ref={moreBtnRef}
            ariaLabel={t('sidepanel:header.moreOptionsAria') as string}
            title={t('sidepanel:header.moreOptionsTitle') as string}
            hasPopup="menu"
            ariaExpanded={moreOpen}
            ariaControls="sidepanel-more-menu"
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-gray-500 dark:text-gray-400"><path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>
            <span className="sr-only">{t('sidepanel:header.moreOptionsTitle')}</span>
          </IconButton>
        </Popover>
        {webuiBtnSidePanel ? (
          <Tooltip title={t("tooltip.openwebui")}>
            <IconButton
              ariaLabel={t('sidepanel:header.openWebuiAria') as string}
              title={t('tooltip.openwebui') as string}
              onClick={() => {
                const url = browser.runtime.getURL("/options.html")
                browser.tabs.create({ url })
              }}
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <MessageSquareShareIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </IconButton>
          </Tooltip>
        ) : null}
        {isEmbedding ? (
          <Tooltip title={t("tooltip.embed")}>
            <BoxesIcon className="size-4 text-gray-500 dark:text-gray-400 animate-bounce animate-infinite" />
          </Tooltip>
        ) : null}

        {messages.length > 0 && !streaming && (
          <Tooltip title={t("option:newChat")}>
            <IconButton
              ariaLabel={t('sidepanel:header.newChatAria') as string}
              title={t("option:newChat") as string}
              onClick={() => {
                clearChat()
              }}
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <PlusSquare className="size-4 text-gray-500 dark:text-gray-400" />
            </IconButton>
          </Tooltip>
        )}

        {/* Private chat toggle moved into chat input controls */}

        {history.length > 0 && (
          <Tooltip title={t("tooltip.clear")}>
            <IconButton
              ariaLabel={t('sidepanel:header.clearHistoryAria') as string}
              title={t("tooltip.clear") as string}
              onClick={() => {
                setHistory([])
              }}
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <EraserIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t("tooltip.history")}>
          <IconButton
            ariaLabel={t('sidepanel:header.openHistoryAria') as string}
            title={t("tooltip.history") as string}
            onClick={() => {
              setSidebarOpen(true)
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <HistoryIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </IconButton>
        </Tooltip>
        <CharacterSelect className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" iconClassName="size-4" />
        {/* Conversation settings button moved next to submit in input bar */}
        <Link to="/settings">
          <CogIcon aria-label={t('sidepanel:header.openSettingsAria')} className="size-4 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>
      {/** Settings modal moved to input area; header trigger removed */}

      <Drawer title="Stream Debug" placement="right" onClose={() => setDebugOpen(false)} open={debugOpen} width={480}>
        <div className="text-xs font-mono whitespace-pre-wrap break-all">
          {debugLogs.length === 0 ? (
            <div className="text-gray-500">No stream events yet.</div>
          ) : (
            debugLogs.map((l, idx) => (
              <div key={idx} className="mb-1">
                <span className="text-gray-400 mr-2">{new Date(l.time).toLocaleTimeString()}</span>
                <span className="mr-2">{l.kind === 'event' ? `event: ${l.name}` : 'data:'}</span>
                {l.data && <span>{l.data}</span>}
              </div>
            ))
          )}
        </div>
      </Drawer>

      <Drawer
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between">
              {t("tooltip.history")}
            </div>

            <button onClick={() => setSidebarOpen(false)}>
              <XIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        }
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          setMessages={setMessages}
          setHistory={setHistory}
          setHistoryId={setHistoryId}
          setSelectedModel={setSelectedModel}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          clearChat={clearChat}
          historyId={historyId}
          setSystemPrompt={(e) => {}}
          temporaryChat={false}
          history={history}
        />
      </Drawer>
    </div>
  )
}
