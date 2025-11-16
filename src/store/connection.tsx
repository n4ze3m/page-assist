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
            knowledgeStatus: "unknown",
            knowledgeLastCheckedAt: null,
            knowledgeError: null
          }
        })
        return
      }

      await tldwClient.initialize()

      const healthPromise = tldwClient.healthCheck()
      const ok = await Promise.race<boolean>([
        healthPromise,
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), CONNECTION_TIMEOUT_MS)
        )
      ])

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
          lastError: ok ? null : "timeout-or-offline",
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
