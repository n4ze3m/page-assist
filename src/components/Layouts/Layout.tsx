import React, { useState } from "react"

import { Sidebar } from "../Option/Sidebar"
import { Drawer } from "antd"

import { useTranslation } from "react-i18next"

import { CurrentChatModelSettings } from "../Common/Settings/CurrentChatModelSettings"
import { Header } from "./Header"

export default function OptionLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { t } = useTranslation(["option", "common"])
  const [openModelSettings, setOpenModelSettings] = useState(false)

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header
          setSidebarOpen={setSidebarOpen}
          setOpenModelSettings={setOpenModelSettings}
        />
        <main className="flex-1 flex flex-col ">{children}</main>
      </div>

      <Drawer
        title={t("sidebarTitle")}
        placement="left"
        closeIcon={null}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </Drawer>

      <CurrentChatModelSettings
        open={openModelSettings}
        setOpen={setOpenModelSettings}
      />
    </>
  )
}
