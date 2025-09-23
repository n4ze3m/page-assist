import React, { useState } from "react"

import { Sidebar } from "../Option/Sidebar"
import { Drawer, Tooltip } from "antd"

import { useTranslation } from "react-i18next"

import { CurrentChatModelSettings } from "../Common/Settings/CurrentChatModelSettings"
import { Header } from "./Header"
import { EraserIcon, XIcon } from "lucide-react"
// import { PageAssitDatabase } from "@/db/"
import { useMessageOption } from "@/hooks/useMessageOption"
import { useChatShortcuts, useSidebarShortcuts } from "@/hooks/keyboard/useKeyboardShortcuts"
import { useQueryClient } from "@tanstack/react-query"
import { useStoreChatModelSettings } from "@/store/model"
import { PageAssistDatabase } from "@/db/dexie/chat"
import { useMigration } from "../../hooks/useMigration"

export default function OptionLayout({
  children,
  hideHeader = false
}: {
  children: React.ReactNode
  hideHeader?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation(["option", "common", "settings"])
  const [openModelSettings, setOpenModelSettings] = useState(false)
  useMigration()
  const {
    setMessages,
    setHistory,
    setHistoryId,
    historyId,
    clearChat,
    setSelectedModel,
    temporaryChat,
    setSelectedSystemPrompt,
    setContextFiles,
    useOCR
  } = useMessageOption()
  const queryClient = useQueryClient()
  const { setSystemPrompt } = useStoreChatModelSettings()

  // Create toggle function for sidebar
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  // Initialize shortcuts
  useChatShortcuts(clearChat, true)
  useSidebarShortcuts(toggleSidebar, true)

  return (
    <div className="flex h-full w-full">
      <main className="relative h-dvh w-full">
        {!hideHeader && (
          <div className="relative z-20 w-full">
            <Header
              setSidebarOpen={setSidebarOpen}
              setOpenModelSettings={setOpenModelSettings}
            />
          </div>
        )}
        {/* <div className="relative flex h-full flex-col items-center"> */}
        {children}
        {/* </div> */}
        {!hideHeader && (
        <Drawer
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  title="Close sidebar"
                  className="-ml-1"
                >
                  <XIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
                <span>{t("sidebarTitle")}</span>
              </div>

              <div className="flex items-center space-x-3">
                <Tooltip
                  title={t(
                    "settings:generalSettings.system.deleteChatHistory.label"
                  )}
                  placement="left">
                  <button
                    onClick={async () => {
                      const confirm = window.confirm(
                        t(
                          "settings:generalSettings.system.deleteChatHistory.confirm"
                        )
                      )

                      if (confirm) {
                        const db = new PageAssistDatabase()
                        await db.deleteAllChatHistory()
                        await queryClient.invalidateQueries({
                          queryKey: ["fetchChatHistory"]
                        })
                        clearChat()
                      }
                    }}
                    className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">
                    <EraserIcon className="size-5" />
                  </button>
                </Tooltip>
              </div>
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
            setSystemPrompt={setSystemPrompt}
            temporaryChat={temporaryChat}
            history={history}
            setContext={setContextFiles}
          />
        </Drawer>
        )}

        {!hideHeader && (
          <CurrentChatModelSettings
            open={openModelSettings}
            setOpen={setOpenModelSettings}
            useDrawer
            isOCREnabled={useOCR}
          />
        )}
      </main>
    </div>
  )
}
