import React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Button, Tag, notification } from "antd"
import { Clock, ExternalLink, Send, Server, Settings } from "lucide-react"

import { tldwClient } from "@/services/tldw/TldwApiClient"
import { cleanUrl } from "@/libs/clean-url"
import { apiSend } from "@/services/api-send"

type Props = {
  onOpenSettings?: () => void
  showToastOnError?: boolean
}

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

export const ServerConnectionCard: React.FC<Props> = ({
  onOpenSettings,
  showToastOnError = false
}) => {
  const { t } = useTranslation(["playground", "common", "settings"]) 
  const queryClient = useQueryClient()
  const [aborted, setAborted] = React.useState(false)

  const statusQuery = useQuery({
    queryKey: ["tldw-server-status-shared"],
    queryFn: async () => {
      const config = await tldwClient.getConfig()
      if (!config?.serverUrl) {
        throw new Error("missing-config")
      }
      await tldwClient.initialize()
      // Get detailed background response for clearer errors
      const resp = await apiSend({ path: '/api/v1/health', method: 'GET', noAuth: true })
      return { ok: Boolean(resp?.ok), status: resp?.status, error: resp?.ok ? undefined : resp?.error, config }
    },
    retry: false,
    refetchOnWindowFocus: false
  })

  const elapsed = useElapsedTimer(statusQuery.isLoading || statusQuery.isFetching)
  const lastCheckedAt = statusQuery.isFetching
    ? null
    : (statusQuery.dataUpdatedAt || statusQuery.errorUpdatedAt || null)
  const secondsSinceLastCheck = useElapsedSince(lastCheckedAt)

  const serverUrl = (statusQuery.data as any)?.config?.serverUrl as string | undefined
  const serverHost = serverUrl ? cleanUrl(serverUrl) : null

  let statusVariant: "loading" | "ok" | "error" | "missing" = "loading"
  if (statusQuery.isLoading) statusVariant = "loading"
  else if (statusQuery.isError) statusVariant = (statusQuery.error as Error)?.message === "missing-config" ? "missing" : "error"
  else if (statusQuery.data?.ok) statusVariant = "ok"
  else statusVariant = "error"
  if (aborted) statusVariant = "missing"

  React.useEffect(() => {
    if (!showToastOnError) return
    const toastKey = "tldw-connection-toast"
    if ((statusVariant === "error" && serverHost) || statusVariant === "missing") {
      const detail = (statusQuery.data as any)?.error as string | undefined
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
              ) + (detail ? `\nDetails: ${detail}` : ""),
        placement: "bottomRight",
        duration: 6
      })
    } else if (statusVariant === "ok") {
      notification.destroy(toastKey)
    }
  }, [showToastOnError, statusVariant, serverHost, t])

  const descriptionCopy = !serverHost
    ? t("ollamaState.noServer", "Add your tldw server to start chatting.")
    : statusVariant === "loading"
    ? t("ollamaState.subtitle", "We’re pinging {{host}} to verify the connection.", { host: serverHost })
    : statusVariant === "ok"
    ? t("ollamaState.connectedSubtitle", "Connected to {{host}}. Start chatting when you’re ready.", { host: serverHost })
    : t("ollamaState.errorSubtitle", "We couldn’t reach {{host}} yet. Retry or update your server settings.", { host: serverHost })

  const isStuck = statusVariant === "error" || statusVariant === "missing"
  const primaryLabel = statusVariant === "ok"
    ? t("common:startChat", "Start chatting")
    : isStuck
      ? t("ollamaState.openTldwSettings", "Open tldw Settings")
      : t("ollamaState.cancelSearch", "Cancel search")

  const handlePrimary = () => {
    if (statusVariant === "ok") {
      window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
    } else if (isStuck) {
      handleOpenSettings()
    } else {
      // Cancel search: mark aborted and cancel in-flight query if possible
      try {
        setAborted(true)
        queryClient.cancelQueries({ queryKey: ["tldw-server-status-shared"] })
      } catch {}
    }
  }

  const defaultOpenSettings = () => {
    try {
      // @ts-ignore
      if (chrome?.runtime?.openOptionsPage) {
        // @ts-ignore
        chrome.runtime.openOptionsPage()
        return
      }
    } catch {}
    window.open("/options.html#/settings/tldw", "_blank")
  }

  const handleOpenSettings = () => {
    try {
      if (onOpenSettings) return onOpenSettings()
    } finally {}
    defaultOpenSettings()
  }

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
              {(() => {
                const code = Number((statusQuery.data as any)?.status)
                const hasCode = Number.isFinite(code) && code > 0
                return `${t("ollamaState.notRunning")} ${hasCode ? `(HTTP ${code})` : ''}`.trim()
              })()}
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
          {statusVariant === "error" && (statusQuery.data as any)?.error && (
            <span className="inline-flex items-center gap-1 text-red-500">
              Error: {(statusQuery.data as any).error}
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
            type={"primary"}
            icon={statusVariant === "ok" ? <Send className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            onClick={handlePrimary}
            loading={statusQuery.isFetching}
            block>
            {primaryLabel}
          </Button>
          <Button
            icon={statusVariant === "ok" ? <Settings className="h-4 w-4" /> : <Send className="h-4 w-4 rotate-45" />}
            onClick={async () => {
              if (isStuck) {
                const res = await statusQuery.refetch()
                if (showToastOnError && (res.data as any)?.ok) {
                  notification.success({
                    message: t('settings:onboarding.serverUrl.reachable', 'Server responded successfully. You can continue.'),
                    placement: 'bottomRight',
                    duration: 3
                  })
                }
              } else {
                handleOpenSettings()
              }
            }}
            block>
            {statusVariant === "ok"
              ? (serverHost
                  ? t("ollamaState.changeServer", "Change server")
                  : t("ollamaState.openSettings", "Open settings"))
              : statusVariant === "loading"
                ? t("settings:tldw.setupLink", "Set up server")
                : t("common:retry", "Retry")}
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

export default ServerConnectionCard
