import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tag, notification } from "antd"
import { Clock, ExternalLink, Send, Server, Settings } from "lucide-react"

import { cleanUrl } from "@/libs/clean-url"
import {
  useConnectionActions,
  useConnectionState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"

type Props = {
  onOpenSettings?: () => void
  onStartChat?: () => void
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
  onStartChat,
  showToastOnError = false
}) => {
  const { t } = useTranslation(["playground", "common", "settings"])
  const { phase, serverUrl, lastCheckedAt, lastError, isChecking, lastStatusCode } =
    useConnectionState()
  const { checkOnce } = useConnectionActions()

  const serverHost = serverUrl ? cleanUrl(serverUrl) : null

  const isSearching = phase === ConnectionPhase.SEARCHING && isChecking
  const elapsed = useElapsedTimer(isSearching)
  const secondsSinceLastCheck = useElapsedSince(lastCheckedAt)

  let statusVariant: "loading" | "ok" | "error" | "missing" = "loading"
  if (phase === ConnectionPhase.UNCONFIGURED) statusVariant = "missing"
  else if (phase === ConnectionPhase.SEARCHING) statusVariant = "loading"
  else if (phase === ConnectionPhase.CONNECTED) statusVariant = "ok"
  else if (phase === ConnectionPhase.ERROR) statusVariant = "error"

  React.useEffect(() => {
    if (!showToastOnError) return
    const toastKey = "tldw-connection-toast"
    if (
      (statusVariant === "error" && serverHost) ||
      statusVariant === "missing"
    ) {
      const detail = lastError || undefined
      const code = Number(lastStatusCode)
      const hasCode = Number.isFinite(code) && code > 0
      notification.error({
        key: toastKey,
        message:
          statusVariant === "missing"
            ? t(
                "ollamaState.noServer",
                "Add your tldw server to start chatting."
              )
            : (
                t("ollamaState.errorToast", "We couldn’t reach {{host}}", { host: serverHost ?? "tldw_server" }) +
                (hasCode ? ` (HTTP ${code})` : "")
              ),
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
  }, [showToastOnError, statusVariant, serverHost, lastError, lastStatusCode, t])

  const descriptionCopy = !serverHost
    ? t("ollamaState.noServer", "Add your tldw server to start chatting.")
    : statusVariant === "loading"
    ? t("ollamaState.subtitle", "We’re pinging {{host}} to verify the connection.", { host: serverHost })
    : statusVariant === "ok"
    ? t("ollamaState.connectedSubtitle", "Connected to {{host}}. Start chatting when you’re ready.", { host: serverHost })
    : t("ollamaState.errorSubtitle", "We couldn’t reach {{host}} yet. Retry or update your server settings.", { host: serverHost })

  const primaryLabel =
    statusVariant === "ok"
      ? t("common:startChat", "Start chatting")
      : statusVariant === "error"
        ? t("common:retry", "Retry")
        : statusVariant === "missing"
          ? t("settings:tldw.setupLink", "Set up server")
          : t("ollamaState.changeServer", "Change server")

  const handlePrimary = () => {
    if (statusVariant === "ok") {
      if (onStartChat) {
        try {
          onStartChat()
        } finally {
          // Also try to focus once the chat is visible
          setTimeout(
            () => window.dispatchEvent(new CustomEvent("tldw:focus-composer")),
            0
          )
        }
      } else {
        window.dispatchEvent(new CustomEvent("tldw:focus-composer"))
      }
    } else if (statusVariant === "error") {
      void checkOnce()
    } else {
      handleOpenSettings()
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
          {isSearching && (
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
                const code = Number(lastStatusCode)
                const hasCode = Number.isFinite(code) && code > 0
                return `${t("ollamaState.notRunning")} ${hasCode ? `(HTTP ${code})` : (lastError ? `(${lastError})` : '')}`.trim()
              })()}
            </Tag>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {isSearching && (
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
          {statusVariant === "error" && lastError && (
            <span className="inline-flex items-center gap-1 text-red-500">
              Error: {lastError}
            </span>
          )}
          {secondsSinceLastCheck != null &&
            !(phase === ConnectionPhase.SEARCHING && isChecking) && (
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
            loading={isSearching}
            block>
            {primaryLabel}
          </Button>
          <Button
            icon={statusVariant === "ok" ? <Settings className="h-4 w-4" /> : <Send className="h-4 w-4 rotate-45" />}
            onClick={handleOpenSettings}
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
          href="/options.html#/settings/health"
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
