import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip } from "antd"
import { ServerConnectionCard } from "@/components/Common/ServerConnectionCard"
import {
  useConnectionState,
  useConnectionUxState
} from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { cleanUrl } from "@/libs/clean-url"

export const EmptySidePanel = () => {
  const { t } = useTranslation(["sidepanel", "settings", "option", "playground"])
  const { phase, isConnected, serverUrl } = useConnectionState()
  const { uxState, mode, configStep, hasCompletedFirstRun } =
    useConnectionUxState()
  const isConnectionReady =
    isConnected && phase === ConnectionPhase.CONNECTED

  const openSettings = () => {
    try {
      // Prefer opening the extension's options.html directly so users land
      // on the tldw settings page instead of the generic extensions manager.
      // `browser` is provided by the WebExtension polyfill in WXT.
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

  const showConnectionCard = !isConnectionReady

  const totalSteps = 3
  const activeStep = (() => {
    if (configStep === "url") return 1
    if (configStep === "auth") return 2
    if (configStep === "health") return 3
    if (uxState === "configuring_url" || uxState === "unconfigured") return 1
    if (uxState === "configuring_auth") return 2
    if (
      uxState === "testing" ||
      uxState === "connected_ok" ||
      uxState === "connected_degraded" ||
      uxState === "error_auth" ||
      uxState === "error_unreachable"
    ) {
      return 3
    }
    return 1
  })()

  const stepSummary = (() => {
    if (hasCompletedFirstRun) return null
    if (activeStep === 1) {
      return t(
        "sidepanel:firstRun.step1",
        "Step 1 of 3 — Add your server URL in Options → tldw Server."
      )
    }
    if (activeStep === 2) {
      return t(
        "sidepanel:firstRun.step2",
        "Step 2 of 3 — Add your API key or log in on the tldw Server settings page."
      )
    }
    return t(
      "sidepanel:firstRun.step3",
      "Step 3 of 3 — Check connection & Knowledge in Health & diagnostics."
    )
  })()

  const openOnboarding = () => {
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
      // ignore and fall through
    }

    try {
      // @ts-ignore
      if (chrome?.runtime?.getURL) {
        // @ts-ignore
        const url = chrome.runtime.getURL("/options.html#/")
        window.open(url, "_blank")
        return
      }
    } catch {
      // ignore
    }

    window.open("/options.html#/", "_blank")
  }

  const handleQuickIngest = () => {
    if (!isConnectionReady) {
      return
    }
    window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest"))
  }

  if (showConnectionCard) {
    return (
      <div className="mt-2 flex w-full flex-col items-stretch gap-3">
        <ServerConnectionCard
          onOpenSettings={openSettings}
          variant="compact"
        />
        <p className="px-3 text-[11px] text-gray-600 dark:text-gray-300">
          {t(
            "sidepanel:firstRun.finishInOptions",
            "Finish setup in the full Options view. Once connected, this sidepanel will unlock so you can chat while you browse."
          )}
        </p>
        {stepSummary && (
          <p className="px-3 text-[11px] text-gray-500 dark:text-gray-400">
            {stepSummary}
          </p>
        )}
        <div className="px-3 pb-1">
          <button
            type="button"
            onClick={openOnboarding}
            className="text-[11px] text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {t(
              "sidepanel:firstRun.openOptions",
              "Open setup in Options"
            )}
          </button>
        </div>
      </div>
    )
  }

  const host = serverUrl ? cleanUrl(serverUrl) : "tldw_server"

  return (
    <div className="mt-4 w-full px-6">
      {mode === "demo" ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-800 dark:border-blue-400 dark:bg-[#102538] dark:text-blue-50">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          <span>
            {t(
              "sidepanel:connectedHintDemo",
              "Demo mode: sample workspace — chats may be cleared when you reset."
            )}
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-800 dark:border-green-500 dark:bg-[#102a10] dark:text-green-100">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          <span>
            {t(
              "sidepanel:connectedHint",
              "Connected to {{host}}. Start chatting below.",
              { host }
            )}
          </span>
        </div>
      )}
      <div className="mt-3">
        <Tooltip
          placement="bottom"
          title={t(
            "playground:tooltip.quickIngest",
            "Stage URLs and files for processing, even while your server is offline."
          )}
        >
          <Button
            type="default"
            size="small"
            block
            onClick={handleQuickIngest}
            disabled={!isConnectionReady}
            aria-disabled={!isConnectionReady}
            aria-label={t(
              "sidepanel:quickIngestAria",
              "Open Quick ingest to add media"
            )}
          >
            {t("option:header.quickIngest", "Quick ingest")}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
