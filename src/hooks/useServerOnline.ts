import React from "react"

import { useConnectionActions } from "@/hooks/useConnectionState"
import { useConnectionStore } from "@/store/connection"

/**
 * Derived "online" flag backed by the shared connection store.
 *
 * Uses the central connection state (and checkOnce) instead of calling
 * tldwClient.healthCheck directly in each consumer.
 *
 * Returns false when the connection mode is "demo", even if the server
 * is otherwise connected.
 */
export function useServerOnline(pollMs: number = 0): boolean {
  const isConnected = useConnectionStore((s) => s.state.isConnected)
  const mode = useConnectionStore((s) => s.state.mode)
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

  return isConnected && mode !== "demo"
}
