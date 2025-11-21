import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tag } from "antd"
import { Clock, ExternalLink, Send, Server, Settings } from "lucide-react"

import { cleanUrl } from "@/libs/clean-url"
import {
  useConnectionActions,
  useConnectionState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { useAntdNotification } from "@/hooks/useAntdNotification"

type Props = {
  onOpenSettings?: () => void
  onStartChat?: () => void
  showToastOnError?: boolean
  enableDemo?: boolean
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
  showToastOnError = false,
  enableDemo = false
}) => {
  const { t } = useTranslation(["playground", "common", "settings", "option"])
  const { phase, serverUrl, lastCheckedAt, lastError, isChecking, lastStatusCode } =
    useConnectionState()
  const { checkOnce } = useConnectionActions()
  const notification = useAntdNotification()

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

    if (statusVariant === "error") {
      const detail = lastError || undefined
      const code = Number(lastStatusCode)
      const hasCode = Number.isFinite(code) && code > 0

      notification.error({
        key: toastKey,
        message: t(
          "ollamaState.errorToast",
          "We couldn’t reach {{host}}",
          { host: serverHost ?? "tldw_server" }
        ) + (hasCode ? ` (HTTP ${code})` : ""),
        description: t(
          "ollamaState.troubleshoot",
          "Confirm your server is running and that the browser is allowed to reach it, then retry from the Options page."
        ) + (detail ? `\nDetails: ${detail}` : ""),
        placement: "bottomRight",
        duration: 6
      })
    } else if (statusVariant === "ok" || statusVariant === "missing") {
      notification.destroy(toastKey)
    }
  }, [
    showToastOnError,
    statusVariant,
    serverHost,
    lastError,
    lastStatusCode,
    t
  ])

  const headline =
    statusVariant === "missing"
      ? t(
          "option:connectionCard.headlineMissing",
          "Connect tldw Assistant to your server"
        )
      : statusVariant === "loading"
        ? t(
            "option:connectionCard.headlineSearching",
            "Searching for your tldw server…"
          )
        : statusVariant === "ok"
          ? t(
              "option:connectionCard.headlineConnected",
              "Connected to your tldw server"
            )
          : t(
              "option:connectionCard.headlineError",
              "Can’t reach your tldw server"
            )

  const descriptionCopy =
    statusVariant === "missing"
      ? t(
          "option:connectionCard.descriptionMissing",
          "tldw_server is your private AI workspace that keeps chats, notes, and media on your own machine. It runs on your infrastructure and powers chat, knowledge search, and media processing. Add your server URL to get started."
        )
      : statusVariant === "loading"
        ? t(
            "option:connectionCard.descriptionSearching",
            "We’re checking {{host}} to verify your tldw server is reachable.",
            { host: serverHost ?? "tldw_server" }
          )
        : statusVariant === "ok"
          ? t(
              "option:connectionCard.descriptionConnected",
              "Connected to {{host}}. Start chatting in the main view or sidebar.",
              { host: serverHost ?? "tldw_server" }
            )
          : t(
              "option:connectionCard.descriptionError",
              "We couldn’t reach {{host}}. Check that the server is running, the URL is correct, and your browser can reach it.",
              { host: serverHost ?? "tldw_server" }
            )

  const primaryLabel =
    statusVariant === "ok"
      ? t(
          "option:connectionCard.buttonStartChat",
          t("common:startChat", "Start chatting")
        )
          : statusVariant === "error"
            ? t(
                "option:connectionCard.buttonRetry",
                "Retry connection"
              )
      : statusVariant === "missing"
        ? t("settings:tldw.setupLink", "Set up server")
        : t(
            "option:connectionCard.buttonChecking",
            "Checking…"
          )

  const diagnosticsLabel =
    statusVariant === "missing"
      ? t(
          "option:connectionCard.buttonOpenDiagnostics",
          "Open diagnostics"
        )
      : t(
            "option:connectionCard.buttonViewDiagnostics",
            "View diagnostics"
        )

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

  const handleOpenDiagnostics = () => {
    window.open("/options.html#/settings/health", "_blank")
  }

  const handleOpenHelpDocs = () => {
    window.open(
      "https://github.com/rmusser01/tldw_browser_assistant",
      "_blank"
    )
  }

  return (
    <div className="mx-auto mt-12 w-full max-w-xl px-4">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-100">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Server className="h-5 w-5 text-blue-500" />
          <span>{headline}</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {descriptionCopy}
        </p>

        {statusVariant === "ok" && (
          <ul className="mt-1 max-w-sm list-disc text-left text-xs text-gray-600 dark:text-gray-300">
            <li>
              {t(
                "option:connectionCard.descriptionConnectedList.reviewMedia",
                "Review media & transcripts"
              )}
            </li>
            <li>
              {t(
                "option:connectionCard.descriptionConnectedList.searchKnowledge",
                "Search knowledge and notes"
              )}
            </li>
            <li>
              {t(
                "option:connectionCard.descriptionConnectedList.useRag",
                "Use RAG with your own documents"
              )}
            </li>
          </ul>
        )}

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
                if (hasCode) {
                  return t(
                    "ollamaState.connectionFailedWithCode",
                    "Connection failed (HTTP {{code}})",
                    { code }
                  )
                }
                return t(
                  "ollamaState.connectionFailed",
                  "Connection failed"
                )
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
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
              <span>
                {t("ollamaState.errorDetailsLabel", "Details:")}
              </span>
              <code className="rounded bg-red-50 px-1 py-0.5 font-mono text-[0.7rem] text-red-700 dark:bg-red-900/30 dark:text-red-200">
                {lastError}
              </code>
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
            icon={
              statusVariant === "ok" ? (
                <Send className="h-4 w-4" />
              ) : statusVariant === "error" ? (
                <Send className="h-4 w-4 rotate-45" />
              ) : (
                <Settings className="h-4 w-4" />
              )
            }
            onClick={handlePrimary}
            loading={isSearching}
            disabled={statusVariant === "loading"}
            block>
            {primaryLabel}
          </Button>
          {enableDemo && statusVariant === "missing" && (
            <Button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("tldw:demo-mode-toggle", {
                    detail: { enabled: true }
                  })
                )
              }
              block>
              {t("option:connectionCard.buttonTryDemo", "Try a demo")}
            </Button>
          )}
          <Button
            icon={<Settings className="h-4 w-4" />}
            onClick={handleOpenSettings}
            block>
            {statusVariant === "ok" || statusVariant === "error"
              ? t(
                  "option:connectionCard.buttonChangeServer",
                  t("ollamaState.changeServer", "Change server")
                )
              : t(
                  "option:connectionCard.buttonAdvancedSettings",
                  "Open tldw Settings"
                )}
          </Button>
        </div>

        {statusVariant === "error" && (
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              size="small"
              onClick={handleOpenDiagnostics}
              className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200">
              {t(
                "option:connectionCard.buttonDiagnostics",
                "Diagnostics"
              )}
            </Button>
            <Button
              size="small"
              onClick={handleOpenHelpDocs}
              className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200">
              {t(
                "option:connectionCard.buttonHelpDocs",
                "Help docs"
              )}
            </Button>
          </div>
        )}

        <button
          type="button"
          onClick={handleOpenDiagnostics}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400">
          <ExternalLink className="h-3 w-3" />
          {diagnosticsLabel}
        </button>
      </div>
    </div>
  )
}

export default ServerConnectionCard
