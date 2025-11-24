import { browser } from "wxt/browser"

export const ensureSidepanelOpen = (tabId?: number) => {
  try {
    if (typeof chrome !== "undefined" && chrome?.sidePanel?.open && tabId) {
      chrome.sidePanel.open({ tabId })
      return
    }
    const sidebar: any = (browser as any)?.sidebarAction
    if (sidebar?.open) {
      sidebar.open()
      return
    }
    if (sidebar?.toggle) {
      sidebar.toggle()
    }
  } catch {
    // no-op
  }
}

export const pickFirstString = (value: any, keys: string[]): string | null => {
  if (!value) return null
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickFirstString(item, keys)
      if (found) return found
    }
    return null
  }
  if (typeof value === "object") {
    for (const key of keys) {
      const maybe = (value as any)[key]
      if (typeof maybe === "string" && maybe.trim().length > 0) {
        return maybe.trim()
      }
    }
    for (const v of Object.values(value)) {
      const found = pickFirstString(v, keys)
      if (found) return found
    }
  }
  return null
}

export const extractTranscriptionPieces = (data: any): { transcript: string | null; summary: string | null } => {
  const transcript = pickFirstString(data, ["transcript", "transcription", "text", "raw_text", "content"])
  const summary = pickFirstString(data, ["summary", "analysis", "overview", "abstract"])
  return { transcript, summary }
}

export const clampText = (value: string | null, max = 8000): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

export const notify = (title: string, message: string) => {
  try {
    if (typeof chrome !== "undefined" && chrome.notifications?.create) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "/icon.png",
        title,
        message
      })
      return
    }
    browser.notifications?.create?.({
      type: "basic",
      iconUrl: "/icon.png",
      title,
      message
    })
  } catch {
    // ignore notification errors
  }
}
