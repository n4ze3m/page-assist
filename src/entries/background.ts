import { getOllamaURL, isOllamaRunning } from "../services/ollama"
import { browser } from "wxt/browser"

const progressHuman = (completed: number, total: number) => {
  return ((completed / total) * 100).toFixed(0) + "%"
}

const clearBadge = () => {
  browser.action.setBadgeText({ text: "" })
  browser.action.setTitle({ title: "" })
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
        browser.action.setBadgeText({
          text: progressHuman(json.completed, json.total)
        })
        browser.action.setBadgeBackgroundColor({ color: "#0000FF" })
      } else {
        browser.action.setBadgeText({ text: "🏋️‍♂️" })
        browser.action.setBadgeBackgroundColor({ color: "#FFFFFF" })
      }

      browser.action.setTitle({ title: json.status })

      if (json.status === "success") {
        isSuccess = true
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (isSuccess) {
    browser.action.setBadgeText({ text: "✅" })
    browser.action.setBadgeBackgroundColor({ color: "#00FF00" })
    browser.action.setTitle({ title: "Model pulled successfully" })
  } else {
    browser.action.setBadgeText({ text: "❌" })
    browser.action.setBadgeBackgroundColor({ color: "#FF0000" })
    browser.action.setTitle({ title: "Model pull failed" })
  }

  setTimeout(() => {
    clearBadge()
  }, 5000)
}
export default defineBackground({
  main() {
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === "sidepanel") {
        browser.sidebarAction.open()
      } else if (message.type === "pull_model") {
        const ollamaURL = await getOllamaURL()

        const isRunning = await isOllamaRunning()

        if (!isRunning) {
          browser.action.setBadgeText({ text: "E" })
          browser.action.setBadgeBackgroundColor({ color: "#FF0000" })
          browser.action.setTitle({ title: "Ollama is not running" })
          setTimeout(() => {
            clearBadge()
          }, 5000)
        }

        await streamDownload(ollamaURL, message.modelName)
      }
    })

    if (browser?.action) {
      browser.action.onClicked.addListener((tab) => {
        console.log("browser.action.onClicked.addListener")
        browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
      })
    } else {
      browser.browserAction.onClicked.addListener((tab) => {
        console.log("browser.browserAction.onClicked.addListener")
        browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
      })
    }

    browser.contextMenus.create({
      id: "open-side-panel-pa",
      title: browser.i18n.getMessage("openSidePanelToChat"),
      contexts: ["all"]
    })
    if (import.meta.env.BROWSER === "chrome") {
      browser.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "open-side-panel-pa") {
          chrome.tabs.query(
            { active: true, currentWindow: true },
            async (tabs) => {
              const tab = tabs[0]
              chrome.sidePanel.open({
                tabId: tab.id!
              })
            }
          )
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
