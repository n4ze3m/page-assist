import React from "react"

import {
  useConnectionActions,
  useConnectionState
} from "@/hooks/useConnectionState"

/**
 * Derived "online" flag backed by the shared connection store.
 *
 * Uses the central connection state (and checkOnce) instead of calling
 * tldwClient.healthCheck directly in each consumer.
 */
export function useServerOnline(pollMs: number = 0): boolean {
  const { isConnected } = useConnectionState()
  const { checkOnce } = useConnectionActions()

  React.useEffect(() => {
    void checkOnce()
  }, [checkOnce])

  React.useEffect(() => {
    if (!pollMs) {
      return
    }
    const intervalMs = Math.max(5000, pollMs || 0)
    const id = window.setInterval(() => {
      void checkOnce()
    }, intervalMs)
    return () => {
      window.clearInterval(id)
    }
  }, [pollMs, checkOnce])

  return isConnected
}
