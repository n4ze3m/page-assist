import logoImage from "~/assets/icon.png"
import { useMessage } from "~/hooks/useMessage"
import { Link } from "react-router-dom"
import { Tooltip, Drawer, notification, Popover, InputNumber, Space } from "antd"
import {
  BoxesIcon,
  BrainCog,
  CogIcon,
  EraserIcon,
  // EraserIcon,
  HistoryIcon,
  PlusSquare,
  XIcon,
  MessageSquareShareIcon
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { CurrentChatModelSettings } from "@/components/Common/Settings/CurrentChatModelSettings"
import React from "react"
import { useStorage } from "@plasmohq/storage/hook"
import { PromptSelect } from "@/components/Common/PromptSelect"
import { Sidebar } from "@/components/Option/Sidebar"
import { BsIncognito } from "react-icons/bs"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { Tooltip as AntdTooltip } from 'antd'

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
  const { t } = useTranslation(["sidepanel", "common", "option"])
  const [openModelSettings, setOpenModelSettings] = React.useState(false)
  const [localSidebarOpen, setLocalSidebarOpen] = React.useState(false)
  const [webuiBtnSidePanel, setWebuiBtnSidePanel] = useStorage(
    "webuiBtnSidePanel",
    false
  )
  const [ingestTimeoutSec, setIngestTimeoutSec] = React.useState<number>(120)
  const [debugOpen, setDebugOpen] = React.useState<boolean>(false)
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

  return (
    <div
      data-istemporary-chat={temporaryChat}
      className=" px-3 justify-between bg-white dark:bg-[#171717] border-b border-gray-300 dark:border-gray-700 py-4 items-center absolute top-0 z-10 flex h-14 w-full data-[istemporary-chat='true']:bg-gray-200 data-[istemporary-chat='true']:dark:bg-black">
      <div className="focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 flex items-center dark:text-white">
        <img
          className="h-6 w-auto"
          src={logoImage}
          alt={t("common:pageAssist")}
        />
        <span className="ml-1 text-sm ">{t("common:pageAssist")}</span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Toggle Sidebar / Full Screen moved into 3-dot menu when in sidepanel */}
        <AntdTooltip title="Save current page on server">
          <button
            onClick={async () => {
              await browser.runtime.sendMessage({ type: 'tldw:ingest', mode: 'store', timeoutMs: Math.max(1, Math.round(Number(ingestTimeoutSec)||120))*1000 })
              notification.success({ message: 'Sent to tldw_server', description: 'Current page has been submitted for ingestion.' })
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <MessageSquareShareIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </AntdTooltip>
        <AntdTooltip title="Process current page locally (no server save)">
          <button
            onClick={async () => {
              await browser.runtime.sendMessage({ type: 'tldw:ingest', mode: 'process', timeoutMs: Math.max(1, Math.round(Number(ingestTimeoutSec)||120))*1000 })
              notification.success({ message: 'Processed locally', description: 'Processed content stored locally under Settings > Processed.' })
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <BoxesIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </AntdTooltip>
        <Popover
          trigger="click"
          content={
            <Space size="small" direction="vertical">
              <div className="text-xs text-gray-500">Ingest Timeout (seconds)</div>
              <InputNumber min={1} value={ingestTimeoutSec} onChange={(v) => setIngestTimeoutSec(Number(v||120))} />
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
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
                Toggle Sidebar / Full Screen
              </button>
              <button
                onClick={async () => {
                  const next = !debugOpen
                  setDebugOpen(next)
                  try { await browser.runtime.sendMessage({ type: 'tldw:debug', enable: next }) } catch {}
                }}
                className="text-left text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                {debugOpen ? 'Hide Stream Debug' : 'Show Stream Debug'}
              </button>
            </Space>
          }
        >
          <button title="Ingest options" className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-gray-500 dark:text-gray-400"><path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z"/></svg>
          </button>
        </Popover>
        {webuiBtnSidePanel ? (
          <Tooltip title={t("tooltip.openwebui")}>
            <button
              onClick={() => {
                const url = browser.runtime.getURL("/options.html")
                browser.tabs.create({ url })
              }}
              className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
              <MessageSquareShareIcon className="size-4 text-gray-500 dark:text-gray-400" />
            </button>
          </Tooltip>
        ) : null}
        {isEmbedding ? (
          <Tooltip title={t("tooltip.embed")}>
            <BoxesIcon className="size-4 text-gray-500 dark:text-gray-400 animate-bounce animate-infinite" />
          </Tooltip>
        ) : null}

        {messages.length > 0 && !streaming && (
          <button
            title={t("option:newChat")}
            onClick={() => {
              clearChat()
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <PlusSquare className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        <button
          title={t("option:temporaryChat")}
          onClick={() => {
            if (isFireFoxPrivateMode) {
              notification.error({
                message: "Error",
                description:
                  "Page Assist can't save chat in Firefox Private Mode. Temporary chat is enabled by default. More fixes coming soon."
              })
              return
            }

            setTemporaryChat(!temporaryChat)
            if (messages.length > 0) {
              clearChat()
            }
          }}
          data-istemporary-chat={temporaryChat}
          className="flex items-center text-gray-500 dark:text-gray-400 space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 rounded-full p-1 data-[istemporary-chat='true']:bg-gray-300 data-[istemporary-chat='true']:dark:bg-gray-800">
          <BsIncognito className="size-4 " />
        </button>

        {history.length > 0 && (
          <button
            title={t("tooltip.clear")}
            onClick={() => {
              setHistory([])
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <EraserIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
        <Tooltip title={t("tooltip.history")}>
          <button
            onClick={() => {
              setSidebarOpen(true)
            }}
            className="flex items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-700">
            <HistoryIcon className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        </Tooltip>
        <PromptSelect
          selectedSystemPrompt={selectedSystemPrompt}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          setSelectedQuickPrompt={setSelectedQuickPrompt}
          iconClassName="size-4"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        />
        {!hideCurrentChatModelSettings && (
          <Tooltip title={t("common:currentChatModelSettings")}>
            <button
              onClick={() => setOpenModelSettings(true)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <BrainCog className="size-4" />
            </button>
          </Tooltip>
        )}
        <Link to="/settings">
          <CogIcon className="size-4 text-gray-500 dark:text-gray-400" />
        </Link>
      </div>
      <CurrentChatModelSettings
        open={openModelSettings}
        setOpen={setOpenModelSettings}
        isOCREnabled={useOCR}
      />

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
