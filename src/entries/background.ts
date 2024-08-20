import { getOllamaURL, isOllamaRunning } from "../services/ollama"
import { browser } from "wxt/browser"
import { clearBadge, streamDownload } from "@/utils/pull-ollama"

export default defineBackground({
  main() {
    let isCopilotRunning: boolean = false
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

    if (import.meta.env.BROWSER === "chrome") {
      browser.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId === "open-side-panel-pa") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })
        } else if (info.menuItemId === "open-web-ui-pa") {
          browser.tabs.create({
            url: browser.runtime.getURL("/options.html")
          })
        } else if (info.menuItemId === "summarize-pa") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })
          // this is a bad method hope somone can fix it :)
          setTimeout(async () => {
            await browser.runtime.sendMessage({
              from: "background",
              type: "summary",
              text: info.selectionText
            })
          }, isCopilotRunning ? 0 : 5000)

        } else if (info.menuItemId === "rephrase-pa") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })
          setTimeout(async () => {

            await browser.runtime.sendMessage({
              type: "rephrase",
              from: "background",
              text: info.selectionText
            })
          }, isCopilotRunning ? 0 : 5000)

        } else if (info.menuItemId === "translate-pg") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })

          setTimeout(async () => {
            await browser.runtime.sendMessage({
              type: "translate",
              from: "background",
              text: info.selectionText
            })
          }, isCopilotRunning ? 0 : 5000)
        } else if (info.menuItemId === "explain-pa") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })

          setTimeout(async () => {
            await browser.runtime.sendMessage({
              type: "explain",
              from: "background",
              text: info.selectionText
            })
          }, isCopilotRunning ? 0 : 5000)
        } else if (info.menuItemId === "custom-pg") {
          chrome.sidePanel.open({
            tabId: tab.id!
          })

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
    }
  },
  persistent: true
})
