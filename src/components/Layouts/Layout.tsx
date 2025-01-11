import React, { useState } from "react"

import { Sidebar } from "../Option/Sidebar"
import { Drawer, Tooltip } from "antd"

import { useTranslation } from "react-i18next"

import { CurrentChatModelSettings } from "../Common/Settings/CurrentChatModelSettings"
import { Header } from "./Header"
import { EraserIcon } from "lucide-react"
import { PageAssitDatabase } from "@/db"
import { useMessageOption } from "@/hooks/useMessageOption"
import { useQueryClient } from "@tanstack/react-query"
import { useStoreChatModelSettings } from "@/store/model"

export default function OptionLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation(["option", "common", "settings"])
  const [openModelSettings, setOpenModelSettings] = useState(false)
  const {
    setMessages,
    setHistory,
    setHistoryId,
    historyId,
    clearChat,
    setSelectedModel,
    temporaryChat,
    setSelectedSystemPrompt
  } = useMessageOption()

  const queryClient = useQueryClient()
  const { setSystemPrompt } = useStoreChatModelSettings()

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header
          setSidebarOpen={setSidebarOpen}
          setOpenModelSettings={setOpenModelSettings}
        />
        <main className="flex-1">{children}</main>
      </div>

      <Drawer
        title={
          <div className="flex items-center justify-between">
            {t("sidebarTitle")}

            <Tooltip
              title={t(
                "settings:generalSettings.system.deleteChatHistory.label"
              )}
              placement="right">
              <button
                onClick={async () => {
                  const confirm = window.confirm(
                    t(
                      "settings:generalSettings.system.deleteChatHistory.confirm"
                    )
                  )

                  if (confirm) {
                    const db = new PageAssitDatabase()
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
        }
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar
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
        />
      </Drawer>

      <CurrentChatModelSettings
        open={openModelSettings}
        setOpen={setOpenModelSettings}
        useDrawer
      />
    </>
  )
}
