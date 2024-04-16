import { getOllamaURL, isOllamaRunning } from "../services/ollama"
import { Storage } from "@plasmohq/storage"

const progressHuman = (completed: number, total: number) => {
  return ((completed / total) * 100).toFixed(0) + "%"
}

const clearBadge = () => {
  chrome.action.setBadgeText({ text: "" })
  chrome.action.setTitle({ title: "" })
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
        chrome.action.setBadgeText({
          text: progressHuman(json.completed, json.total)
        })
        chrome.action.setBadgeBackgroundColor({ color: "#0000FF" })
      } else {
        chrome.action.setBadgeText({ text: "🏋️‍♂️" })
        chrome.action.setBadgeBackgroundColor({ color: "#FFFFFF" })
      }

      chrome.action.setTitle({ title: json.status })

      if (json.status === "success") {
        isSuccess = true
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (isSuccess) {
    chrome.action.setBadgeText({ text: "✅" })
    chrome.action.setBadgeBackgroundColor({ color: "#00FF00" })
    chrome.action.setTitle({ title: "Model pulled successfully" })
  } else {
    chrome.action.setBadgeText({ text: "❌" })
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" })
    chrome.action.setTitle({ title: "Model pull failed" })
  }

  setTimeout(() => {
    clearBadge()
  }, 5000)
}
export default defineBackground({
  main() {
    const storage = new Storage()

    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.type === "sidepanel") {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async (tabs) => {
            const tab = tabs[0]
            chrome.sidePanel.open({
              // tabId: tab.id!,
              windowId: tab.windowId!
            })
          }
        )
      } else if (message.type === "pull_model") {
        const ollamaURL = await getOllamaURL()

        const isRunning = await isOllamaRunning()

        if (!isRunning) {
          chrome.action.setBadgeText({ text: "E" })
          chrome.action.setBadgeBackgroundColor({ color: "#FF0000" })
          chrome.action.setTitle({ title: "Ollama is not running" })
          setTimeout(() => {
            clearBadge()
          }, 5000)
        }

        await streamDownload(ollamaURL, message.modelName)
      }
    })

    chrome.action.onClicked.addListener((tab) => {
      chrome.tabs.create({ url: chrome.runtime.getURL("options.html") })
    })

    chrome.commands.onCommand.addListener((command) => {
      switch (command) {
        case "execute_side_panel":
          chrome.tabs.query(
            { active: true, currentWindow: true },
            async (tabs) => {
              const tab = tabs[0]
              chrome.sidePanel.open({
                windowId: tab.windowId!
              })
            }
          )
          break
        default:
          break
      }
    })

    chrome.contextMenus.create({
      id: "open-side-panel-pa",
      title: browser.i18n.getMessage("openSidePanelToChat"),
      contexts: ["all"]
    })

    chrome.contextMenus.onClicked.addListener((info, tab) => {
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
  },
  persistent: true
})
