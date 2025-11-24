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
  variant?: "default" | "compact"
}

type ConnectionToastContentProps = {
  title: string
  body: string
  onDismiss: () => void
  shouldAutoFocus?: () => boolean
}

const ConnectionToastContent: React.FC<ConnectionToastContentProps> = ({
  title,
  body,
  onDismiss,
  shouldAutoFocus
}) => {
  const { t } = useTranslation("common")
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (shouldAutoFocus && shouldAutoFocus()) {
      containerRef.current?.focus()
    }
  }, [shouldAutoFocus])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Esc") {
      event.preventDefault()
      event.stopPropagation()
      onDismiss()
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className="outline-none text-left"
      onKeyDown={handleKeyDown}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs whitespace-pre-line">
        {body}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
        {t("dismiss", { defaultValue: "Dismiss" })}
      </button>
    </div>
  )
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
  enableDemo = false,
  variant = "default"
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

  const canStealFocus = React.useCallback((): boolean => {
    if (typeof document === "undefined") return false
    if (document.visibilityState !== "visible") return false
    const active = document.activeElement
    if (!active || active === document.body) return true
    const tag = (active.tagName || "").toLowerCase()
    const focusableTags = new Set(["input", "textarea", "select", "button"])
    if (focusableTags.has(tag)) return false
    const tabIndex = (active as HTMLElement).getAttribute?.("tabindex")
    if (tabIndex && !Number.isNaN(Number(tabIndex)) && Number(tabIndex) >= 0) {
      return false
    }
    return true
  }, [])

  React.useEffect(() => {
    if (!showToastOnError) return
    const toastKey = "tldw-connection-toast"

    if (statusVariant === "error") {
      const detail = lastError || undefined
      const code = Number(lastStatusCode)
      const hasCode = Number.isFinite(code) && code > 0

      const heading = t(
        "tldwState.errorToast",
        "We couldn't reach {{host}}{{code}}",
        {
          host: serverHost ?? "tldw_server",
          code: hasCode ? ` (HTTP ${code})` : ""
        }
      )

      const detailSection = detail
        ? t("tldwState.troubleshootDetail", "Details: {{detail}}", { detail })
        : ""

      const body = t(
        "tldwState.troubleshoot",
        "Confirm your server is running and that the browser is allowed to reach it, then retry from the Options page.{{detailSection}}",
        { detailSection: detailSection ? `\n${detailSection}` : "" }
      )

      notification.error({
        key: toastKey,
        message: null,
        description: (
          <ConnectionToastContent
            title={heading}
            body={body}
            onDismiss={() => notification.destroy(toastKey)}
            shouldAutoFocus={canStealFocus}
          />
        ),
        placement: "bottomLeft",
        duration: 0,
        className: "tldw-connection-toast"
      })
    } else {
      // Clear error toast when connection succeeds, is missing, or is checking
      notification.destroy(toastKey)
    }
  }, [
    showToastOnError,
    statusVariant,
    serverHost,
    lastError,
    lastStatusCode,
    t,
    notification
  ])

  const isCompact = variant === "compact"

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
              "Add or update your API key in Settings → tldw server, then retry. Double-check the server URL and that your browser can reach it.",
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
            "option:connectionCard.buttonOpenSettings",
            "Open tldw server settings"
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
      handleOpenSettings()
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
    <div
      className={`mx-auto w-full ${
        isCompact ? "mt-4 max-w-md px-3" : "mt-12 max-w-xl px-4"
      }`}>
      <div
        className={`flex flex-col items-center rounded-xl border border-gray-200 bg-white text-center shadow-sm dark:border-gray-700 dark:bg-[#1f1f1f] dark:text-gray-100 ${
          isCompact ? "gap-3 px-4 py-4" : "gap-4 px-6 py-8"
        }`}>
        <div
          className={`flex items-center gap-2 font-semibold ${
            isCompact ? "text-base" : "text-lg"
          }`}>
          <Server className="h-5 w-5 text-blue-500" />
          <span>{headline}</span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
          {descriptionCopy}
        </p>

        {!isCompact && statusVariant === "ok" && (
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

        <div
          className="flex flex-col items-center gap-2"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isSearching && (
            <Tag color="blue" className="px-4 py-1 text-sm">
              {t("tldwState.searching")}
              {elapsed > 0 ? ` · ${elapsed}s` : ""}
            </Tag>
          )}
          {statusVariant === "ok" && (
            <Tag color="green" className="px-4 py-1 text-sm">
              {t("tldwState.running")}
            </Tag>
          )}
          {statusVariant === "missing" && (
            <Tag color="orange" className="px-4 py-1 text-sm">
              {t("tldwState.missing", "Server URL not configured")}
            </Tag>
          )}
          {statusVariant === "error" && (
            <Tag color="red" className="px-4 py-1 text-sm">
              {(() => {
                const code = Number(lastStatusCode)
                const hasCode = Number.isFinite(code) && code > 0
                if (hasCode) {
                  return t(
                    "tldwState.connectionFailedWithCode",
                    "Connection failed (HTTP {{code}})",
                    { code }
                  )
                }
                return t(
                  "tldwState.connectionFailed",
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
              {t("tldwState.elapsed", "Checking… {{seconds}}s", { seconds: elapsed })}
            </span>
          )}
          {statusVariant === "ok" && serverHost && (
            <span className="inline-flex items-center gap-1">
              <Server className="h-3 w-3" />
              {t("tldwState.connectedHint", "Connected to {{host}}.", { host: serverHost })}
            </span>
          )}
          {statusVariant === "error" && lastError && (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
              <span>
                {t("tldwState.errorDetailsLabel", "Details:")}
              </span>
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[0.7rem] text-red-700 dark:bg-red-900/30 dark:text-red-200">
                {lastError}
              </span>
            </span>
          )}
          {secondsSinceLastCheck != null &&
            !(phase === ConnectionPhase.SEARCHING && isChecking) && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="h-3.5 w-3.5" />
              {t("tldwState.lastChecked", "Checked {{seconds}}s ago", { seconds: secondsSinceLastCheck })}
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
            {(statusVariant === "ok" || statusVariant === "error") && serverUrl
              ? t(
                  "option:connectionCard.buttonChangeServer",
                  t("tldwState.changeServer", "Change server")
                )
              : t(
                  "option:connectionCard.buttonConfigureServer",
                  "Configure server"
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

        {statusVariant !== "error" && (
          <button
            type="button"
            onClick={handleOpenDiagnostics}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400">
            <ExternalLink className="h-3 w-3" />
            {diagnosticsLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default ServerConnectionCard
