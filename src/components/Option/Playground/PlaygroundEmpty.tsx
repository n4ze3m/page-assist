import React from "react"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"
import { useNavigate } from "react-router-dom"
import ServerConnectionCard from "@/components/Common/ServerConnectionCard"

export const PlaygroundEmpty = () => {
  const { t } = useTranslation(["playground", "common"]) 
  const navigate = useNavigate()
  const [checkOllamaStatus] = useStorage("checkOllamaStatus", true)

  if (!checkOllamaStatus) {
    return (
      <div className="mx-auto sm:max-w-xl px-4 mt-10">
        <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-gray-50 dark:bg-[#262626] dark:border-gray-600">
          <h1 className="text-sm font-medium text-center text-gray-600 dark:text-gray-300 flex gap-3 items-center justify-center">
            <span>👋</span>
            <span>{t("welcome")}</span>
          </h1>
        </div>
      </div>
    )
  }

  return checkOllamaStatus ? (
    <ServerConnectionCard onOpenSettings={() => navigate("/settings/tldw")} />
  ) : (
    <div className="mx-auto sm:max-w-xl px-4 mt-10">
      <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-gray-50 dark:bg-[#262626] dark:border-gray-600">
        <h1 className="text-sm font-medium text-center text-gray-600 dark:text-gray-300 flex gap-3 items-center justify-center">
          <span>👋</span>
          <span>{t("welcome")}</span>
        </h1>
      </div>
    </div>
  )
}
