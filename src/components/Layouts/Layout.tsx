import React, { useState } from "react"

import { Drawer, Tooltip } from "antd"
import { EraserIcon, XIcon } from "lucide-react"
import { IconButton } from "../Common/IconButton"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"

import { classNames } from "@/libs/class-name"
import { PageAssistDatabase } from "@/db/dexie/chat"
import { useMessageOption } from "@/hooks/useMessageOption"
import {
  useChatShortcuts,
  useSidebarShortcuts
} from "@/hooks/keyboard/useKeyboardShortcuts"
import { useStoreChatModelSettings } from "@/store/model"
import { CurrentChatModelSettings } from "../Common/Settings/CurrentChatModelSettings"
import { Sidebar } from "../Option/Sidebar"
import { Header } from "./Header"
import { useMigration } from "../../hooks/useMigration"
import { confirmDanger } from "@/components/Common/confirm-danger"

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
      <main
        className={classNames(
          "relative w-full",
          hideHeader ? "min-h-screen bg-slate-50 dark:bg-[#101010]" : "h-dvh"
        )}>
        {!hideHeader && (
          <div className="relative z-20 w-full">
            <Header
              setSidebarOpen={setSidebarOpen}
              setOpenModelSettings={setOpenModelSettings}
            />
          </div>
        )}
        <div
          className={classNames(
            "relative flex h-full flex-col",
            hideHeader
              ? "min-h-screen items-center justify-center px-4 py-10 sm:px-8"
              : "pt-2 sm:pt-3"
          )}>
          {children}
        </div>
        {!hideHeader && (
          <Drawer
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconButton
                    onClick={() => setSidebarOpen(false)}
                    ariaLabel="Close sidebar"
                    title="Close sidebar"
                    className="-ml-1">
                    <XIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </IconButton>
                  <span>{t("sidebarTitle")}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <Tooltip
                    title={t(
                      "settings:generalSettings.system.deleteChatHistory.label"
                    )}
                    placement="left">
                    <IconButton
                      ariaLabel={t(
                        "settings:generalSettings.system.deleteChatHistory.label"
                      ) as string}
                      onClick={async () => {
                        const ok = await confirmDanger({
                          title: t("common:confirmTitle", {
                            defaultValue: "Please confirm"
                          }),
                          content: t(
                            "settings:generalSettings.system.deleteChatHistory.confirm"
                          ),
                          okText: t("common:delete", { defaultValue: "Delete" }),
                          cancelText: t("common:cancel", { defaultValue: "Cancel" })
                        })

                        if (!ok) return

                        const db = new PageAssistDatabase()
                        await db.deleteAllChatHistory()
                        await queryClient.invalidateQueries({
                          queryKey: ["fetchChatHistory"]
                        })
                        clearChat()
                      }}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">
                      <EraserIcon className="size-5" />
                    </IconButton>
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
