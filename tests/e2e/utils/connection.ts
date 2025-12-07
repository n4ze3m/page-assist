import type { Page } from '@playwright/test'

// Small helpers to interact with the shared connection store from Playwright
// tests. These avoid duplicating inline evaluate blocks and provide consistent
// debug logging for flaky connection‑dependent specs.

export async function waitForConnectionStore(page: Page, label = 'init') {
  await page.waitForFunction(
    () => {
      const w: any = window as any
      const store = w.__tldw_useConnectionStore
      return !!store && typeof store.getState === 'function'
    },
    null,
    { timeout: 10_000 }
  )
  await logConnectionSnapshot(page, label)
}

export async function logConnectionSnapshot(page: Page, label: string) {
  await page.evaluate((tag) => {
    const w: any = window as any
    const store = w.__tldw_useConnectionStore
    if (!store?.getState) return
    try {
      const state = store.getState().state
      // eslint-disable-next-line no-console
      console.log('CONNECTION_DEBUG', tag, JSON.stringify({
        phase: state.phase,
        configStep: state.configStep,
        mode: state.mode,
        errorKind: state.errorKind,
        serverUrl: state.serverUrl,
        isConnected: state.isConnected,
        isChecking: state.isChecking,
        knowledgeStatus: state.knowledgeStatus,
        hasCompletedFirstRun: state.hasCompletedFirstRun
      }))
    } catch {
      // ignore snapshot failures
    }
  }, label)
}

export async function forceConnectionState(
  page: Page,
  patch: Record<string, unknown>,
  label = 'forceConnectionState'
) {
  await page.evaluate(
    ({ patchInner, tag }) => {
      const w: any = window as any
      const store = w.__tldw_useConnectionStore
      if (!store?.getState || !store?.setState) return
      const prev = store.getState().state
      const next = {
        ...prev,
        ...patchInner
      }
      store.setState({ state: next })
      // eslint-disable-next-line no-console
      console.log('CONNECTION_DEBUG_APPLY', tag, JSON.stringify({
        phase: next.phase,
        configStep: next.configStep,
        mode: next.mode,
        errorKind: next.errorKind,
        serverUrl: next.serverUrl,
        isConnected: next.isConnected,
        isChecking: next.isChecking,
        knowledgeStatus: next.knowledgeStatus,
        hasCompletedFirstRun: next.hasCompletedFirstRun
      }))
    },
    { patchInner: patch, tag: label }
  )
}

export async function forceConnected(
  page: Page,
  overrides: Record<string, unknown> = {},
  label = 'forceConnected'
) {
  const now = Date.now()
  await forceConnectionState(
    page,
    {
      phase: 'connected',
      isConnected: true,
      isChecking: false,
      offlineBypass: true,
      errorKind: 'none',
      lastError: null,
      lastStatusCode: null,
      lastCheckedAt: now,
      knowledgeStatus: 'ready',
      knowledgeLastCheckedAt: now,
      knowledgeError: null,
      mode: 'normal',
      configStep: 'health',
      hasCompletedFirstRun: true,
      ...overrides
    },
    label
  )
}

export async function forceUnconfigured(
  page: Page,
  label = 'forceUnconfigured'
) {
  await forceConnectionState(
    page,
    {
      phase: 'unconfigured',
      isConnected: false,
      isChecking: false,
      offlineBypass: false,
      errorKind: 'none',
      knowledgeStatus: 'unknown',
      knowledgeLastCheckedAt: null,
      knowledgeError: null,
      mode: 'normal',
      configStep: 'url',
      hasCompletedFirstRun: false
    },
    label
  )
}

export async function forceErrorUnreachable(
  page: Page,
  overrides: Record<string, unknown> = {},
  label = 'forceErrorUnreachable'
) {
  const now = Date.now()
  await forceConnectionState(
    page,
    {
      phase: 'error',
      isConnected: false,
      isChecking: false,
      offlineBypass: false,
      errorKind: 'unreachable',
      lastError: 'forced-unreachable',
      lastStatusCode: 0,
      lastCheckedAt: now,
      knowledgeStatus: 'offline',
      knowledgeLastCheckedAt: now,
      knowledgeError: 'core-offline',
      mode: 'normal',
      configStep: 'health',
      ...overrides
    },
    label
  )
}

