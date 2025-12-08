import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tag } from "antd"
import { Clock, ExternalLink, Send, Server, Settings } from "lucide-react"

import { cleanUrl } from "@/libs/clean-url"
import {
  useConnectionActions,
  useConnectionState,
  useConnectionUxState
} from "@/hooks/useConnectionState"
import { useConnectionStore } from "@/store/connection"
import { ConnectionPhase } from "@/types/connection"
import { useAntdNotification } from "@/hooks/useAntdNotification"
import { focusComposer } from "@/hooks/useComposerFocus"
import { getReturnTo, clearReturnTo } from "@/utils/return-to"
import { useNavigate } from "react-router-dom"
import { ServerOverviewHint } from "@/components/Common/ServerOverviewHint"
import { useDemoMode } from "@/context/demo-mode"

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
  const navigate = useNavigate()
  const {
    phase,
    serverUrl,
    lastCheckedAt,
    lastError,
    isChecking,
    lastStatusCode,
    offlineBypass
  } = useConnectionState()
  const { uxState, errorKind, mode, hasCompletedFirstRun } =
    useConnectionUxState()
  const {
    checkOnce,
    enableOfflineBypass,
    disableOfflineBypass,
    setDemoMode
  } = useConnectionActions()
  const { setDemoEnabled } = useDemoMode()
  const notification = useAntdNotification()
  const [knownServerUrl, setKnownServerUrl] = React.useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [offlineHintVisible, setOfflineHintVisible] = React.useState(false)
  const [returnTo, setReturnToState] = React.useState<string | null>(null)
  const [showErrorDetails, setShowErrorDetails] = React.useState(false)

  React.useEffect(() => {
    const target = getReturnTo()
    if (target) {
      setReturnToState(target)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        chrome.storage.local.get("tldwConfig", (res) => {
          const url = res?.tldwConfig?.serverUrl
          if (url && !cancelled) setKnownServerUrl(url)
        })
      }
    } catch {
      // ignore storage read issues
    }
    return () => {
      cancelled = true
    }
  }, [])

  const displayServerUrl = serverUrl || knownServerUrl
  const serverHost = displayServerUrl ? cleanUrl(displayServerUrl) : null

  const isSearching =
    uxState === "testing" ||
    (phase === ConnectionPhase.SEARCHING && isChecking)
  const elapsed = useElapsedTimer(isSearching)
  const secondsSinceLastCheck = useElapsedSince(lastCheckedAt)

  let statusVariant: "loading" | "ok" | "error" | "missing" = "loading"
  switch (uxState) {
    case "unconfigured":
    case "configuring_url":
    case "configuring_auth":
      statusVariant = "missing"
      break
    case "testing":
      statusVariant = "loading"
      break
    case "connected_ok":
    case "connected_degraded":
    case "demo_mode":
      statusVariant = "ok"
      break
    case "error_unreachable":
    case "error_auth":
      statusVariant = "error"
      break
    default:
      statusVariant = "loading"
  }

  React.useEffect(() => {
    if (statusVariant !== "error") {
      setShowErrorDetails(false)
    }
  }, [statusVariant])

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
          ? uxState === "connected_degraded"
            ? t(
                "option:connectionCard.headlineConnectedDegraded",
                "Chat is ready — Knowledge still warming up"
              )
            : t(
                "option:connectionCard.headlineConnected",
                "Connected to your tldw server"
              )
          : errorKind === "auth"
            ? t(
                "option:connectionCard.headlineErrorAuth",
                "API key needs attention"
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
          ? isCompact
            ? t(
                uxState === "connected_degraded"
                  ? "option:connectionCard.descriptionConnectedDegradedCompact"
                  : "option:connectionCard.descriptionConnectedCompact",
                uxState === "connected_degraded"
                  ? "Chat is connected. Knowledge search may be limited until your server finishes indexing."
                  : mode === "demo"
                    ? "Demo mode is enabled."
                    : "Connected to {{host}}.",
                { host: serverHost ?? "tldw_server" }
              )
            : t(
                uxState === "connected_degraded"
                  ? "option:connectionCard.descriptionConnectedDegraded"
                  : "option:connectionCard.descriptionConnected",
                uxState === "connected_degraded"
                  ? "Chat is connected to {{host}}. Knowledge search may be offline or limited until indexing completes. You can still chat normally while your server catches up."
                  : mode === "demo"
                    ? "Demo mode is enabled. Explore the workspace with sample data."
                    : "Connected to {{host}}. Start chatting in the main view or sidebar.",
                { host: serverHost ?? "tldw_server" }
              )
          : errorKind === "auth"
            ? t(
                "option:connectionCard.descriptionErrorAuth",
                "Your server is up but the API key is wrong or missing. Fix the key in Settings → tldw server, then retry."
              )
            : t(
                "option:connectionCard.descriptionError",
                "We couldn’t reach {{host}}. Check that your tldw_server is running and that your browser can reach it, then open diagnostics or update the URL.",
                { host: serverHost ?? "tldw_server" }
              )

  const diagnosticsLabel =
    t("settings:healthSummary.diagnostics", "Health & diagnostics")

  const primaryLabel =
    statusVariant === "ok"
      ? hasCompletedFirstRun
        ? t("common:startChat", "Start chatting")
        : t(
            "option:connectionCard.buttonFinishSetup",
            "Finish setup"
          )
      : statusVariant === "missing"
        ? t("settings:tldw.setupLink", "Set up server")
        : statusVariant === "error"
          ? errorKind === "auth"
            ? t(
                "option:connectionCard.buttonFixApiKey",
                "Fix API key"
              )
            : diagnosticsLabel
          : t(
              "option:connectionCard.buttonChecking",
              "Checking…"
            )

  const openOnboarding = () => {
    // Open the options page on the onboarding (home) route.
    try {
      // @ts-ignore
      if (typeof browser !== "undefined" && browser.runtime?.getURL) {
        // @ts-ignore
        const url = browser.runtime.getURL("/options.html#/")
        // @ts-ignore
        if (browser.tabs?.create) {
          // @ts-ignore
          browser.tabs.create({ url })
        } else {
          window.open(url, "_blank")
        }
        return
      }
    } catch {
      // Fall through to chrome.* / window.open below.
    }

    try {
      // @ts-ignore
      if (chrome?.runtime?.getURL) {
        // @ts-ignore
        const url = chrome.runtime.getURL("/options.html#/")
        window.open(url, "_blank")
        return
      }
      // @ts-ignore
      if (chrome?.runtime?.openOptionsPage) {
        // @ts-ignore
        chrome.runtime.openOptionsPage()
        return
      }
    } catch {
      // ignore and fall back to plain window.open
    }

    window.open("/options.html#/", "_blank")
  }

  const handlePrimary = () => {
    if (!hasCompletedFirstRun) {
      openOnboarding()
      return
    }

    if (
      uxState === "connected_ok" ||
      uxState === "connected_degraded" ||
      uxState === "demo_mode"
    ) {
      if (onStartChat) {
        try {
          onStartChat()
        } finally {
          // Also try to focus once the chat is visible
          setTimeout(() => focusComposer(), 0)
        }
      } else {
        focusComposer()
      }
      return
    }

    if (
      uxState === "unconfigured" ||
      uxState === "configuring_url" ||
      uxState === "configuring_auth"
    ) {
      openOnboarding()
      return
    }

    if (uxState === "error_auth") {
      handleOpenSettings()
      return
    }

    if (uxState === "error_unreachable") {
      handleOpenDiagnostics()
      return
    }
  }

  const defaultOpenSettings = () => {
    // Shared helper for non-sidepanel contexts (e.g., popup / background).
    // Prefer opening the extension's options.html directly so users land on
    // the tldw settings page instead of the generic extensions manager.
    try {
      // @ts-ignore
      if (typeof browser !== "undefined" && browser.runtime?.getURL) {
        // @ts-ignore
        const url = browser.runtime.getURL("/options.html#/settings/tldw")
        // @ts-ignore
        if (browser.tabs?.create) {
          // @ts-ignore
          browser.tabs.create({ url })
        } else {
          window.open(url, "_blank")
        }
        return
      }
    } catch {
      // Fall through to chrome.* / window.open below.
    }

    try {
      // @ts-ignore
      if (chrome?.runtime?.getURL) {
        // @ts-ignore
        const url = chrome.runtime.getURL("/options.html#/settings/tldw")
        window.open(url, "_blank")
        return
      }
      // @ts-ignore
      if (chrome?.runtime?.openOptionsPage) {
        // @ts-ignore
        chrome.runtime.openOptionsPage()
        return
      }
    } catch {
      // ignore and fall back to plain window.open
    }

    window.open("/options.html#/settings/tldw", "_blank")
  }

  const handleOpenSettings = () => {
    if (onOpenSettings) return onOpenSettings()
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

  const handleOpenQuickIngestIntro = () => {
    window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest-intro"))
  }

  const handleOpenQuickIngest = async () => {
    try {
      await checkOnce()
    } catch {
      // ignore check failures; we will gate on current connection state
    }
    const { state } = useConnectionStore.getState()
    const canOpen = state.offlineBypass || state.isConnected
    if (!canOpen) {
      try {
        await enableOfflineBypass()
      } catch {
        // allow fallback to regular open even if bypass enabling fails
      }
    }
    window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest"))
  }

  const handleOfflineBypass = async () => {
    try {
      await enableOfflineBypass()
    } catch {
      // ignore enable failures; fallback to a regular check
      try {
        await checkOnce()
      } catch {
        // swallow fallback failures
      }
    }
    setOfflineHintVisible(true)
  }

  const handleDisableOfflineBypass = async () => {
    try {
      await disableOfflineBypass()
    } catch {
      // ignore disable failures; fallback to a regular check
      try {
        await checkOnce()
      } catch {
        // swallow fallback failures
      }
    }
    setOfflineHintVisible(false)
  }

  const handleReturn = () => {
    const target = getReturnTo()
    if (!target) {
      navigate(-1)
      return
    }
    clearReturnTo()
    navigate(target)
  }

  return (
    <div
      id="server-connection-card"
      tabIndex={-1}
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

        {statusVariant === "missing" && !isCompact && (
          <ServerOverviewHint />
        )}

        {!isCompact && statusVariant === "ok" && (
          <>
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
            <p className="mt-1 max-w-sm text-xs text-gray-600 dark:text-gray-300">
              {t(
                "option:connectionCard.connectedCaption",
                "Chat and tools are now available in Options and the sidepanel."
              )}
            </p>
          </>
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
          {statusVariant === "ok" && mode === "demo" ? (
            <Tag color="blue" className="px-4 py-1 text-sm">
              {t(
                "option:connectionCard.demoModeBadge",
                "Demo mode"
              )}
            </Tag>
          ) : statusVariant === "ok" && uxState === "connected_degraded" ? (
            <Tag color="gold" className="px-4 py-1 text-sm">
              {t(
                "option:connectionCard.degradedBadge",
                "Connected · Knowledge limited"
              )}
            </Tag>
          ) : statusVariant === "ok" ? (
            <Tag color="green" className="px-4 py-1 text-sm">
              {t("tldwState.running")}
            </Tag>
          ) : null}
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
          {offlineBypass && (
            <Tag color="gold" className="px-4 py-1 text-xs">
              {t(
                "option:connectionCard.offlineModeBadge",
                "Offline mode — staging only"
              )}
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
          {secondsSinceLastCheck != null &&
            !(phase === ConnectionPhase.SEARCHING && isChecking) && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="h-3.5 w-3.5" />
              {t("tldwState.lastChecked", "Checked {{seconds}}s ago", { seconds: secondsSinceLastCheck })}
            </span>
          )}
        </div>

        {statusVariant === "error" && lastError && (
          <div className="flex flex-col items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={() => setShowErrorDetails((prev) => !prev)}
              className="text-[11px] text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              {showErrorDetails
                ? t("tldwState.hideDetails", "Hide details")
                : t("tldwState.showDetails", "Show details")}
            </button>
            {showErrorDetails && (
              <div className="mt-1 w-full max-w-md rounded-md bg-red-50 px-3 py-2 text-left text-[11px] text-red-700 dark:bg-red-900/30 dark:text-red-200">
                <div className="font-medium">
                  {t(
                    "tldwState.errorDetailsLabel",
                    "Technical details"
                  )}
                </div>
                <div className="mt-1 break-words">
                  {lastError}
                </div>
                {lastStatusCode && (
                  <div className="mt-1">
                    {t(
                      "tldwState.connectionFailedWithCode",
                      "Connection failed (HTTP {{code}})",
                      { code: lastStatusCode }
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
          {(statusVariant === "missing" || statusVariant === "loading") && (
            <Button
              icon={<ExternalLink className="h-4 w-4" />}
              onClick={handleOpenDiagnostics}
              block>
              {diagnosticsLabel}
            </Button>
          )}
          {returnTo && (
            <Button
              onClick={handleReturn}
              block>
              {t("option:connectionCard.backToWorkspace", {
                defaultValue: "Back to workspace"
              })}
            </Button>
          )}
          {enableDemo && statusVariant === "missing" && (
            <Button
              onClick={() => {
                try {
                  setDemoEnabled(true)
                } catch {
                  // ignore demo storage errors
                }
                try {
                  setDemoMode()
                } catch {
                  // ignore connection store failures
                }
              }}
              block>
              {t("option:connectionCard.buttonTryDemo", "Try a demo")}
            </Button>
          )}
          <Button
            type="link"
            icon={<Settings className="h-4 w-4" />}
            onClick={handleOpenSettings}
            block>
            {t("option:connectionCard.buttonChangeServer", "Change server")}
          </Button>
        </div>

        {isCompact && (statusVariant === "missing" || statusVariant === "error") && (
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {t(
              "option:connectionCard.sidepanelOpenSettingsHint",
              "Settings open in a new browser tab so you can configure your tldw server."
            )}
          </p>
        )}

        {(statusVariant === "error" ||
          statusVariant === "missing" ||
          offlineBypass) && (
          <>
            <button
              type="button"
              data-testid="toggle-advanced-troubleshooting"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="mt-1 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400">
              {showAdvanced
                ? t(
                    "option:connectionCard.hideAdvanced",
                    "Hide troubleshooting options"
                  )
                : t(
                    "option:connectionCard.showAdvanced",
                    "More troubleshooting options"
                  )}
            </button>
            {showAdvanced && (
              <div className="flex w-full flex-col gap-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    onClick={
                      offlineBypass
                        ? handleDisableOfflineBypass
                        : handleOfflineBypass
                    }>
                    {offlineBypass
                      ? t(
                          "option:connectionCard.buttonDisableOffline",
                          "Disable offline mode"
                        )
                      : t(
                          "option:connectionCard.buttonContinueOffline",
                          "Continue offline"
                        )}
                  </Button>
                  <Button size="small" onClick={handleOpenQuickIngestIntro}>
                    {t(
                      "option:connectionCard.buttonOpenQuickIngestIntro",
                      "Open Quick Ingest intro"
                    )}
                  </Button>
                  <Button
                    size="small"
                    data-testid="open-quick-ingest"
                    onClick={handleOpenQuickIngest}>
                    {t(
                      "option:connectionCard.buttonOpenQuickIngest",
                      "Open Quick Ingest"
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
                  <Button
                    size="small"
                    onClick={handleOpenDiagnostics}
                    className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200">
                    {t(
                      "settings:healthSummary.diagnostics",
                      "Health & diagnostics"
                    )}
                  </Button>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {t(
                    "option:connectionCard.quickIngestHelpInline",
                    "Tip: The ? icon reopens the Quick Ingest intro. You can stage items offline; they will process after you reconnect."
                  )}
                </div>
                {isSearching && serverHost ? (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t(
                      "option:connectionCard.checkingWithConfig",
                      "Checking {{host}} with your saved API key…",
                      { host: serverHost }
                    )}
                  </div>
                ) : null}
                {offlineHintVisible || offlineBypass ? (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t(
                      "option:connectionCard.quickIngestHint",
                      "When your server is offline, Quick Ingest works as a staging area. You can queue URLs and files now and process them once you reconnect."
                    )}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t(
                      "option:connectionCard.quickIngestInlineHint",
                      "Quick Ingest can queue URLs and files while your server is offline so you can process them once you reconnect."
                    )}
                  </span>
                )}
              </div>
            )}
          </>
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
