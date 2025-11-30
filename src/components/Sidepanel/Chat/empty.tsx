import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip } from "antd"
import { ServerConnectionCard } from "@/components/Common/ServerConnectionCard"
import { useConnectionState } from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { cleanUrl } from "@/libs/clean-url"

export const EmptySidePanel = () => {
  const { t } = useTranslation(["sidepanel", "settings", "option", "playground"])
  const { phase, isConnected, serverUrl } = useConnectionState()
  const isConnectionReady = isConnected && phase === ConnectionPhase.CONNECTED

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

  const showConnectionCard =
    !isConnectionReady

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
      </div>
    )
  }

  const host = serverUrl ? cleanUrl(serverUrl) : "tldw_server"

  return (
    <div className="mt-4 w-full px-6">
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
      <div className="mt-3">
        <Tooltip
          placement="bottom"
          title={t(
            "playground:tooltip.quickIngest",
            t(
              "sidepanel:quickIngestHint",
              "Stage URLs and files for processing, even while your server is offline."
            )
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
