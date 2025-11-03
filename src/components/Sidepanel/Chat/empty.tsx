import { Button, Tag, notification } from "antd"
import { Clock, ExternalLink, RefreshCw, Server, Settings } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"

import { cleanUrl } from "@/libs/clean-url"
import { tldwClient } from "@/services/tldw/TldwApiClient"

const useElapsedTimer = (isRunning: boolean) => {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!isRunning) {
      setElapsed(0)
      return
    }
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRunning])

  return elapsed
}

const useElapsedSince = (timestamp: number | null) => {
  const [elapsed, setElapsed] = React.useState<number | null>(null)

  React.useEffect(() => {
    if (!timestamp) {
      setElapsed(null)
      return
    }

    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - timestamp) / 1000)))
    }

    update()
    const id = window.setInterval(update, 1000)
    return () => window.clearInterval(id)
  }, [timestamp])

  return elapsed
}

export const EmptySidePanel = () => {
  const { t } = useTranslation(["playground", "common"])
  const toastIssuedRef = React.useRef(false)

  const statusQuery = useQuery({
    queryKey: ["tldw-server-status"],
    queryFn: async () => {
      const config = await tldwClient.getConfig()
      if (!config?.serverUrl) {
        throw new Error("missing-config")
      }
      await tldwClient.initialize()
      const ok = await tldwClient.healthCheck()
      return {
        ok,
        config
      }
    },
    retry: false,
    refetchOnWindowFocus: false
  })

  const elapsed = useElapsedTimer(statusQuery.isLoading || statusQuery.isFetching)
  const lastCheckedAt = statusQuery.isFetching
    ? null
    : (statusQuery.dataUpdatedAt || statusQuery.errorUpdatedAt || null)
  const secondsSinceLastCheck = useElapsedSince(lastCheckedAt)

  const openSettings = () => {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage()
    } else {
      window.open("/options.html#/settings/tldw", "_blank")
    }
  }

  const serverUrl = statusQuery.data?.config?.serverUrl
  const serverHost = serverUrl ? cleanUrl(serverUrl) : null

  let statusVariant: "loading" | "ok" | "error" | "missing" = "loading"
  if (statusQuery.isLoading) {
    statusVariant = "loading"
  } else if (statusQuery.isError) {
    statusVariant = (statusQuery.error as Error)?.message === "missing-config" ? "missing" : "error"
  } else if (statusQuery.data?.ok) {
    statusVariant = "ok"
  } else {
    statusVariant = "error"
  }

  const descriptionCopy = !serverHost
    ? t("ollamaState.noServer", "Add your tldw server to start chatting.")
    : statusVariant === "loading"
    ? t("ollamaState.subtitle", "We’re pinging {{host}} to verify the connection.", {
        host: serverHost
      })
    : statusVariant === "ok"
    ? t("ollamaState.connectedSubtitle", "Connected to {{host}}.", {
        host: serverHost
      })
    : t("ollamaState.errorSubtitle", "We couldn’t reach {{host}} yet.", {
        host: serverHost
      })

  const retryLabel = statusVariant === "ok"
    ? t("ollamaState.recheck", "Check again")
    : t("common:retry")

  React.useEffect(() => {
    const toastKey = "tldw-sidepanel-connection"
    if ((statusVariant === "error" && serverHost) || statusVariant === "missing") {
      if (!toastIssuedRef.current) {
        notification.error({
          key: toastKey,
          message:
            statusVariant === "missing"
              ? t("ollamaState.noServer", "Add your tldw server to start chatting.")
              : t("ollamaState.errorToast", "We couldn’t reach {{host}}", {
                  host: serverHost ?? "tldw_server"
                }),
          description:
            statusVariant === "missing"
              ? t(
                  "ollamaState.missingHelp",
                  "Open Settings → tldw Server to add your URL or connect to the Options page."
                )
              : t(
                  "ollamaState.troubleshoot",
                  "Confirm your server is running and that the browser is allowed to reach it, then retry from the Options page."
                ),
          placement: "bottomRight",
          duration: 6
        })
        toastIssuedRef.current = true
      }
    } else if (statusVariant === "ok") {
      notification.destroy(toastKey)
      toastIssuedRef.current = false
    }
  }, [statusVariant, serverHost, t])

  return (
    <div className="mx-auto mt-12 w-full max-w-xl px-4">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-100">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Server className="h-5 w-5 text-blue-500" />
          <span>{t("ollamaState.title", "Waiting for your tldw server")}</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {descriptionCopy}
        </p>

        <div className="flex flex-col items-center gap-2">
          {statusVariant === "loading" && (
            <Tag color="blue" className="px-4 py-1 text-sm">
              {t("ollamaState.searching")}
              {elapsed > 0 ? ` · ${elapsed}s` : ""}
            </Tag>
          )}
          {statusVariant === "ok" && (
            <Tag color="green" className="px-4 py-1 text-sm">
              {t("ollamaState.running")}
            </Tag>
          )}
          {statusVariant === "missing" && (
            <Tag color="orange" className="px-4 py-1 text-sm">
              {t("ollamaState.missing", "Server URL not configured")}
            </Tag>
          )}
          {statusVariant === "error" && (
            <Tag color="red" className="px-4 py-1 text-sm">
              {t("ollamaState.notRunning")}
            </Tag>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {(statusQuery.isFetching || statusVariant === "loading") && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("ollamaState.elapsed", "Checking… {{seconds}}s", { seconds: elapsed })}
            </span>
          )}
          {statusVariant === "ok" && serverHost && (
            <span className="inline-flex items-center gap-1">
              <Server className="h-3 w-3" />
              {t("ollamaState.connectedHint", "Connected to {{host}}.", { host: serverHost })}
            </span>
          )}
          {secondsSinceLastCheck != null && !statusQuery.isFetching && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("ollamaState.lastChecked", "Checked {{seconds}}s ago", { seconds: secondsSinceLastCheck })}
            </span>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button
            type={statusVariant === "ok" ? "default" : "primary"}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => statusQuery.refetch()}
            loading={statusQuery.isFetching}
            block>
            {retryLabel}
          </Button>
          <Button
            icon={<Settings className="h-4 w-4" />}
            onClick={openSettings}
            block>
            {serverHost
              ? t("ollamaState.changeServer", "Change server")
              : t("ollamaState.openSettings", "Open settings")}
          </Button>
        </div>

        <a
          href="https://github.com/n4ze3m/page-assist/blob/main/docs/connection-issue.md"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400">
          <ExternalLink className="h-3 w-3" />
          {t("ollamaState.connectionError")}
        </a>
      </div>
    </div>
  )
}
