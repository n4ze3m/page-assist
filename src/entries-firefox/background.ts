import { browser } from "wxt/browser"
import { Storage } from "@plasmohq/storage"
import type { AllowedPath } from "@/services/tldw/openapi-guard"
import { getInitialConfig } from "@/services/action"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { tldwAuth } from "@/services/tldw/TldwAuth"
import { apiSend } from "@/services/api-send"
import {
  ensureSidepanelOpen,
  pickFirstString,
  extractTranscriptionPieces,
  clampText,
  notify
} from "@/services/background-helpers"

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

        browser.contextMenus.create({
          id: saveToNotesMenuId,
          title: browser.i18n.getMessage("contextSaveToNotes"),
          contexts: ["selection"]
        })
    
      } catch (error) {
        console.error("Error in initLogic:", error)
      }
    }


    let refreshInFlight: Promise<any> | null = null
    let streamDebugEnabled = false

    const getProcessPathForUrl = (url: string): AllowedPath => {
      const u = (url || '').toLowerCase()
      const endsWith = (exts: string[]) => exts.some((e) => u.endsWith(e))
      if (endsWith(['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'])) return '/api/v1/media/process-audios'
      if (endsWith(['.mp4', '.webm', '.mkv', '.mov', '.avi'])) return '/api/v1/media/process-videos'
      if (endsWith(['.pdf'])) return '/api/v1/media/process-pdfs'
      if (endsWith(['.epub', '.mobi'])) return '/api/v1/media/process-ebooks'
      if (endsWith(['.doc', '.docx', '.rtf', '.odt', '.txt', '.md'])) return '/api/v1/media/process-documents'
      return '/api/v1/media/process-web-scraping'
    }

    const handleTranscribeClick = async (
      info: any,
      tab: any,
      mode: 'transcribe' | 'transcribe+summary'
    ) => {
      const pageUrl = info.pageUrl || (tab && tab.url) || ''
      const targetUrl = (info.linkUrl && /^https?:/i.test(info.linkUrl)) ? info.linkUrl : pageUrl
      if (!targetUrl) {
        notify('tldw_server', 'No URL found to transcribe.')
        return
      }
      const path = getProcessPathForUrl(targetUrl)
      if (path !== '/api/v1/media/process-audios' && path !== '/api/v1/media/process-videos') {
        notify('tldw_server', 'Transcription is available for audio or video URLs only.')
        return
      }

      try {
        const resp = await apiSend({
          path,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            urls: [targetUrl],
            perform_analysis: mode === 'transcribe+summary',
            perform_chunking: false,
            summarize_recursively: mode === 'transcribe+summary',
            timestamp_option: true
          },
          timeoutMs: 180000
        })
        if (!resp?.ok) {
          notify('tldw_server', resp?.error || 'Transcription failed. Check your connection and server config.')
          return
        }
        const { transcript, summary } = extractTranscriptionPieces(resp.data)
        const safeTranscript = clampText(transcript)
        const safeSummary = clampText(summary)
        const label = mode === 'transcribe+summary' ? 'Transcription + summary' : 'Transcription'
        const bodyParts = []
        if (safeTranscript) bodyParts.push(`Transcript:\n${safeTranscript}`)
        if (safeSummary) bodyParts.push(`Summary:\n${safeSummary}`)
        const combinedText = bodyParts.join('\n\n') || 'Request completed. Open Media or the sidebar to view results.'

        ensureSidepanelOpen()
        try {
          await browser.runtime.sendMessage({
            from: 'background',
            type: mode === 'transcribe+summary' ? 'transcription+summary' : 'transcription',
            text: combinedText,
            payload: {
              url: targetUrl,
              transcript: safeTranscript,
              summary: safeSummary,
              mode
            }
          })
        } catch {
          setTimeout(() => {
            try {
              browser.runtime.sendMessage({
                from: 'background',
                type: mode === 'transcribe+summary' ? 'transcription+summary' : 'transcription',
                text: combinedText,
                payload: {
                  url: targetUrl,
                  transcript: safeTranscript,
                  summary: safeSummary,
                  mode
                }
              })
            } catch {}
          }, 500)
        }
        notify('tldw_server', `${label} sent to sidebar. You can also review it under Media in the Web UI.`)
      } catch (e: any) {
        notify('tldw_server', e?.message || 'Transcription request failed.')
      }
    }

    const parseRetryAfter = (headerValue?: string | null): number | null => {
      if (!headerValue) return null
      const asNumber = Number(headerValue)
      if (!Number.isNaN(asNumber)) {
        return Math.max(0, asNumber * 1000)
      }
      const asDate = Date.parse(headerValue)
      if (!Number.isNaN(asDate)) {
        return Math.max(0, asDate - Date.now())
      }
      return null
    }

    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'tldw:debug') {
        streamDebugEnabled = Boolean(message?.enable)
        return { ok: true }
      }
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
          for (const [k, v] of Object.entries(fields || {})) {
            form.append(k, typeof v === 'string' ? v : JSON.stringify(v))
          }
          if (file?.data) {
            const blob = new Blob([file.data], { type: file.type || 'application/octet-stream' })
            const filename = file.name || 'file'
            try { form.append('file', new File([blob], filename, { type: blob.type })) } catch { form.append('file', blob, filename) }
          }
          const headers: Record<string, string> = {}
          if (cfg?.authMode === 'single-user' && cfg?.apiKey) headers['X-API-KEY'] = cfg.apiKey
          if (cfg?.authMode === 'multi-user' && cfg?.accessToken) headers['Authorization'] = `Bearer ${cfg.accessToken}`
          const controller = new AbortController()
          const timeoutMs = Number(cfg?.uploadRequestTimeoutMs) > 0 ? Number(cfg.uploadRequestTimeoutMs) : (Number(cfg?.requestTimeoutMs) > 0 ? Number(cfg.requestTimeoutMs) : 10000)
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
            if (cfg?.apiKey) h['X-API-KEY'] = String(cfg.apiKey).trim()
            else return { ok: false, status: 401, error: 'Add or update your API key in Settings → tldw server, then try again.' }
          } else if (cfg?.authMode === 'multi-user') {
            if (cfg?.accessToken) h['Authorization'] = `Bearer ${String(cfg.accessToken).trim()}`
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
          const headersOut: Record<string, string> = {}
          try {
            resp.headers.forEach((v, k) => {
              headersOut[k] = v
            })
          } catch {}
          const retryAfterMs = parseRetryAfter(resp.headers?.get?.('retry-after'))
          const contentType = resp.headers.get('content-type') || ''
          let data: any = null
          if (contentType.includes('application/json')) {
            data = await resp.json().catch(() => null)
          } else {
            data = await resp.text().catch(() => null)
          }
          if (!resp.ok) {
            const detail = typeof data === 'object' && data && (data.detail || data.error || data.message)
            return { ok: false, status: resp.status, error: detail || resp.statusText || `HTTP ${resp.status}`, data, headers: headersOut, retryAfterMs }
          }
          return { ok: true, status: resp.status, data, headers: headersOut, retryAfterMs }
        } catch (e: any) {
          return { ok: false, status: 0, error: e?.message || 'Network error' }
        }
      } else if (message.type === 'tldw:ingest') {
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true })
          const tab = tabs[0]
          const pageUrl = tab?.url || ''
          if (!pageUrl) return { ok: false, status: 400, error: 'No active tab URL' }
          const path = message.mode === 'process' ? getProcessPathForUrl(pageUrl) : '/api/v1/media/add'
          const resp = await apiSend({ path, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url: pageUrl }, timeoutMs: 120000 })
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
        let disconnected = false
        const safePost = (msg: any) => {
          if (disconnected) return
          try { port.postMessage(msg) } catch {}
        }
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
              ws.onopen = () => safePost({ event: 'open' })
              ws.onmessage = (ev) => safePost({ event: 'data', data: ev.data })
              ws.onerror = () => safePost({ event: 'error', message: 'ws error' })
              ws.onclose = () => safePost({ event: 'close' })
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
            safePost({ event: 'error', message: e?.message || 'ws error' })
          }
        }
        port.onMessage.addListener(onMsg)
        port.onDisconnect.addListener(() => {
          disconnected = true
          try { port.onMessage.removeListener(onMsg) } catch {}
          try { ws?.close() } catch {}
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
    const transcribeMenuId = {
      transcribe: "transcribe-media-pa",
      transcribeAndSummarize: "transcribe-and-summarize-media-pa"
    }
    const saveToNotesMenuId = "save-to-notes-pa"


    // Add context menu for tldw ingest
    try {
      browser.contextMenus.create({
        id: 'send-to-tldw',
        title: browser.i18n.getMessage("contextSendToTldw"),
        contexts: ["page", "link"]
      })
      browser.contextMenus.create({
        id: 'process-local-tldw',
        title: browser.i18n.getMessage("contextProcessLocalTldw"),
        contexts: ["page", "link"]
      })
      browser.contextMenus.create({
        id: transcribeMenuId.transcribe,
        title: browser.i18n.getMessage("contextTranscribeMedia"),
        contexts: ["page", "link"]
      })
      browser.contextMenus.create({
        id: transcribeMenuId.transcribeAndSummarize,
        title: browser.i18n.getMessage("contextTranscribeAndSummarizeMedia"),
        contexts: ["page", "link"]
      })
    } catch {}

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === "open-side-panel-pa") {
        browser.sidebarAction.toggle()
      } else if (info.menuItemId === "open-web-ui-pa") {
        browser.tabs.create({
          url: browser.runtime.getURL("/options.html")
        })
      } else if (info.menuItemId === transcribeMenuId.transcribe) {
        await handleTranscribeClick(info, tab, 'transcribe')
      } else if (info.menuItemId === transcribeMenuId.transcribeAndSummarize) {
        await handleTranscribeClick(info, tab, 'transcribe+summary')
      } else if (info.menuItemId === saveToNotesMenuId) {
        const selection = String(info.selectionText || '').trim()
        if (!selection) {
          notify(browser.i18n.getMessage("contextSaveToNotes"), browser.i18n.getMessage("contextSaveToNotesNoSelection"))
          return
        }
        if (!isCopilotRunning) {
          ensureSidepanelOpen()
          notify(
            browser.i18n.getMessage("contextSaveToNotes"),
            browser.i18n.getMessage("contextSaveToNotesOpeningSidebar")
          )
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            from: "background",
            type: "save-to-notes",
            text: selection,
            payload: {
              selectionText: selection,
              pageUrl: info.pageUrl || (tab && tab.url) || "",
              pageTitle: tab?.title || ""
            }
          })
        }, isCopilotRunning ? 0 : 1000)
      } else if (info.menuItemId === 'send-to-tldw') {
        const pageUrl = info.pageUrl || (tab && tab.url) || ''
        const targetUrl = (info.linkUrl && /^https?:/i.test(info.linkUrl)) ? info.linkUrl : pageUrl
        if (!targetUrl) return
        browser.runtime.sendMessage({
          type: 'tldw:request',
          payload: { path: '/api/v1/media/add', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url: targetUrl } }
        })
      } else if (info.menuItemId === 'process-local-tldw') {
        const pageUrl = info.pageUrl || (tab && tab.url) || ''
        const targetUrl = (info.linkUrl && /^https?:/i.test(info.linkUrl)) ? info.linkUrl : pageUrl
        if (!targetUrl) return
        browser.runtime.sendMessage({
          type: 'tldw:request',
          payload: { path: getProcessPathForUrl(targetUrl), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { url: targetUrl } }
        })
      } else if (info.menuItemId === "summarize-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
          notify(
            browser.i18n.getMessage("contextSummarize"),
            browser.i18n.getMessage("contextSidebarOpening")
          )
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            from: "background",
            type: "summary",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 1000)
      } else if (info.menuItemId === "rephrase-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
          notify(
            browser.i18n.getMessage("contextRephrase"),
            browser.i18n.getMessage("contextSidebarOpening")
          )
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "rephrase",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 1000)
      } else if (info.menuItemId === "translate-pg") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
          notify(
            browser.i18n.getMessage("contextTranslate"),
            browser.i18n.getMessage("contextSidebarOpening")
          )
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "translate",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 1000)
      } else if (info.menuItemId === "explain-pa") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
          notify(
            browser.i18n.getMessage("contextExplain"),
            browser.i18n.getMessage("contextSidebarOpening")
          )
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "explain",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 1000)
      } else if (info.menuItemId === "custom-pg") {
        if (!isCopilotRunning) {
          browser.sidebarAction.toggle()
          notify(
            browser.i18n.getMessage("contextCustom"),
            browser.i18n.getMessage("contextSidebarOpening")
          )
        }
        setTimeout(async () => {
          await browser.runtime.sendMessage({
            type: "custom",
            from: "background",
            text: info.selectionText
          })
        }, isCopilotRunning ? 0 : 1000)
      }
    })

    // Stream handler via Port API
    browser.runtime.onConnect.addListener((port) => {
      if (port.name === 'tldw:stream') {
        const storage = new Storage({ area: 'local' })
        let abort: AbortController | null = null
        let idleTimer: any = null
        let closed = false
        let disconnected = false
        const safePost = (msg: any) => {
          if (disconnected) return
          try { port.postMessage(msg) } catch {}
        }
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
              else { safePost({ event: 'error', message: 'Add or update your API key in Settings → tldw server, then try again.' }); return }
            } else if (cfg.authMode === 'multi-user') {
              const token = (cfg.accessToken || '').trim()
              if (token) headers['Authorization'] = `Bearer ${token}`
              else { safePost({ event: 'error', message: 'Not authenticated. Please login under Settings > tldw.' }); return }
            }
            headers['Accept'] = 'text/event-stream'
            headers['Cache-Control'] = headers['Cache-Control'] || 'no-cache'
            headers['Connection'] = headers['Connection'] || 'keep-alive'
            abort = new AbortController()
            const idleMs = Number(msg?.streamIdleTimeoutMs) > 0 ? Number(msg.streamIdleTimeoutMs) : (Number(cfg?.streamIdleTimeoutMs) > 0 ? Number(cfg.streamIdleTimeoutMs) : 15000)
            const resetIdle = () => {
              if (idleTimer) clearTimeout(idleTimer)
              idleTimer = setTimeout(() => {
                if (!closed) {
                  try { abort?.abort() } catch {}
                  safePost({ event: 'error', message: 'Stream timeout: no updates received' })
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
              safePost({ event: 'error', message: String(errMsg || `HTTP ${resp.status}`) })
              return
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
              resetIdle()
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''
              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue
                if (trimmed.startsWith('event:')) {
                  const name = trimmed.slice(6).trim()
                  if (streamDebugEnabled) {
                    try { await browser.runtime.sendMessage({ type: 'tldw:stream-debug', payload: { kind: 'event', name, time: Date.now() } }) } catch {}
                  }
                }
                resetIdle()
                if (trimmed.startsWith('data:')) {
                  const data = trimmed.slice(5).trim()
                  if (streamDebugEnabled) {
                    try { await browser.runtime.sendMessage({ type: 'tldw:stream-debug', payload: { kind: 'data', data, time: Date.now() } }) } catch {}
                  }
                  if (data === '[DONE]') {
                    closed = true
                    if (idleTimer) clearTimeout(idleTimer)
                    safePost({ event: 'done' })
                    return
                  }
                  safePost({ event: 'data', data })
                } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                  const data = trimmed
                  if (streamDebugEnabled) {
                    try { await browser.runtime.sendMessage({ type: 'tldw:stream-debug', payload: { kind: 'data', data, time: Date.now() } }) } catch {}
                  }
                  safePost({ event: 'data', data })
                }
              }
            }
            closed = true
            if (idleTimer) clearTimeout(idleTimer)
            safePost({ event: 'done' })
          } catch (e: any) {
            if (idleTimer) clearTimeout(idleTimer)
            safePost({ event: 'error', message: e?.message || 'Stream error' })
          }
        }
        port.onMessage.addListener(onMsg)
        port.onDisconnect.addListener(() => {
          disconnected = true
          try { port.onMessage.removeListener(onMsg) } catch {}
          try { abort?.abort() } catch {}
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

    initialize()

  },
  persistent: true
})
