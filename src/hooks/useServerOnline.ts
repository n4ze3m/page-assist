import React from 'react'
import { tldwClient } from '@/services/tldw/TldwApiClient'

/**
 * Lightweight health gate. Polls the server health endpoint and returns
 * a boolean indicating whether the backend appears reachable.
 *
 * Defaults to conservative false until the first successful check to
 * avoid firing queries on mount when offline.
 */
export function useServerOnline(pollMs: number = 15000): boolean {
  const [online, setOnline] = React.useState<boolean>(false)

  React.useEffect(() => {
    let mounted = true
    let timer: any
    const check = async () => {
      try {
        const ok = await tldwClient.healthCheck()
        if (mounted) setOnline(Boolean(ok))
      } catch {
        if (mounted) setOnline(false)
      }
    }
    // initial, then poll
    void check()
    timer = setInterval(check, Math.max(5000, pollMs))
    return () => { mounted = false; if (timer) clearInterval(timer) }
  }, [pollMs])

  return online
}

