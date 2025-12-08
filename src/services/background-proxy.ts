import { browser } from "wxt/browser"
import { Storage } from "@plasmohq/storage"
import type { AllowedMethodFor, AllowedPath, PathOrUrl, UpperLower } from "@/services/tldw/openapi-guard"
import { isPlaceholderApiKey } from "@/utils/api-key"

export interface BgRequestInit<P extends PathOrUrl = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>> {
  path: P
  method?: UpperLower<M>
  headers?: Record<string, string>
  body?: any
  noAuth?: boolean
  timeoutMs?: number
  abortSignal?: AbortSignal
}

export async function bgRequest<T = any, P extends PathOrUrl = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>>(
  { path, method = 'GET' as UpperLower<M>, headers = {}, body, noAuth = false, timeoutMs, abortSignal }: BgRequestInit<P, M>
): Promise<T> {
  // If extension messaging is available, use it (extension context)
  try {
    // @ts-ignore
    if (browser?.runtime?.sendMessage) {
      const payload = {
        type: 'tldw:request',
        payload: { path, method, headers, body, noAuth, timeoutMs }
      }

      if (!abortSignal) {
        const resp = await browser.runtime.sendMessage(payload) as { ok: boolean; error?: string; status?: number; data: T } | undefined
        if (!resp?.ok) {
          const msg = resp?.error || `Request failed: ${resp?.status}`
          throw new Error(msg)
        }
        return resp.data as T
      }

      if (abortSignal.aborted) {
        throw new Error('Aborted')
      }

      const messagePromise = browser.runtime.sendMessage(payload) as Promise<
        { ok: boolean; error?: string; status?: number; data: T } | undefined
      >

      const resp = await new Promise<
        { ok: boolean; error?: string; status?: number; data: T } | undefined
      >((resolve, reject) => {
        const onAbort = () => {
          reject(new Error('Aborted'))
        }
        abortSignal.addEventListener('abort', onAbort, { once: true })
        messagePromise
          .then((r) => {
            abortSignal.removeEventListener('abort', onAbort)
            resolve(r)
          })
          .catch((e) => {
            abortSignal.removeEventListener('abort', onAbort)
            reject(e)
          })
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

  // Mirror background auth behavior for direct fetches so that
  // single-user and multi-user modes include the correct headers.
  const h: Record<string, string> = { ...(headers || {}) }
  if (!noAuth) {
    for (const k of Object.keys(h)) {
      const kl = k.toLowerCase()
      if (kl === 'x-api-key' || kl === 'authorization') delete h[k]
    }
    if (cfg?.authMode === 'single-user') {
      const key = String(cfg?.apiKey || '').trim()
      if (!key) {
        throw new Error('Add or update your API key in Settings → tldw server, then try again.')
      }
      if (isPlaceholderApiKey(key)) {
        throw new Error('tldw server API key is still set to the default demo value. Replace it with your real API key in Settings → tldw server before continuing.')
      }
      h['X-API-KEY'] = key
    } else if (cfg?.authMode === 'multi-user') {
      const token = String(cfg?.accessToken || '').trim()
      if (token) {
        h['Authorization'] = `Bearer ${token}`
      } else {
        throw new Error('Not authenticated. Please login under Settings > tldw.')
      }
    }
  }

  const controller = new AbortController()
  const onAbort = () => {
    try {
      controller.abort()
    } catch {}
  }
  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort()
    } else {
      abortSignal.addEventListener('abort', onAbort, { once: true })
    }
  }
  const id = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const res = await fetch(url, {
      method,
      headers: h,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      // Use 'omit' to play nicely with mock/test servers using wildcard CORS
      // (no cookies are needed for API key / bearer flows).
      credentials: 'omit',
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
    if (abortSignal) {
      try {
        abortSignal.removeEventListener('abort', onAbort)
      } catch {}
    }
  }
}

export interface BgStreamInit<P extends AllowedPath = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>> {
  path: P
  method?: UpperLower<M>
  headers?: Record<string, string>
  body?: any
  streamIdleTimeoutMs?: number
  abortSignal?: AbortSignal
}

export async function* bgStream<P extends AllowedPath = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>>(
  { path, method = 'POST' as UpperLower<M>, headers = {}, body, streamIdleTimeoutMs, abortSignal }: BgStreamInit<P, M>
): AsyncGenerator<string> {
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
  const onAbort = () => {
    try { port.disconnect() } catch {}
  }
  if (abortSignal) {
    if (abortSignal.aborted) onAbort()
    else abortSignal.addEventListener('abort', onAbort, { once: true })
  }
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
    if (abortSignal) {
      try { abortSignal.removeEventListener('abort', onAbort) } catch {}
    }
  }
}

export interface BgUploadInit<P extends AllowedPath = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>> {
  path: P
  method?: UpperLower<M>
  // key/value fields to include alongside file in FormData
  fields?: Record<string, any>
  // File payload as raw bytes with metadata (ArrayBuffer is structured-cloneable)
  file?: { name?: string; type?: string; data: ArrayBuffer }
}

export async function bgUpload<T = any, P extends AllowedPath = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>>(
  { path, method = 'POST' as UpperLower<M>, fields = {}, file }: BgUploadInit<P, M>
): Promise<T> {
  const resp = await browser.runtime.sendMessage({
    type: 'tldw:upload',
    payload: { path, method, fields, file }
  }) as { ok: boolean; error?: string; status?: number; data: T } | undefined
  if (!resp?.ok) {
    const msg = resp?.error || `Upload failed: ${resp?.status}`
    throw new Error(msg)
  }
  return resp.data as T
}

export async function bgRequestValidated<T = any, P extends PathOrUrl = AllowedPath, M extends AllowedMethodFor<P> = AllowedMethodFor<P>>(
  init: BgRequestInit<P, M>,
  validate?: (data: unknown) => T
): Promise<T> {
  const data = await bgRequest<any, P, M>(init)
  return validate ? validate(data) : (data as T)
}
