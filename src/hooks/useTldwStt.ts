import { useEffect, useRef, useState } from 'react'

type SttEvent = { event: 'open' | 'data' | 'error' | 'close'; data?: any; message?: string }

export function useTldwStt() {
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      try { portRef.current?.disconnect() } catch {}
    }
  }, [])

  const connect = () => {
    if (portRef.current) return
    const port = chrome.runtime.connect({ name: 'tldw:stt' })
    port.onMessage.addListener((msg: SttEvent) => {
      if (msg.event === 'open') setConnected(true)
      if (msg.event === 'error') setLastError(msg.message || 'ws error')
      if (msg.event === 'close') setConnected(false)
    })
    port.postMessage({ action: 'connect' })
    portRef.current = port
  }

  const sendAudio = (chunk: ArrayBuffer | Uint8Array) => {
    if (!portRef.current) throw new Error('STT not connected')
    const data = chunk instanceof Uint8Array ? chunk.buffer : chunk
    portRef.current.postMessage({ action: 'audio', data })
  }

  const close = () => {
    try { portRef.current?.postMessage({ action: 'close' }) } catch {}
    try { portRef.current?.disconnect() } catch {}
    portRef.current = null
    setConnected(false)
  }

  return { connect, sendAudio, close, connected, lastError }
}

