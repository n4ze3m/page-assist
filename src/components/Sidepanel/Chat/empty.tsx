import React from "react"
import { ServerConnectionCard } from "@/components/Common/ServerConnectionCard"

export const EmptySidePanel = () => {
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

  return <ServerConnectionCard onOpenSettings={openSettings} showToastOnError />
}
