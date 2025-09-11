import { browser } from "wxt/browser"
import { Storage } from "@plasmohq/storage"
import { getInitialConfig } from "@/services/action"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { tldwAuth } from "@/services/tldw/TldwAuth"

export default defineBackground({
  main() {
    const storage = new Storage({
      area: "local"
    })
    let isCopilotRunning: boolean = false
    let actionIconClick: string = "webui"
    let contextMenuClick: string = "sidePanel"
    const contextMenuId = {
      webui: "open-web-ui-pa",
      sidePanel: "open-side-panel-pa"
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


    let refreshInFlight: Promise<any> | null = null

    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === "sidepanel") {
        await browser.sidebarAction.open()
      } else if (message.type === 'tldw:request') {
        const { path, method = 'GET', headers = {}, body } = message.payload || {}
        const storage = new Storage({ area: 'local' })
        const cfg = await storage.get<any>('tldwConfig')
        if (!cfg?.serverUrl) {
          return { ok: false, status: 400, error: 'tldw server not configured' }
        }
        const baseUrl = String(cfg.serverUrl).replace(/\/$/, '')
        const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
        const authHeaders: Record<string, string> = {}
        if (cfg.authMode === 'single-user' && cfg.apiKey) {
          authHeaders['X-API-KEY'] = cfg.apiKey
        } else if (cfg.authMode === 'multi-user' && cfg.accessToken) {
          authHeaders['Authorization'] = `Bearer ${cfg.accessToken}`
        }
        const h = { ...headers, ...authHeaders }
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 60000)
          let resp = await fetch(url, {
            method,
            headers: h,
            body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
            signal: controller.signal
          })
          clearTimeout(timeout)
          // Handle 401 with single-flight refresh (multi-user)
          if (resp.status === 401 && cfg.authMode === 'multi-user' && cfg.refreshToken) {
            if (!refreshInFlight) {
              refreshInFlight = (async () => {
                try { await tldwAuth.refreshToken() } finally { refreshInFlight = null }
              })()
            }
            try { await refreshInFlight } catch {}
            const updated = await storage.get<any>('tldwConfig')
            const retryHeaders = { ...headers }
            if (updated?.accessToken) retryHeaders['Authorization'] = `Bearer ${updated.accessToken}`
            const retryController = new AbortController()
            const retryTimeout = setTimeout(() => retryController.abort(), 60000)
            resp = await fetch(url, {
              method,
              headers: retryHeaders,
              body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
              signal: retryController.signal
            })
            clearTimeout(retryTimeout)
          }
          const contentType = resp.headers.get('content-type') || ''
          let data: any = null
          if (contentType.includes('application/json')) {
            data = await resp.json().catch(() => null)
          } else {
            data = await resp.text().catch(() => null)
          }
          return { ok: resp.ok, status: resp.status, data }
        } catch (e: any) {
          return { ok: false, status: 0, error: e?.message || 'Network error' }
        }
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

    chrome.action.onClicked.addListener((tab) => {
      if (actionIconClick === "webui") {
        chrome.tabs.create({ url: chrome.runtime.getURL("/options.html") })
      } else {
        chrome.sidePanel.open({
          tabId: tab.id!
        })
      }
    })

    const contextMenuTitle = {
      webui: browser.i18n.getMessage("openOptionToChat"),
      sidePanel: browser.i18n.getMessage("openSidePanelToChat")
    }

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "open-side-panel-pa") {
        chrome.sidePanel.open({
          tabId: tab.id!
        })
      } else if (info.menuItemId === "open-web-ui-pa") {
        browser.tabs.create({
          url: browser.runtime.getURL("/options.html")
        })
      } else if (info.menuItemId === "send-to-tldw") {
        try {
          const pageUrl = info.pageUrl || (tab && tab.url) || ''
          const targetUrl = (info.linkUrl && /^https?:/i.test(info.linkUrl)) ? info.linkUrl : pageUrl
          if (!targetUrl) return
          await browser.runtime.sendMessage({
            type: 'tldw:request',
            payload: { path: '/api/v1/media/add', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url: targetUrl } }
          })
          chrome.notifications?.create?.({
            type: 'basic',
            iconUrl: '/icon.png',
            title: 'tldw_server',
            message: 'Sent to tldw_server for processing'
          })
        } catch (e) {
          console.error('Failed to send to tldw_server:', e)
        }
      } else if (info.menuItemId === "summarize-pa") {
        chrome.sidePanel.open({
          tabId: tab.id!
        })
        // this is a bad method hope somone can fix it :)
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
        chrome.sidePanel.open({
          tabId: tab.id!
        })
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
        chrome.sidePanel.open({
          tabId: tab.id!
        })

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
        chrome.sidePanel.open({
          tabId: tab.id!
        })

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
        chrome.sidePanel.open({
          tabId: tab.id!
        })

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

    // Add context menu for tldw ingest
    try {
      browser.contextMenus.create({
        id: 'send-to-tldw',
        title: 'Send to tldw_server',
        contexts: ["page", "link"]
      })
    } catch {}

    // Stream handler via Port API
    browser.runtime.onConnect.addListener((port) => {
      if (port.name === 'tldw:stream') {
        const storage = new Storage({ area: 'local' })
        let abort: AbortController | null = null
        const onMsg = async (msg: any) => {
          try {
            const cfg = await storage.get<any>('tldwConfig')
            if (!cfg?.serverUrl) throw new Error('tldw server not configured')
            const baseUrl = String(cfg.serverUrl).replace(/\/$/, '')
            const path = msg.path as string
            const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
            const headers: Record<string, string> = { ...(msg.headers || {}) }
            if (cfg.authMode === 'single-user' && cfg.apiKey) {
              headers['X-API-KEY'] = cfg.apiKey
            } else if (cfg.authMode === 'multi-user' && cfg.accessToken) {
              headers['Authorization'] = `Bearer ${cfg.accessToken}`
            }
            headers['Accept'] = 'text/event-stream'
            abort = new AbortController()
            let resp = await fetch(url, {
              method: msg.method || 'POST',
              headers,
              body: typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body),
              signal: abort.signal
            })
            if (resp.status === 401 && cfg.authMode === 'multi-user' && cfg.refreshToken) {
              if (!refreshInFlight) {
                refreshInFlight = (async () => {
                  try { await tldwAuth.refreshToken() } finally { refreshInFlight = null }
                })()
              }
              try { await refreshInFlight } catch {}
              const updated = await storage.get<any>('tldwConfig')
              if (updated?.accessToken) headers['Authorization'] = `Bearer ${updated.accessToken}`
              const retryController = new AbortController()
              abort = retryController
              resp = await fetch(url, {
                method: msg.method || 'POST',
                headers,
                body: typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body),
                signal: retryController.signal
              })
            }
            if (!resp.body) throw new Error('No response body')
            const reader = resp.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue
                if (trimmed.startsWith('data:')) {
                  const data = trimmed.slice(5).trim()
                  if (data === '[DONE]') {
                    port.postMessage({ event: 'done' })
                    return
                  }
                  port.postMessage({ event: 'data', data })
                }
              }
            }
            port.postMessage({ event: 'done' })
          } catch (e: any) {
            port.postMessage({ event: 'error', message: e?.message || 'Stream error' })
          }
        }
        port.onMessage.addListener(onMsg)
        port.onDisconnect.addListener(() => {
          try { port.onMessage.removeListener(onMsg) } catch {}
          try { abort?.abort() } catch {}
        })
      }
    })

    initialize()
  },
  persistent: true
})
