import logoImage from "~/assets/icon.png"
import { useMessage } from "~/hooks/useMessage"
import { Link } from "react-router-dom"
import { Tooltip, Drawer } from "antd"
import { CogIcon, PlusSquare, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import React from "react"
import { IconButton } from "@/components/Common/IconButton"
import { Sidebar } from "@/components/Option/Sidebar"
import { useStoreChatModelSettings } from "@/store/model"
import { StatusDot } from "./StatusDot"

type SidepanelHeaderSimpleProps =
  | {
      sidebarOpen: boolean
      setSidebarOpen: (open: boolean) => void
    }
  | {
      sidebarOpen?: undefined
      setSidebarOpen?: undefined
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
  setSidebarOpen: propSetSidebarOpen
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
  const { setSystemPrompt } = useStoreChatModelSettings()

  const isControlled = typeof propSidebarOpen === "boolean"
  const sidebarOpen = isControlled ? (propSidebarOpen as boolean) : localSidebarOpen
  const handleSidebarOpenChange = (open: boolean) => {
    if (!isControlled) {
      setLocalSidebarOpen(open)
    } else if (propSetSidebarOpen) {
      propSetSidebarOpen(open)
    }
  }

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

      {/* Right: New chat + Settings */}
      <div className="flex items-center gap-1">
        {/* New Chat - only show when there are messages and not streaming */}
        {messages.length > 0 && !streaming && (
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
