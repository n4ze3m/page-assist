import { browser } from "wxt/browser"

export const setTitle = ({ title }: { title: string }) => {
  if (import.meta.env.BROWSER === "chrome" || import.meta.env.BROWSER === "edge") {
    chrome.action.setTitle({ title })
  } else {
    browser.browserAction.setTitle({ title })
  }
}

export const setBadgeBackgroundColor = ({ color }: { color: string }) => {
  if (import.meta.env.BROWSER === "chrome" || import.meta.env.BROWSER === "edge") {
    chrome.action.setBadgeBackgroundColor({ color })
  } else {
    browser.browserAction.setBadgeBackgroundColor({ color })
  }
}

export const setBadgeText = ({ text }: { text: string }) => {
  if (import.meta.env.BROWSER === "chrome" || import.meta.env.BROWSER === "edge") {
    chrome.action.setBadgeText({ text })
  } else {
    browser.browserAction.setBadgeText({ text })
  }
}
