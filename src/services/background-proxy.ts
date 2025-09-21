import { browser } from "wxt/browser"
import { Storage } from "@plasmohq/storage"

export interface BgRequestInit {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: any
  noAuth?: boolean
  timeoutMs?: number
}

export async function bgRequest<T = any>({ path, method = 'GET', headers = {}, body, noAuth = false, timeoutMs }: BgRequestInit): Promise<T> {
  // If extension messaging is available, use it (extension context)
  try {
    // @ts-ignore
    if (browser?.runtime?.sendMessage) {
      const resp = await browser.runtime.sendMessage({
        type: 'tldw:request',
        payload: { path, method, headers, body, noAuth, timeoutMs }
      })
      if (!resp?.ok) {
        const msg = resp?.error || `Request failed: ${resp?.status}`
        throw new Error(msg)
      }
      return resp.data as T
    }
  } catch (e) {
    // fallthrough to direct fetch
  }

  // Fallback: direct fetch (web/dev context)
  const storage = new Storage({ area: 'local' })
  const cfg = await storage.get('tldwConfig').catch(() => null) as any
  const base = (cfg?.serverUrl || '').replace(/\/$/, '')
  const isAbs = /^https?:/i.test(path)
  const url = isAbs ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`

  if (!url) throw new Error('Server not configured')

  const controller = new AbortController()
  const id = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      credentials: 'include',
      signal: controller.signal
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return (await res.json()) as T
    }
    return (await res.text()) as any as T
  } finally {
    if (id) clearTimeout(id)
  }
}

export interface BgStreamInit {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: any
  streamIdleTimeoutMs?: number
}

export async function* bgStream({ path, method = 'POST', headers = {}, body, streamIdleTimeoutMs }: BgStreamInit): AsyncGenerator<string> {
  const port = browser.runtime.connect({ name: 'tldw:stream' })
  const encoder = new TextEncoder()
  const queue: string[] = []
  let done = false
  let error: any = null

  const onMessage = (msg: any) => {
    if (msg?.event === 'data') {
      queue.push(msg.data as string)
    } else if (msg?.event === 'done') {
      done = true
    } else if (msg?.event === 'error') {
      error = new Error(msg.message || 'Stream error')
      done = true
    }
  }
  port.onMessage.addListener(onMessage)
  port.postMessage({ path, method, headers, body, streamIdleTimeoutMs })

  try {
    while (!done || queue.length > 0) {
      if (queue.length > 0) {
        yield queue.shift() as string
      } else {
        await new Promise((r) => setTimeout(r, 10))
      }
    }
    if (error) throw error
  } finally {
    try { port.onMessage.removeListener(onMessage); } catch {}
    try { port.disconnect(); } catch {}
  }
}

export interface BgUploadInit {
  path: string
  method?: string
  // key/value fields to include alongside file in FormData
  fields?: Record<string, any>
  // File payload as raw bytes with metadata (ArrayBuffer is structured-cloneable)
  file?: { name?: string; type?: string; data: ArrayBuffer }
}

export async function bgUpload<T = any>({ path, method = 'POST', fields = {}, file }: BgUploadInit): Promise<T> {
  const resp = await browser.runtime.sendMessage({
    type: 'tldw:upload',
    payload: { path, method, fields, file }
  })
  if (!resp?.ok) {
    const msg = resp?.error || `Upload failed: ${resp?.status}`
    throw new Error(msg)
  }
  return resp.data as T
}
