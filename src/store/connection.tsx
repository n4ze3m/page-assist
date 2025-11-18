import { create } from "zustand"

import { tldwClient } from "@/services/tldw/TldwApiClient"
import { getTldwServerURL } from "@/services/tldw-server"
import {
  ConnectionPhase,
  type ConnectionState,
  type KnowledgeStatus
} from "@/types/connection"

// Shared timeout before treating the server as unreachable.
// See New-Views-PRD.md §5.1.x / §10.1 (20 seconds).
export const CONNECTION_TIMEOUT_MS = 20_000

type ConnectionStore = {
  state: ConnectionState
  checkOnce: () => Promise<void>
  setServerUrl: (url: string) => Promise<void>
}

const initialState: ConnectionState = {
  phase: ConnectionPhase.SEARCHING,
  serverUrl: null,
  lastCheckedAt: null,
  lastError: null,
  lastStatusCode: null,
  isConnected: false,
  isChecking: false,
  knowledgeStatus: "unknown",
  knowledgeLastCheckedAt: null,
  knowledgeError: null
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  state: initialState,

  async checkOnce() {
    const prev = get().state

    // Avoid overlapping checks
    if (prev.isChecking) {
      return
    }

    // Throttle repeated checks when already connected recently.
    // This prevents the landing page/header from hammering the server.
    const now = Date.now()
    if (
      prev.isConnected &&
      prev.phase === ConnectionPhase.CONNECTED &&
      prev.lastCheckedAt != null &&
      now - prev.lastCheckedAt < 60_000
    ) {
      return
    }

    set({
      state: {
        ...prev,
        phase: ConnectionPhase.SEARCHING,
        isChecking: true,
        lastError: null
      }
    })

    try {
      let cfg = await tldwClient.getConfig()
      let serverUrl = cfg?.serverUrl ?? null

      if (!serverUrl) {
        try {
          const fallback = await getTldwServerURL()
          if (fallback) {
            await tldwClient.updateConfig({
              serverUrl: fallback,
              authMode: "single-user" as any
            })
            cfg = await tldwClient.getConfig()
            serverUrl = cfg?.serverUrl ?? null
          }
        } catch {
          // ignore fallback errors; we will treat as unconfigured below
        }
      }

      if (!serverUrl) {
        set({
          state: {
            ...prev,
            phase: ConnectionPhase.UNCONFIGURED,
            serverUrl: null,
            isConnected: false,
            isChecking: false,
            lastCheckedAt: Date.now(),
            lastError: null,
            lastStatusCode: null,
            knowledgeStatus: "unknown",
            knowledgeLastCheckedAt: null,
            knowledgeError: null
          }
        })
        return
      }

      await tldwClient.initialize()

      // Request health via background for detailed status codes
      const { apiSend } = await import("@/services/api-send")
      const healthPromise = (async () => {
        try {
          const resp = await apiSend({ path: '/api/v1/health', method: 'GET', noAuth: true })
          return { ok: Boolean(resp?.ok), status: Number(resp?.status) || 0, error: resp?.ok ? null : (resp?.error || null) }
        } catch (e) {
          return { ok: false, status: 0, error: (e as Error)?.message || 'Network error' }
        }
      })()
      const raced = await Promise.race([
        healthPromise,
        new Promise<{ ok: boolean; status: number; error: string | null }>((resolve) =>
          setTimeout(() => resolve({ ok: false, status: 0, error: 'timeout' }), CONNECTION_TIMEOUT_MS)
        )
      ])
      const ok = raced.ok

      let knowledgeStatus: KnowledgeStatus = prev.knowledgeStatus
      let knowledgeLastCheckedAt = prev.knowledgeLastCheckedAt
      let knowledgeError = prev.knowledgeError

      if (ok) {
        try {
          await tldwClient.ragHealth()
          knowledgeStatus = "ready"
          knowledgeLastCheckedAt = Date.now()
          knowledgeError = null
        } catch (e) {
          knowledgeStatus = "offline"
          knowledgeLastCheckedAt = Date.now()
          knowledgeError = (e as Error)?.message ?? "unknown-error"
        }
      } else {
        knowledgeStatus = "offline"
        knowledgeLastCheckedAt = Date.now()
        knowledgeError = "core-offline"
      }

      set({
        state: {
          ...prev,
          phase: ok ? ConnectionPhase.CONNECTED : ConnectionPhase.ERROR,
          serverUrl,
          isConnected: ok,
          isChecking: false,
          lastCheckedAt: Date.now(),
          lastError: ok ? null : (raced.error || 'timeout-or-offline'),
          lastStatusCode: ok ? null : raced.status,
          knowledgeStatus,
          knowledgeLastCheckedAt,
          knowledgeError
        }
      })
    } catch (error) {
      set({
        state: {
          ...prev,
          phase: ConnectionPhase.ERROR,
          isConnected: false,
          isChecking: false,
          lastCheckedAt: Date.now(),
          lastError: (error as Error)?.message ?? "unknown-error",
          lastStatusCode: 0,
          knowledgeStatus: "offline",
          knowledgeLastCheckedAt: Date.now(),
          knowledgeError: (error as Error)?.message ?? "unknown-error"
        }
      })
    }
  },

  async setServerUrl(url: string) {
    await tldwClient.updateConfig({ serverUrl: url })
    await get().checkOnce()
  }
}))

if (typeof window !== "undefined") {
  // Expose for Playwright tests and debugging only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__tldw_useConnectionStore = useConnectionStore
}
