import React from "react"
import { useTranslation } from "react-i18next"
import { ServerConnectionCard } from "@/components/Common/ServerConnectionCard"
import { useConnectionState } from "@/hooks/useConnectionState"
import { ConnectionPhase } from "@/types/connection"
import { cleanUrl } from "@/libs/clean-url"

export const EmptySidePanel = () => {
  const { t } = useTranslation(["sidepanel", "settings"])
  const { phase, isConnected, serverUrl } = useConnectionState()

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

  if (showConnectionCard) {
    return (
      <ServerConnectionCard onOpenSettings={openSettings} showToastOnError />
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
