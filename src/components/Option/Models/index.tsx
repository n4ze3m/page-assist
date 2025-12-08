import { Spin } from "antd"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { browser } from "wxt/browser"
import { AvailableModelsList } from "./AvailableModelsList"
import { useAntdNotification } from "@/hooks/useAntdNotification"
import { tldwModels } from "@/services/tldw"

dayjs.extend(relativeTime)

interface RefreshResponse {
  ok: boolean
}

const isRefreshResponse = (res: unknown): res is RefreshResponse =>
  typeof res === "object" &&
  res !== null &&
  typeof (res as { ok?: unknown }).ok === "boolean"

export const ModelsBody = () => {
  // Custom provider models have been removed; we only show
  // tldw_server models discovered from the server.
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)

  const { t } = useTranslation(["settings", "common"])
  const notification = useAntdNotification()
  const queryClient = useQueryClient()

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await browser.runtime
        .sendMessage({ type: "tldw:models:refresh" })
        .catch(() => null)
      if (!isRefreshResponse(res) || !res.ok) {
        // Fallback to local warm-up if background message failed
        await tldwModels.warmCache(true)
      }
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["tldw-providers-models"] }),
        queryClient.refetchQueries({ queryKey: ["tldw-models"] })
      ])
      const providers = queryClient.getQueryData<Record<string, unknown[]>>([
        "tldw-providers-models"
      ])
      setLastRefreshedAt(Date.now())
      if (!providers || Object.keys(providers).length === 0) {
        notification.error({
          message: t("settings:models.refreshEmpty", {
            defaultValue: "No providers available after refresh"
          }),
          description: t("settings:models.refreshEmptyHint", {
            defaultValue:
              "Check your server URL and API key, ensure your tldw_server is running, then try refreshing again."
          })
        })
      } else {
        notification.success({
          message: t("settings:models.refreshSuccess", {
            defaultValue: "Model list refreshed"
          })
        })
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      notification.error({
        message: t("settings:models.refreshFailed", { defaultValue: "Failed to refresh models" }),
        description: message
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <div>
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-between sm:flex-nowrap">
            <div className="ml-4 mt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                {refreshing ? (
                  <>
                    <Spin size="small" className="mr-2" />
                    {t("common:loading", "Loading…")}
                  </>
                ) : (
                  t("common:refresh", "Refresh")
                )}
              </button>
              {lastRefreshedAt && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("settings:models.lastRefreshedAt", {
                    defaultValue: "Last checked at {{time}}",
                    time: dayjs(lastRefreshedAt).format("HH:mm")
                  })}
                </span>
              )}
            </div>
          </div>
          <AvailableModelsList />
        </div>
      </div>
    </div>
  )
}
