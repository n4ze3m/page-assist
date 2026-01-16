import { browser } from "wxt/browser"

// Runtime detection for Firefox
const isFirefox = navigator.userAgent.includes("Firefox")

export const useBrowserApi = () => {
  return {
    tabs: browser.tabs,
    storage: browser.storage,
    sidePanel: isFirefox
      ? {
          open: async (options: { tabId: number }) => {
            // Firefox uses sidebarAction.open, but it doesn't take tabId
            await browser.sidebarAction.open()
          },
          // Add toggle if needed
          toggle: async () => {
            await browser.sidebarAction.toggle()
          }
        }
      : chrome.sidePanel,
    contextMenus: browser.contextMenus,
    runtime: browser.runtime,
    notifications: browser.notifications,
    action: isFirefox ? browser.browserAction : chrome.action
    // Add more as needed
  }
}
