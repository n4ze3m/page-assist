import { browser } from "wxt/browser"

export interface BgRequestInit {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: any
}

export async function bgRequest<T = any>({ path, method = 'GET', headers = {}, body }: BgRequestInit): Promise<T> {
  const resp = await browser.runtime.sendMessage({
    type: 'tldw:request',
    payload: { path, method, headers, body }
  })
  if (!resp?.ok) {
    const msg = resp?.error || `Request failed: ${resp?.status}`
    throw new Error(msg)
  }
  return resp.data as T
}

export interface BgStreamInit {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: any
}

export async function* bgStream({ path, method = 'POST', headers = {}, body }: BgStreamInit): AsyncGenerator<string> {
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
  port.postMessage({ path, method, headers, body })

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
