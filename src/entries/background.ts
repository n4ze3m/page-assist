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

    const getProcessPathForUrl = (url: string) => {
      const u = (url || '').toLowerCase()
      const endsWith = (exts: string[]) => exts.some((e) => u.endsWith(e))
      if (endsWith(['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'])) return '/api/v1/media/process-audios'
      if (endsWith(['.mp4', '.webm', '.mkv', '.mov', '.avi'])) return '/api/v1/media/process-videos'
      if (endsWith(['.pdf'])) return '/api/v1/media/process-pdfs'
      if (endsWith(['.epub', '.mobi'])) return '/api/v1/media/process-ebooks'
      if (endsWith(['.doc', '.docx', '.rtf', '.odt', '.txt', '.md'])) return '/api/v1/media/process-documents'
      return '/api/v1/media/process-web-scraping'
    }

    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === "sidepanel") {
        await browser.sidebarAction.open()
      } else if (message.type === 'tldw:upload') {
        const { path, method = 'POST', fields = {}, file } = message.payload || {}
        const storage = new Storage({ area: 'local' })
        const cfg = await storage.get<any>('tldwConfig')
        const isAbsolute = typeof path === 'string' && /^https?:/i.test(path)
        if (!cfg?.serverUrl && !isAbsolute) {
          return { ok: false, status: 400, error: 'tldw server not configured' }
        }
        const baseUrl = cfg?.serverUrl ? String(cfg.serverUrl).replace(/\/$/, '') : ''
        const url = isAbsolute ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
        try {
          const form = new FormData()
          // append fields
          for (const [k, v] of Object.entries(fields || {})) {
            form.append(k, typeof v === 'string' ? v : JSON.stringify(v))
          }
          if (file?.data) {
            const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
            const filename = file.name || 'file'
            // @ts-ignore File may not exist in some workers; Blob is accepted by FormData
            try { form.append('file', new File([blob], filename, { type: blob.type })) } catch { form.append('file', blob, filename) }
          }
          const headers: Record<string, string> = {}
          if (cfg?.authMode === 'single-user') {
            const key = (cfg?.apiKey || '').trim()
            if (!key) return { ok: false, status: 401, error: 'X-API-KEY header required for single-user mode. Configure API key in Settings > tldw.' }
            headers['X-API-KEY'] = key
          }
          if (cfg?.authMode === 'multi-user') {
            const token = (cfg?.accessToken || '').trim()
            if (!token) return { ok: false, status: 401, error: 'Not authenticated. Please login under Settings > tldw.' }
            headers['Authorization'] = `Bearer ${token}`
          }
          const controller = new AbortController()
          const timeoutMs = Number(cfg?.requestTimeoutMs) > 0 ? Number(cfg.requestTimeoutMs) : 10000
          const timeout = setTimeout(() => controller.abort(), timeoutMs)
          const resp = await fetch(url, { method, headers, body: form, signal: controller.signal })
          clearTimeout(timeout)
          const contentType = resp.headers.get('content-type') || ''
          let data: any = null
          if (contentType.includes('application/json')) data = await resp.json().catch(() => null)
          else data = await resp.text().catch(() => null)
          return { ok: resp.ok, status: resp.status, data }
        } catch (e: any) {
          return { ok: false, status: 0, error: e?.message || 'Upload failed' }
        }
      } else if (message.type === 'tldw:request') {
        const { path, method = 'GET', headers = {}, body, noAuth = false, timeoutMs: overrideTimeoutMs } = message.payload || {}
        const storage = new Storage({ area: 'local' })
        const cfg = await storage.get<any>('tldwConfig')
        const isAbsolute = typeof path === 'string' && /^https?:/i.test(path)
        if (!cfg?.serverUrl && !isAbsolute) {
          return { ok: false, status: 400, error: 'tldw server not configured' }
        }
        const baseUrl = cfg?.serverUrl ? String(cfg.serverUrl).replace(/\/$/, '') : ''
        const url = isAbsolute ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
        const h: Record<string, string> = { ...(headers || {}) }
        if (!noAuth) {
          for (const k of Object.keys(h)) {
            const kl = k.toLowerCase()
            if (kl === 'x-api-key' || kl === 'authorization') delete h[k]
          }
          if (cfg?.authMode === 'single-user') {
            const key = (cfg?.apiKey || '').trim()
            if (key) h['X-API-KEY'] = key
            else return { ok: false, status: 401, error: 'X-API-KEY header required for single-user mode. Configure API key in Settings > tldw.' }
          } else if (cfg?.authMode === 'multi-user') {
            const token = (cfg?.accessToken || '').trim()
            if (token) h['Authorization'] = `Bearer ${token}`
            else return { ok: false, status: 401, error: 'Not authenticated. Please login under Settings > tldw.' }
          }
        }
        try {
          const controller = new AbortController()
          const timeoutMs = Number(overrideTimeoutMs) > 0 ? Number(overrideTimeoutMs) : (Number(cfg?.requestTimeoutMs) > 0 ? Number(cfg.requestTimeoutMs) : 10000)
          const timeout = setTimeout(() => controller.abort(), timeoutMs)
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
            const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs)
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
          if (!resp.ok) {
            const detail = typeof data === 'object' && data && (data.detail || data.error || data.message)
            return { ok: false, status: resp.status, error: detail || resp.statusText || `HTTP ${resp.status}`, data }
          }
          return { ok: true, status: resp.status, data }
        } catch (e: any) {
          return { ok: false, status: 0, error: e?.message || 'Network error' }
        }
      } else if (message.type === 'tldw:ingest') {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          const pageUrl = tab?.url || ''
          if (!pageUrl) return { ok: false, status: 400, error: 'No active tab URL' }
          const path = message.mode === 'process' ? getProcessPathForUrl(pageUrl) : '/api/v1/media/add'
          const resp = await browser.runtime.sendMessage({
            type: 'tldw:request',
            payload: { path, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url: pageUrl } }
          })
          return resp
        } catch (e: any) {
          return { ok: false, status: 0, error: e?.message || 'Ingest failed' }
        }
      }
    })

    browser.runtime.onConnect.addListener((port) => {
      if (port.name === "pgCopilot") {
        isCopilotRunning = true
        port.onDisconnect.addListener(() => {
          isCopilotRunning = false
        })
      } else if (port.name === 'tldw:stt') {
        const storage = new Storage({ area: 'local' })
        let ws: WebSocket | null = null
        const onMsg = async (msg: any) => {
          try {
            if (msg?.action === 'connect') {
              const cfg = await storage.get<any>('tldwConfig')
              if (!cfg?.serverUrl) throw new Error('tldw server not configured')
              const base = cfg.serverUrl.replace(/^http/, 'ws').replace(/\/$/, '')
              const token = cfg.authMode === 'single-user' ? cfg.apiKey : cfg.accessToken
              const url = `${base}/api/v1/audio/stream/transcribe?token=${encodeURIComponent(token || '')}`
              ws = new WebSocket(url)
              ws.binaryType = 'arraybuffer'
              ws.onopen = () => port.postMessage({ event: 'open' })
              ws.onmessage = (ev) => port.postMessage({ event: 'data', data: ev.data })
              ws.onerror = (ev) => port.postMessage({ event: 'error', message: 'ws error' })
              ws.onclose = () => port.postMessage({ event: 'close' })
            } else if (msg?.action === 'audio' && ws && ws.readyState === WebSocket.OPEN) {
              if (msg.data instanceof ArrayBuffer) {
                ws.send(msg.data)
              } else if (msg.data?.buffer) {
                ws.send(msg.data.buffer)
              }
            } else if (msg?.action === 'close') {
              try { ws?.close() } catch {}
              ws = null
            }
          } catch (e: any) {
            port.postMessage({ event: 'error', message: e?.message || 'ws error' })
          }
        }
        port.onMessage.addListener(onMsg)
        port.onDisconnect.addListener(() => {
          try { port.onMessage.removeListener(onMsg) } catch {}
          try { ws?.close() } catch {}
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
      } else if (info.menuItemId === 'process-local-tldw') {
        try {
          const pageUrl = info.pageUrl || (tab && tab.url) || ''
          const targetUrl = (info.linkUrl && /^https?:/i.test(info.linkUrl)) ? info.linkUrl : pageUrl
          if (!targetUrl) return
          await browser.runtime.sendMessage({
            type: 'tldw:request',
            payload: { path: getProcessPathForUrl(targetUrl), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url: targetUrl } }
          })
          chrome.notifications?.create?.({
            type: 'basic',
            iconUrl: '/icon.png',
            title: 'tldw_server',
            message: 'Processed page (not saved to server)'
          })
        } catch (e) {
          console.error('Failed to process locally:', e)
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
        let idleTimer: any = null
        let closed = false
        const onMsg = async (msg: any) => {
          try {
            const cfg = await storage.get<any>('tldwConfig')
            if (!cfg?.serverUrl) throw new Error('tldw server not configured')
            const baseUrl = String(cfg.serverUrl).replace(/\/$/, '')
            const path = msg.path as string
            const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`
            const headers: Record<string, string> = { ...(msg.headers || {}) }
            for (const k of Object.keys(headers)) {
              const kl = k.toLowerCase()
              if (kl === 'x-api-key' || kl === 'authorization') delete headers[k]
            }
            if (cfg.authMode === 'single-user') {
              const key = (cfg.apiKey || '').trim()
              if (key) headers['X-API-KEY'] = key
              else return port.postMessage({ event: 'error', message: 'X-API-KEY header required for single-user mode. Configure API key in Settings > tldw.' })
            } else if (cfg.authMode === 'multi-user') {
              const token = (cfg.accessToken || '').trim()
              if (token) headers['Authorization'] = `Bearer ${token}`
              else return port.postMessage({ event: 'error', message: 'Not authenticated. Please login under Settings > tldw.' })
            }
            headers['Accept'] = 'text/event-stream'
            abort = new AbortController()
            const idleMs = Number(msg?.streamIdleTimeoutMs) > 0 ? Number(msg.streamIdleTimeoutMs) : (Number(cfg?.streamIdleTimeoutMs) > 0 ? Number(cfg.streamIdleTimeoutMs) : 15000)
            const resetIdle = () => {
              if (idleTimer) clearTimeout(idleTimer)
              idleTimer = setTimeout(() => {
                if (!closed) {
                  try { abort?.abort() } catch {}
                  port.postMessage({ event: 'error', message: 'Stream timeout: no updates received' })
                }
              }, idleMs)
            }
            let resp = await fetch(url, {
              method: msg.method || 'POST',
              headers,
              body: typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body),
              signal: abort.signal
            })
            if (!resp.ok) {
              const ct = resp.headers.get('content-type') || ''
              let errMsg: any = resp.statusText
              if (ct.includes('application/json')) {
                const j = await resp.json().catch(() => null)
                if (j && (j.detail || j.error || j.message)) errMsg = j.detail || j.error || j.message
              } else {
                const t = await resp.text().catch(() => null)
                if (t) errMsg = t
              }
              return port.postMessage({ event: 'error', message: String(errMsg || `HTTP ${resp.status}`) })
            }
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
            resetIdle()
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
                    closed = true
                    if (idleTimer) clearTimeout(idleTimer)
                    port.postMessage({ event: 'done' })
                    return
                  }
                  resetIdle()
                  port.postMessage({ event: 'data', data })
                }
              }
            }
            closed = true
            if (idleTimer) clearTimeout(idleTimer)
            port.postMessage({ event: 'done' })
          } catch (e: any) {
            if (idleTimer) clearTimeout(idleTimer)
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
