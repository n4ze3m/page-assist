import { getOllamaURL, isOllamaRunning } from "../services/ollama"
import { browser } from "wxt/browser"
import { clearBadge, streamDownload } from "@/utils/pull-ollama"
import { Storage } from "@plasmohq/storage"
import { getInitialConfig } from "@/services/action"

export default defineBackground({
  main() {
    const storage = new Storage({
      area: "local"
    })
    let isCopilotRunning: boolean = false
    let actionIconClick: string = "webui"
    let contextMenuClick: string = "sidePanel"

    const initialize = async () => {
      try {
        storage.watch({
          "actionIconClick": (value) => {
            const oldValue = value?.oldValue || "webui"
            const newValue = value?.newValue || "webui"
            if (oldValue !== newValue) {
              actionIconClick = newValue
            }
          },
          "contextMenuClick": (value) => {
            const oldValue = value?.oldValue || "sidePanel"
            const newValue = value?.newValue || "sidePanel"
            if (oldValue !== newValue) {
              contextMenuClick = newValue
              browser.contextMenus.remove(contextMenuId[oldValue])
              browser.contextMenus.create({
                id: contextMenuId[newValue],
                title: contextMenuTitle[newValue],
                contexts: ["page", "selection"]
              })
            }
          }
        })
        const data = await getInitialConfig()
        contextMenuClick = data.contextMenuClick
        actionIconClick = data.actionIconClick
        browser.contextMenus.create({
          id: contextMenuId[contextMenuClick],
          title: contextMenuTitle[contextMenuClick],
          contexts: ["page", "selection"]
        })
        browser.contextMenus.create({
          id: "summarize-pa",
          title: browser.i18n.getMessage("contextSummarize"),
          contexts: ["selection"]
        })
    
        browser.contextMenus.create({
          id: "explain-pa",
          title: browser.i18n.getMessage("contextExplain"),
          contexts: ["selection"]
        })
    
        browser.contextMenus.create({
          id: "rephrase-pa",
          title: browser.i18n.getMessage("contextRephrase"),
          contexts: ["selection"]
        })
    
        browser.contextMenus.create({
          id: "translate-pg",
          title: browser.i18n.getMessage("contextTranslate"),
          contexts: ["selection"]
        })
    
        browser.contextMenus.create({
          id: "custom-pg",
          title: browser.i18n.getMessage("contextCustom"),
          contexts: ["selection"]
        })
    
      } catch (error) {
        console.error("Error in initLogic:", error)
      }
    }


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

    browser.runtime.onConnect.addListener((port) => {
      if (port.name === "pgCopilot") {
        isCopilotRunning = true
        port.onDisconnect.addListener(() => {
          isCopilotRunning = false
        })
      }
    })

    browser.browserAction.onClicked.addListener((tab) => {
      if (actionIconClick === "webui") {
        browser.tabs.create({ url: browser.runtime.getURL("/options.html") })
      } else {
        browser.sidebarAction.toggle()
      }
    })

    const contextMenuTitle = {
      webui: browser.i18n.getMessage("openOptionToChat"),
      sidePanel: browser.i18n.getMessage("openSidePanelToChat")
    }

    const contextMenuId = {
      webui: "open-web-ui-pa",
      sidePanel: "open-side-panel-pa"
    }


    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "open-side-panel-pa") {
        browser.sidebarAction.toggle()
      } else if (info.menuItemId === "open-web-ui-pa") {
        browser.tabs.create({
          url: browser.runtime.getURL("/options.html")
        })
      } else if (info.menuItemId === "summarize-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            from: "background",
            type: "summary",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 5000)
      } else if (info.menuItemId === "rephrase-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "rephrase",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 5000)
      } else if (info.menuItemId === "translate-pg") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "translate",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 5000)
      } else if (info.menuItemId === "explain-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "explain",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 5000)
      } else if (info.menuItemId === "custom-pg") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "custom",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 5000)
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

    initialize()

  },
  persistent: true
})
