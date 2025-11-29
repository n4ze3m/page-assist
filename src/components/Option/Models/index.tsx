import { Segmented } from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { browser } from "wxt/browser"
import { CustomModelsTable } from "./CustomModelsTable"
import { AvailableModelsList } from "./AvailableModelsList"
import { AddCustomModelModal } from "./AddCustomModelModal"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import { useAntdNotification } from "@/hooks/useAntdNotification"
import { tldwModels } from "@/services/tldw"

dayjs.extend(relativeTime)

export const ModelsBody = () => {
  const [openAddModelModal, setOpenAddModelModal] = useState(false)
  const [segmented, setSegmented] = useState<string>("available")
  const [refreshing, setRefreshing] = useState(false)

  const { t } = useTranslation(["settings", "common", "openai"])
  const notification = useAntdNotification()
  const queryClient = useQueryClient()

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = (await browser.runtime.sendMessage({ type: "tldw:models:refresh" }).catch(() => null)) as any
      if (!res?.ok) {
        // Fallback to local warm-up if background message failed
        await tldwModels.warmCache(true)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tldw-providers-models"] }),
        queryClient.invalidateQueries({ queryKey: ["tldw-models"] })
      ])
      notification.success({
        message: t("settings:models.refreshSuccess", { defaultValue: "Model list refreshed" })
      })
    } catch (e: any) {
      notification.error({
        message: t("settings:models.refreshFailed", { defaultValue: "Failed to refresh models" }),
        description: e?.message
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <div>
        {/* Add new model button */}
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
            <div className="ml-4 mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                {refreshing ? t("common:loading", "Loading…") : t("common:refresh", "Refresh")}
              </button>
            </div>
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (isFireFoxPrivateMode) {
                    notification.error({
                      message: t(
                        "common:privateModeSaveErrorTitle",
                        "tldw Assistant can't save data"
                      ),
                      description: t(
                        "settings:models.privateModeDescription",
                        "Firefox Private Mode does not support saving data to IndexedDB. Please add custom model from a normal window."
                      )
                    })
                    return
                  }
                  setOpenAddModelModal(true)
                }}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("manageModels.addBtn")}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end mt-3">
            <Segmented
              options={[
                {
                  label: t("common:segmented.available"),
                  value: "available"
                },
                {
                  label: t("common:segmented.custom"),
                  value: "custom"
                }
              ]}
              value={segmented}
              onChange={(v) => setSegmented(String(v))}
            />
          </div>
        </div>
        {segmented === 'available' ? <AvailableModelsList /> : <CustomModelsTable />}
      </div>

      <AddCustomModelModal
        open={openAddModelModal}
        setOpen={setOpenAddModelModal}
      />
    </div>
  )
}
