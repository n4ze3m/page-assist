import { getOllamaURL, isOllamaRunning } from "../services/ollama"
import { browser } from "wxt/browser"
import { setBadgeBackgroundColor, setBadgeText, setTitle } from "@/utils/action"

const progressHuman = (completed: number, total: number) => {
  return ((completed / total) * 100).toFixed(0) + "%"
}

const clearBadge = () => {
  setBadgeText({ text: "" })
  setTitle({ title: "" })
}
const streamDownload = async (url: string, model: string) => {
  url += "/api/pull"
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, stream: true })
  })

  const reader = response.body?.getReader()

  const decoder = new TextDecoder()

  let isSuccess = true
  while (true) {
    if (!reader) {
      break
    }
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const text = decoder.decode(value)
    try {
      const json = JSON.parse(text.trim()) as {
        status: string
        total?: number
        completed?: number
      }
      if (json.total && json.completed) {
        setBadgeText({
          text: progressHuman(json.completed, json.total)
        })
        setBadgeBackgroundColor({ color: "#0000FF" })
      } else {
        setBadgeText({ text: "🏋️‍♂️" })
        setBadgeBackgroundColor({ color: "#FFFFFF" })
      }

      setTitle({ title: json.status })

      if (json.status === "success") {
        isSuccess = true
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (isSuccess) {
    setBadgeText({ text: "✅" })
    setBadgeBackgroundColor({ color: "#00FF00" })
    setTitle({ title: "Model pulled successfully" })
  } else {
    setBadgeText({ text: "❌" })
    setBadgeBackgroundColor({ color: "#FF0000" })
    setTitle({ title: "Model pull failed" })
  }

  setTimeout(() => {
    clearBadge()
  }, 5000)
}

export default defineBackground({
  main() {
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === "sidepanel") {
        await browser.sidebarAction.open()
      } else if (message.type === "pull_model") {
        const ollamaURL = await getOllamaURL()

        const isRunning = await isOllamaRunning()

        if (!isRunning) {
          setBadgeText({ text: "E" })
          setBadgeBackgroundColor({ color: "#FF0000" })
          setTitle({ title: "Ollama is not running" })
          setTimeout(() => {
            clearBadge()
          }, 5000)
        }

        await streamDownload(ollamaURL, message.modelName)
      }
    })

    if (import.meta.env.BROWSER === "chrome") {
      chrome.action.onClicked.addListener((tab) => {
        chrome.tabs.create({ url: chrome.runtime.getURL("/options.html") })
      })
    } else {
      browser.browserAction.onClicked.addListener((tab) => {
        console.log("browser.browserAction.onClicked.addListener")
        browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
      })
    }

    const contextMenuTitle = {
      webUi: browser.i18n.getMessage("openOptionToChat"),
      sidePanel: browser.i18n.getMessage("openSidePanelToChat")
    }

    const contextMenuId = {
      webUi: "open-web-ui-pa",
      sidePanel: "open-side-panel-pa"
    }

    browser.contextMenus.create({
      id: contextMenuId["sidePanel"],
      title: contextMenuTitle["sidePanel"],
      contexts: ["all"]
    })
    if (import.meta.env.BROWSER === "chrome") {
      browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "open-side-panel-pa") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })
        } else if (info.menuItemId === "open-web-ui-pa") {
          browser.tabs.create({
            url: browser.runtime.getURL("/options.html")
          })
        }
      })

      browser.commands.onCommand.addListener((command) => {
        switch (command) {
          case "execute_side_panel":
            chrome.tabs.query(
              { active: true, currentWindow: true },
              async (tabs) => {
                const tab = tabs[0]
                chrome.sidePanel.open({
                  tabId: tab.id!
                })
              }
            )
            break
          default:
            break
        }
      })
    }

    if (import.meta.env.BROWSER === "firefox") {
      browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "open-side-panel-pa") {
          browser.sidebarAction.toggle()
        } else if (info.menuItemId === "open-web-ui-pa") {
          browser.tabs.create({
            url: browser.runtime.getURL("/options.html")
          })
        }
      })

      browser.commands.onCommand.addListener((command) => {
        switch (command) {
          case "execute_side_panel":
            browser.sidebarAction.toggle()
            break
          default:
            break
        }
      })
    }
  },
  persistent: true
})
