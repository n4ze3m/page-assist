import { BetaTag } from "@/components/Common/Beta"
import { useFontSize } from "@/context/FontSizeProvider"
import { PageAssitDatabase } from "@/db"
import { useMessageOption } from "@/hooks/useMessageOption"
import {
  exportPageAssistData,
  importPageAssistData
} from "@/libs/export-import"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Select, notification } from "antd"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"

export const SystemSettings = () => {
  const { t } = useTranslation("settings")
  const queryClient = useQueryClient()
  const { clearChat } = useMessageOption()
  const { increase, decrease, scale } = useFontSize()
  const [actionIconClick, setActionIconClick] = useStorage(
    {
      key: "actionIconClick",
      instance: new Storage({
        area: "local"
      })
    },
    "webui"
  )

  const [contextMenuClick, setContextMenuClick] = useStorage(
    {
      key: "contextMenuClick",
      instance: new Storage({
        area: "local"
      })
    },
    "sidePanel"
  )

  const importDataMutation = useMutation({
    mutationFn: async (file: File) => {
      await importPageAssistData(file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchChatHistory"]
      })
     
      notification.success({
        message: "Imported data successfully"
      })
    },
    onError: (error) => {
      console.error("Import error:", error)
      notification.error({
        message: "Import error"
      })
    }
  })

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("generalSettings.system.heading")}
        </h2>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
      </div>
      <div className="flex flex-row mb-3 justify-between items-center">
        <span className="text-black dark:text-white font-medium">
      <BetaTag />
          {t("generalSettings.system.fontSize.label")}
        </span>
        <div className="flex flex-row items-center gap-3">
          <button
            onClick={decrease}
            className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium text-sm">
            A-
          </button>
          <span className="min-w-[2rem] text-center font-medium text-black dark:text-white">
            {scale.toFixed(1)}x
          </span>
          <button
            onClick={increase}
            className="bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black px-3 py-1.5 rounded-lg transition-colors duration-200 font-medium text-sm">
            A+
          </button>{" "}
        </div>
      </div>

      <div className="flex flex-row mb-3 justify-between">
        <span className="text-gray-700 dark:text-neutral-50 ">
          <BetaTag />
          {t("generalSettings.system.actionIcon.label")}
        </span>
        <Select
          options={[
            {
              label: "Open Web UI",
              value: "webui"
            },
            {
              label: "Open SidePanel",
              value: "sidePanel"
            }
          ]}
          value={actionIconClick}
          className="w-full mt-4 sm:mt-0 sm:w-[200px]"
          onChange={(value) => {
            setActionIconClick(value)
          }}
        />
      </div>
      <div className="flex flex-row mb-3 justify-between">
        <span className="text-gray-700 dark:text-neutral-50 ">
          <BetaTag />
          {t("generalSettings.system.contextMenu.label")}
        </span>
        <Select
          options={[
            {
              label: "Open Web UI",
              value: "webui"
            },
            {
              label: "Open SidePanel",
              value: "sidePanel"
            }
          ]}
          value={contextMenuClick}
          className="w-full mt-4 sm:mt-0 sm:w-[200px]"
          onChange={(value) => {
            setContextMenuClick(value)
          }}
        />
      </div>
      <div className="flex flex-row mb-3 justify-between">
        <span className="text-gray-700 dark:text-neutral-50 ">
          {t("generalSettings.system.export.label")}
        </span>
        <button
          onClick={exportPageAssistData}
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer">
          {t("generalSettings.system.export.button")}
        </button>
      </div>
      <div className="flex flex-row mb-3 justify-between">
        <span className="text-gray-700 dark:text-neutral-50 ">
          {t("generalSettings.system.import.label")}
        </span>
        <label
          htmlFor="import"
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer flex items-center">
          {importDataMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            t("generalSettings.system.import.button")
          )}
        </label>
        <input
          type="file"
          accept=".json"
          id="import"
          className="hidden"
          disabled={importDataMutation.isPending}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              importDataMutation.mutate(e.target.files[0])
            }
          }}
        />
      </div>

      <div className="flex flex-row mb-3 justify-between">
        <span className="text-gray-700 dark:text-neutral-50 ">
          {t("generalSettings.system.deleteChatHistory.label")}
        </span>

        <button
          onClick={async () => {
            const confirm = window.confirm(
              t("generalSettings.system.deleteChatHistory.confirm")
            )

            if (confirm) {
              const db = new PageAssitDatabase()
              await db.deleteAllChatHistory()
              queryClient.invalidateQueries({
                queryKey: ["fetchChatHistory"]
              })
              clearChat()
              try {
                await browser.storage.sync.clear()
                await browser.storage.local.clear()
                await browser.storage.session.clear()
              } catch (e) {
                console.error("Error clearing storage:", e)
              }
            }
          }}
          className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-200 px-4 py-2 rounded-md">
          {t("generalSettings.system.deleteChatHistory.button")}
        </button>
      </div>
    </div>
  )
}
