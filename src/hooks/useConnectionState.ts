import { useConnectionStore } from "@/store/connection"
import { deriveConnectionUxState } from "@/types/connection"

export const useConnectionState = () => useConnectionStore((s) => s.state)

export const useConnectionActions = () =>
  useConnectionStore((s) => ({
    checkOnce: s.checkOnce,
    setServerUrl: s.setServerUrl,
    enableOfflineBypass: s.enableOfflineBypass,
    disableOfflineBypass: s.disableOfflineBypass,
    beginOnboarding: s.beginOnboarding,
    setConfigPartial: s.setConfigPartial,
    testConnectionFromOnboarding: s.testConnectionFromOnboarding,
    setDemoMode: s.setDemoMode,
    markFirstRunComplete: s.markFirstRunComplete
  }))

export const useKnowledgeStatus = () =>
  useConnectionStore((s) => ({
    knowledgeStatus: s.state.knowledgeStatus,
    knowledgeLastCheckedAt: s.state.knowledgeLastCheckedAt,
    knowledgeError: s.state.knowledgeError
  }))

export const useConnectionUxState = () =>
  useConnectionStore((s) => {
    const { mode, configStep, errorKind, hasCompletedFirstRun } = s.state
    const uxState = deriveConnectionUxState(s.state)
    return { uxState, mode, errorKind, configStep, hasCompletedFirstRun }
  })
