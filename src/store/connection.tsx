import { create } from "zustand"

import { tldwClient } from "@/services/tldw/TldwApiClient"
import { getTldwServerURL } from "@/services/tldw-server"
import { apiSend } from "@/services/api-send"
import {
  ConnectionPhase,
  type ConnectionState,
  type KnowledgeStatus
} from "@/types/connection"

// Shared timeout before treating the server as unreachable.
// See New-Views-PRD.md §5.1.x / §10.1 (20 seconds).
export const CONNECTION_TIMEOUT_MS = 20_000

const TEST_BYPASS_KEY = "__tldw_allow_offline"
const FORCE_UNCONFIGURED_KEY = "__tldw_force_unconfigured"

const getOfflineBypassFlag = async (): Promise<boolean> => {
  // Build-time flag for Playwright/CI: VITE_TLDW_E2E_ALLOW_OFFLINE=true
  if ((import.meta as any)?.env?.VITE_TLDW_E2E_ALLOW_OFFLINE === "true") {
    return true
  }

  // Runtime toggle (settable by tests) via chrome.storage.local or localStorage.
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      return await new Promise<boolean>((resolve) => {
        chrome.storage.local.get(TEST_BYPASS_KEY, (res) =>
          resolve(Boolean(res?.[TEST_BYPASS_KEY]))
        )
      })
    }
  } catch {
    // ignore storage read errors
  }

  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(TEST_BYPASS_KEY) === "true"
    }
  } catch {
    // ignore localStorage availability
  }

  return false
}

const getForceUnconfiguredFlag = async (): Promise<boolean> => {
  try {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      return await new Promise<boolean>((resolve) => {
        chrome.storage.local.get(FORCE_UNCONFIGURED_KEY, (res) =>
          resolve(Boolean(res?.[FORCE_UNCONFIGURED_KEY]))
        )
      })
    }
  } catch {
    // ignore storage read errors
  }

  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(FORCE_UNCONFIGURED_KEY) === "true"
    }
  } catch {
    // ignore localStorage availability
  }

  return false
}

const ensurePlaceholderConfig = async (): Promise<string | null> => {
  try {
    const cfg = await tldwClient.getConfig()
    if (cfg?.serverUrl) return cfg.serverUrl
  } catch {
    // ignore missing config
  }

  const placeholderUrl = "http://127.0.0.1:0"
  try {
    await tldwClient.updateConfig({
      serverUrl: placeholderUrl,
      authMode: "single-user" as any,
      apiKey: "test-bypass"
    })
    return placeholderUrl
  } catch {
    return null
  }
}

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
  offlineBypass: false,
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

    let persistedServerUrl: string | null = null
    try {
      const cfg = await tldwClient.getConfig()
      if (cfg?.serverUrl) persistedServerUrl = cfg.serverUrl
    } catch {
      // ignore config read errors
    }
    try {
      if (!persistedServerUrl && typeof chrome !== "undefined" && chrome?.storage?.local) {
        await new Promise<void>((resolve) =>
          chrome.storage.local.get("tldwConfig", (res) => {
            const url = res?.tldwConfig?.serverUrl
            if (url) persistedServerUrl = url
            resolve()
          })
        )
      }
    } catch {
      // ignore storage read errors
    }

    // Test-only hook: force a missing/unconfigured state without network calls.
    const forceUnconfigured = await getForceUnconfiguredFlag()
    if (forceUnconfigured) {
      set({
        state: {
          ...prev,
          phase: ConnectionPhase.UNCONFIGURED,
          serverUrl: persistedServerUrl,
          isConnected: false,
          isChecking: false,
          offlineBypass: false,
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

    // Optional test toggle: allow CI/Playwright to treat the app as "connected"
    // without hitting a live server. Controlled via env VITE_TLDW_E2E_ALLOW_OFFLINE
    // or chrome.storage.local[__tldw_allow_offline].
    const bypass = await getOfflineBypassFlag()
    if (bypass) {
      const serverUrl =
        persistedServerUrl ??
        (await ensurePlaceholderConfig()) ??
        prev.serverUrl ??
        "offline://local"
      set({
        state: {
          ...prev,
          phase: ConnectionPhase.CONNECTED,
          serverUrl,
          isConnected: true,
          isChecking: false,
          offlineBypass: true,
          lastCheckedAt: Date.now(),
          lastError: null,
          lastStatusCode: null,
          knowledgeStatus: "ready",
          knowledgeLastCheckedAt: Date.now(),
          knowledgeError: null
        }
      })
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
        serverUrl: persistedServerUrl ?? prev.serverUrl,
        isChecking: true,
        offlineBypass: false,
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
              serverUrl: fallback
            })
            cfg = await tldwClient.getConfig()
            serverUrl = cfg?.serverUrl ?? null
          }
        } catch {
          // ignore fallback errors; we will treat as unconfigured below
        }
      }

      // If we have a server URL but no API key, treat as unconfigured/unauthenticated.
      // Users must explicitly configure their own credentials in Settings/Onboarding.

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

      // Request health via background for detailed status codes.
      // Health endpoints may require auth; apiSend injects headers based
      // on tldwConfig (API key / access token).
      const healthPromise = (async () => {
        try {
          const resp = await apiSend({
            path: '/api/v1/health',
            method: 'GET'
          })
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
          offlineBypass: false,
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
          offlineBypass: false,
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

  // Allow tests to flip the offline bypass without rebuilding the extension.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__tldw_enableOfflineBypass = async () => {
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        await new Promise<void>((resolve) =>
          chrome.storage.local.set({ [TEST_BYPASS_KEY]: true }, () => resolve())
        )
      } else if (typeof localStorage !== "undefined") {
        localStorage.setItem(TEST_BYPASS_KEY, "true")
      }
      await useConnectionStore.getState().checkOnce()
      return true
    } catch {
      return false
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__tldw_disableOfflineBypass = async () => {
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        await new Promise<void>((resolve) =>
          chrome.storage.local.remove(TEST_BYPASS_KEY, () => resolve())
        )
      } else if (typeof localStorage !== "undefined") {
        localStorage.removeItem(TEST_BYPASS_KEY)
      }
      await useConnectionStore.getState().checkOnce()
      return true
    } catch {
      return false
    }
  }

  // Allow tests to force the unconfigured/waiting state without network calls.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).__tldw_forceUnconfigured = async () => {
    try {
      if (typeof chrome !== "undefined" && chrome?.storage?.local) {
        await new Promise<void>((resolve) =>
          chrome.storage.local.set({ [FORCE_UNCONFIGURED_KEY]: true }, () =>
            resolve()
          )
        )
      } else if (typeof localStorage !== "undefined") {
        localStorage.setItem(FORCE_UNCONFIGURED_KEY, "true")
      }
      await useConnectionStore.getState().checkOnce()
      return true
    } catch {
      return false
    }
  }
}
