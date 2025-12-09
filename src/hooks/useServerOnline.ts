import React from "react"

import { useConnectionActions } from "@/hooks/useConnectionState"
import { useConnectionStore } from "@/store/connection"
import {
  CONNECTED_POLL_INTERVAL_MS,
  DISCONNECTED_POLL_INTERVAL_MS
} from "@/config/connection-timing"

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
    // If a custom poll interval is provided, preserve the old behavior:
    // poll at that cadence (with a 5s minimum) regardless of connection
    // status. This is currently unused in production but kept for
    // backwards-compatibility and tests.
    if (pollMs > 0) {
      const intervalMs = Math.max(5000, pollMs)
      const id = window.setInterval(() => {
        void checkOnce()
      }, intervalMs)
      return () => {
        window.clearInterval(id)
      }
    }

    // Default behavior (pollMs === 0):
    // - While disconnected, poll frequently so that newly started or
    //   fixed servers are detected quickly.
    // - Once connected, back off to a light-touch health check to
    //   avoid unnecessary network traffic.
    const intervalMs = isConnected
      ? CONNECTED_POLL_INTERVAL_MS
      : DISCONNECTED_POLL_INTERVAL_MS
    const id = window.setInterval(() => {
      void checkOnce()
    }, intervalMs)
    return () => {
      window.clearInterval(id)
    }
  }, [pollMs, isConnected, checkOnce])

  return isConnected && mode !== "demo"
}
