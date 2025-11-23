import React from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip } from "antd"
import { ServerConnectionCard } from "@/components/Common/ServerConnectionCard"
import { useConnectionState } from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { cleanUrl } from "@/libs/clean-url"

export const EmptySidePanel = () => {
  const { t } = useTranslation(["sidepanel", "settings", "option"])
  const { phase, isConnected, serverUrl } = useConnectionState()
  const isConnectionReady = isConnected && phase === ConnectionPhase.CONNECTED

  const openSettings = () => {
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

  const showConnectionCard =
    !isConnected || phase !== ConnectionPhase.CONNECTED

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
        <div className="px-6">
          <Tooltip
            placement="bottom"
            title={
              isConnectionReady
                ? t(
                    "sidepanel:quickIngestHint",
                    "Upload URLs or files to your tldw server."
                  )
                : t(
                    "sidepanel:quickIngestDisabled",
                    "Connect to your tldw server in Options to use Quick ingest here."
                  )
            }
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
    </div>
  )
}
