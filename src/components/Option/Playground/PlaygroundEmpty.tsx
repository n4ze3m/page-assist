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
    <div className="w-full">
      <ServerConnectionCard onOpenSettings={() => navigate("/settings/tldw")} />
      <div className="mt-4 mx-auto max-w-xl rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
        <div className="font-semibold mb-1">{t('tips.title', 'Tips')}</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('tips.quickIngest', 'Use Quick ingest to add documents and web pages.')}</li>
          <li>{t('tips.pickModelPrompt', 'Pick a Model and a Prompt from the header.')}</li>
          <li>{t('tips.startChatFocus', 'When connected, “Start chatting” focuses the composer.')}</li>
        </ul>
      </div>
    </div>
  ) : (
    <div className="mx-auto sm:max-w-xl px-4 mt-10">
      <div className="rounded-lg justify-center items-center flex flex-col border p-8 bg-gray-50 dark:bg-[#262626] dark:border-gray-600">
        <h1 className="text-sm font-medium text-center text-gray-600 dark:text-gray-300 flex gap-3 items-center justify-center">
          <span>👋</span>
          <span>{t("welcome")}</span>
        </h1>
      </div>
      <div className="mt-4 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-300">
        <div className="font-semibold mb-1">{t('tips.title', 'Tips')}</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('tips.quickIngest', 'Use Quick ingest to add documents and web pages.')}</li>
          <li>{t('tips.pickModelPrompt', 'Pick a Model and a Prompt from the header.')}</li>
          <li>{t('tips.startChatFocus', 'When connected, “Start chatting” focuses the composer.')}</li>
        </ul>
      </div>
    </div>
  )
}
