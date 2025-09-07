import { BetaTag } from "@/components/Common/Beta"
import { useFontSize } from "@/context/FontSizeProvider"
import { useMessageOption } from "@/hooks/useMessageOption"
import {
  exportPageAssistData,
  importPageAssistData
} from "@/libs/export-import"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Select, notification, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { Loader2, RotateCcw, Upload } from "lucide-react"
import { toBase64 } from "@/libs/to-base64"
import { PageAssistDatabase } from "@/db/dexie/chat"
import { isFireFox, isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { firefoxSyncDataForPrivateMode } from "@/db/dexie/firefox-sync"

export const SystemSettings = () => {
  const { t } = useTranslation(["settings", "knowledge"])
  const queryClient = useQueryClient()
  const { clearChat } = useMessageOption()
  const { increase, decrease, scale } = useFontSize()

  const [webuiBtnSidePanel, setWebuiBtnSidePanel] = useStorage(
    "webuiBtnSidePanel",
    false
  )

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
  const [chatBackgroundImage, setChatBackgroundImage] = useStorage({
    key: "chatBackgroundImage",
    instance: new Storage({
      area: "local"
    })
  })

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

      setTimeout(() => { 
        window.location.reload() 
      }, 1000)   
    },
    onError: (error) => {
      console.error("Import error:", error)
      notification.error({
        message: "Import error"
      })
    }
  })

  const syncFirefoxData = useMutation({
    mutationFn: firefoxSyncDataForPrivateMode,
    onSuccess: () => {
      notification.success({
        message:
          "Firefox data synced successfully, You don't need to do this again"
      })
    },
    onError: (error) => {
      console.log(error)
      notification.error({
        message: "Firefox data sync failed"
      })
    }
  })

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        if (!file.type.startsWith("image/")) {
          notification.error({
            message: "Please select a valid image file"
          })
          return
        }

        const base64String = await toBase64(file)
        setChatBackgroundImage(base64String)
      } catch (error) {
        console.error("Error uploading image:", error)
        notification.error({
          message: "Failed to upload image"
        })
      }
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("generalSettings.system.heading")}
        </h2>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3"></div>
      </div>
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-black dark:text-white font-medium">
          <BetaTag />
          {t("generalSettings.system.fontSize.label")}
        </span>
        <div className="flex flex-row items-center gap-3 justify-center sm:justify-end">
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

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
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
          className="w-full sm:w-[200px]"
          onChange={(value) => {
            setActionIconClick(value)
          }}
        />
      </div>
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
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
          className="w-full sm:w-[200px]"
          onChange={(value) => {
            setContextMenuClick(value)
          }}
        />
      </div>
      {isFireFox && !isFireFoxPrivateMode && (
        <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
          <span className="text-gray-700 dark:text-neutral-50">
            <BetaTag />
            {t("generalSettings.system.firefoxPrivateModeSync.label", {
              defaultValue:
                "Sync Custom Models, Prompts for Firefox Private Windows (Incognito Mode)"
            })}
          </span>
          <button
            onClick={() => {
              syncFirefoxData.mutate()
            }}
            disabled={syncFirefoxData.isPending}
            className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer w-full sm:w-auto">
            {syncFirefoxData.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("generalSettings.system.firefoxPrivateModeSync.button", {
                defaultValue: "Sync Data"
              })
            )}
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.webuiBtnSidePanel.label")}
        </span>
         <div>
          <Switch
          checked={webuiBtnSidePanel}
          onChange={(checked) => {
            setWebuiBtnSidePanel(checked)
          }}
        />
         </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          <BetaTag />
          {t("generalSettings.system.chatBackgroundImage.label")}
        </span>
        <div className="flex items-center gap-2 justify-center sm:justify-end">
          {chatBackgroundImage ? (
            <button
              onClick={() => {
                setChatBackgroundImage(null)
              }}
              className="text-gray-800 dark:text-white">
              <RotateCcw className="size-4" />
            </button>
          ) : null}
          <label
            htmlFor="background-image-upload"
            className="bg-gray-800 inline-flex gap-2 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer">
            <Upload className="size-4" />
            {t("knowledge:form.uploadFile.label")}
          </label>
          <input
            type="file"
            accept="image/*"
            id="background-image-upload"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.export.label")}
        </span>
        <button
          onClick={exportPageAssistData}
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer w-full sm:w-auto">
          {t("generalSettings.system.export.button")}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.import.label")}
        </span>
        <label
          htmlFor="import"
          className="bg-gray-800 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-md cursor-pointer flex items-center justify-center w-full sm:w-auto">
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

      <div className="flex flex-col sm:flex-row mb-3 gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <span className="text-gray-700 dark:text-neutral-50">
          {t("generalSettings.system.deleteChatHistory.label")}
        </span>

        <button
          onClick={async () => {
            const confirm = window.confirm(
              t("generalSettings.system.deleteChatHistory.confirm")
            )

            if (confirm) {
              const db = new PageAssistDatabase()
              await db.clearDB()
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
          className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-200 px-4 py-2 rounded-md w-full sm:w-auto">
          {t("generalSettings.system.deleteChatHistory.button")}
        </button>
      </div>
    </div>
  )
}
