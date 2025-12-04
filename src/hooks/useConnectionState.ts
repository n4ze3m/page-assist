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
    const isConnectedUx =
      uxState === "connected_ok" ||
      uxState === "connected_degraded" ||
      uxState === "demo_mode"
    const isChecking = uxState === "testing"
    const isConfigOrError =
      uxState === "unconfigured" ||
      uxState === "configuring_url" ||
      uxState === "configuring_auth" ||
      uxState === "error_unreachable" ||
      uxState === "error_auth"

    return {
      uxState,
      mode,
      errorKind,
      configStep,
      hasCompletedFirstRun,
      isConnectedUx,
      isChecking,
      isConfigOrError
    }
  })
