import { getOllamaURL, isOllamaRunning } from "../services/ollama"
import { browser } from "wxt/browser"
import { clearBadge, streamDownload, cancelDownload } from "@/utils/pull-ollama"
import { Storage } from "@plasmohq/storage"
import { getInitialConfig } from "@/services/action"
import { getCustomCopilotPrompts, getCopilotPromptsEnabledState, type CustomCopilotPrompt } from "@/services/application"

export default defineBackground({
  main() {
    const storage = new Storage({
      area: "local"
    })
    let isCopilotRunning: boolean = false
    let actionIconClick: string = "webui"
    let contextMenuClick: string = "sidePanel"

    let customCopilotMenuIds: string[] = []
    const builtinCopilotMenus = [
      { id: "summarize-pa", key: "summary", title: "Summarize" },
      { id: "explain-pa", key: "explain", title: "Explain" },
      { id: "rephrase-pa", key: "rephrase", title: "Rephrase" },
      { id: "translate-pg", key: "translate", title: "Translate" },
      { id: "custom-pg", key: "custom", title: "Custom" }
    ]

    const createBuiltinCopilotMenus = async () => {
      const enabledState = await getCopilotPromptsEnabledState()

      for (const menu of builtinCopilotMenus) {
        // Remove existing menu
        try {
          await browser.contextMenus.remove(menu.id)
        } catch (e) {
          // Menu might not exist, ignore
        }

        // Create menu only if enabled
        if (enabledState[menu.key]) {
          browser.contextMenus.create({
            id: menu.id,
            title: menu.title,
            contexts: ["selection"]
          })
        }
      }
    }

    const createCustomCopilotMenus = async () => {
      // Remove existing custom copilot menus
      for (const menuId of customCopilotMenuIds) {
        try {
          await browser.contextMenus.remove(menuId)
        } catch (e) {
          // Menu might not exist, ignore
        }
      }
      customCopilotMenuIds = []

      // Create new custom copilot menus
      const customPrompts = await getCustomCopilotPrompts()
      const enabledPrompts = customPrompts.filter(p => p.enabled)

      for (const prompt of enabledPrompts) {
        const menuId = `custom_copilot_${prompt.id}`
        customCopilotMenuIds.push(menuId)
        browser.contextMenus.create({
          id: menuId,
          title: prompt.title,
          contexts: ["selection"]
        })
      }
    }

    const initialize = async () => {
      try {
        storage.watch({
          actionIconClick: (value) => {
            const oldValue = value?.oldValue || "webui"
            const newValue = value?.newValue || "webui"
            if (oldValue !== newValue) {
              actionIconClick = newValue
            }
          },
          contextMenuClick: (value) => {
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
          },
          customCopilotPrompts: async () => {
            // Recreate custom copilot menus when prompts change
            await createCustomCopilotMenus()
          },
          youtubeAutoSummarize: async (value) => {
            const newValue = value?.newValue || false
            const tabs = await browser.tabs.query({
              url: "*://www.youtube.com/watch*"
            })
            tabs.forEach((tab) => {
              if (tab.id) {
                browser.tabs
                  .sendMessage(tab.id, {
                    type: "youtube_summarize_setting_changed",
                    enabled: newValue
                  })
                  .catch(() => {})
              }
            })
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

        // Create built-in copilot menus
        await createBuiltinCopilotMenus()

        // Create custom copilot menus
        await createCustomCopilotMenus()
      } catch (error) {
        console.error("Error in initLogic:", error)
      }
    }

    browser.runtime.onMessage.addListener(async (message, sender) => {
      if (message.type === "refresh_custom_copilot_menus") {
        await createCustomCopilotMenus()
        return Promise.resolve({ success: true })
      } else if (message.type === "refresh_builtin_copilot_menus") {
        await createBuiltinCopilotMenus()
        return Promise.resolve({ success: true })
      } else if (message.type === "check_youtube_summarize_enabled") {
        const enabled = await storage.get("youtubeAutoSummarize")
        return Promise.resolve({ enabled: enabled || false })
      } else if (message.type === "sidepanel") {
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
          return
        }

        await streamDownload(ollamaURL, message.modelName)
      } else if (message.type === "cancel_download") {
        cancelDownload()
      } else if (message.type === "youtube_summarize") {
        if (sender.tab?.id) {
          await browser.sidebarAction.open()
        }

        setTimeout(
          async () => {
            const prompt = `Summarize this YouTube video: "${message.videoTitle}".\n\nPlease provide a comprehensive summary of the video content.`

            await browser.runtime.sendMessage({
              from: "background",
              type: "yt_summarize",
              text: prompt
            })
          },
          isCopilotRunning ? 0 : 5000
        )
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
        setTimeout(
          async () => {
            await browser.runtime.sendMessage({
              from: "background",
              type: "summary",
              text: info.selectionText
            })
          },
          isCopilotRunning ? 0 : 5000
        )
      } else if (info.menuItemId === "rephrase-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(
          async () => {
            await browser.runtime.sendMessage({
              type: "rephrase",
              from: "background",
              text: info.selectionText
            })
          },
          isCopilotRunning ? 0 : 5000
        )
      } else if (info.menuItemId === "translate-pg") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(
          async () => {
            await browser.runtime.sendMessage({
              type: "translate",
              from: "background",
              text: info.selectionText
            })
          },
          isCopilotRunning ? 0 : 5000
        )
      } else if (info.menuItemId === "explain-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(
          async () => {
            await browser.runtime.sendMessage({
              type: "explain",
              from: "background",
              text: info.selectionText
            })
          },
          isCopilotRunning ? 0 : 5000
        )
      } else if (info.menuItemId === "custom-pg") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(
          async () => {
            await browser.runtime.sendMessage({
              type: "custom",
              from: "background",
              text: info.selectionText
            })
          },
          isCopilotRunning ? 0 : 5000
        )
      } else if (typeof info.menuItemId === "string" && info.menuItemId.startsWith("custom_copilot_")) {
        // Handle custom copilot prompts
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
        }
        setTimeout(
          async () => {
            await browser.runtime.sendMessage({
              type: info.menuItemId,
              from: "background",
              text: info.selectionText
            })
          },
          isCopilotRunning ? 0 : 5000
        )
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
