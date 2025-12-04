import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip } from "antd"
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

  const openExtensionUrl = (path: string) => {
    try {
      // Prefer opening the extension's options.html directly so users land
      // on the tldw settings page instead of the generic extensions manager.
      // `browser` is provided by the WebExtension polyfill in WXT.
      // @ts-ignore
      if (typeof browser !== "undefined" && browser.runtime?.getURL) {
        // @ts-ignore
        const url = browser.runtime.getURL(path)
        // @ts-ignore
        if (browser.tabs?.create) {
          // @ts-ignore
          browser.tabs.create({ url })
        } else {
          window.open(url, "_blank")
        }
        return
      }
    } catch (err) {
      // Fall through to chrome.* / window.open below.
      console.debug("[EmptySidePanel] openExtensionUrl browser API unavailable:", err)
    }

    try {
      // @ts-ignore
      if (chrome?.runtime?.getURL) {
        // @ts-ignore
        const url = chrome.runtime.getURL(path)
        window.open(url, "_blank")
        return
      }
      // @ts-ignore
      if (chrome?.runtime?.openOptionsPage && path.includes("/options.html")) {
        // @ts-ignore
        chrome.runtime.openOptionsPage()
        return
      }
    } catch (err) {
      // ignore and fall back to plain window.open
      console.debug("[EmptySidePanel] openExtensionUrl chrome API unavailable:", err)
    }

    window.open(path, "_blank")
  }

  const showConnectionCard = !isConnectionReady
  const host = serverUrl ? cleanUrl(serverUrl) : "tldw_server"

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
    openExtensionUrl("/options.html#/")
  }

  const handleQuickIngest = () => {
    if (!isConnectionReady) {
      return
    }
    window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest"))
  }

  const bannerHeading = (() => {
    if (uxState === "error_auth") {
      return t(
        "option:connectionCard.headlineErrorAuth",
        "API key needs attention"
      )
    }
    if (uxState === "error_unreachable") {
      return t(
        "option:connectionCard.headlineError",
        "Can’t reach your tldw server"
      )
    }
    return t(
      "option:connectionCard.headlineMissing",
      "Connect tldw Assistant to your server"
    )
  })()

  const bannerBody = (() => {
    if (uxState === "error_auth") {
      return t(
        "option:connectionCard.descriptionErrorAuth",
        "Your server is up but the API key is wrong or missing. Fix the key in Settings → tldw server, then retry."
      )
    }
    if (uxState === "error_unreachable") {
      return t(
        "option:connectionCard.descriptionError",
        "We couldn’t reach {{host}}. Check that your tldw_server is running and that your browser can reach it, then open diagnostics or update the URL.",
        { host }
      )
    }
    return t(
      "option:connectionCard.descriptionMissing",
      "tldw_server is your private AI workspace that keeps chats, notes, and media on your own machine. Add your server URL to get started."
    )
  })()

  if (showConnectionCard) {
    return (
      <div className="mt-4 flex w-full flex-col items-stretch gap-3 px-3">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500 dark:bg-[#2a2310] dark:text-amber-100">
          <div className="flex-1 space-y-1">
            <p className="font-medium">{bannerHeading}</p>
            <p className="text-[11px] leading-snug">{bannerBody}</p>
          </div>
          <button
            type="button"
            onClick={openOnboarding}
            className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100 dark:bg-[#3a2b10] dark:text-amber-50 dark:hover:bg-[#4a3512]"
          >
            {t(
              "sidepanel:firstRun.openOptionsPrimary",
              "Finish setup in Options"
            )}
          </button>
        </div>
        {stepSummary && (
          <p className="px-1 text-[11px] text-gray-600 dark:text-gray-300">
            {stepSummary}
          </p>
        )}
      </div>
    )
  }

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
          title={t("playground:tooltip.quickIngest", {
            defaultValue:
              "Stage URLs and files for processing, even while your server is offline."
          })}
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
