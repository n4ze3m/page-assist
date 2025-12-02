export enum ConnectionPhase {
  UNCONFIGURED = "unconfigured",
  SEARCHING = "searching",
  CONNECTED = "connected",
  ERROR = "error"
}

export type KnowledgeStatus =
  | "unknown"
  | "ready"
  | "indexing"
  | "offline"
  | "empty"

export type ConnectionState = {
  phase: ConnectionPhase
  serverUrl: string | null
  lastCheckedAt: number | null
  lastError: string | null
  lastStatusCode: number | null
  isConnected: boolean
  isChecking: boolean
  offlineBypass?: boolean
  knowledgeStatus: KnowledgeStatus
  knowledgeLastCheckedAt: number | null
  knowledgeError: string | null

  // UX metadata (shared across Options, Sidepanel, Diagnostics)
  mode: "normal" | "demo"
  configStep: "none" | "url" | "auth" | "health"
  errorKind: "none" | "auth" | "unreachable" | "partial"
  hasCompletedFirstRun: boolean

  // Debug/observability hooks (no external telemetry):
  // count how many times we've re-checked connectivity since the last
  // config change so diagnostics/UX can spot unproductive retry loops.
  lastConfigUpdatedAt: number | null
  checksSinceConfigChange: number
}

export type ConnectionUxState =
  | "unconfigured"
  | "configuring_url"
  | "configuring_auth"
  | "testing"
  | "connected_ok"
  | "connected_degraded"
  | "error_unreachable"
  | "error_auth"
  | "demo_mode"

export const deriveConnectionUxState = (
  state: ConnectionState
): ConnectionUxState => {
  const {
    mode,
    phase,
    configStep,
    isChecking,
    errorKind,
    offlineBypass,
    isConnected,
    knowledgeStatus
  } = state

  // Demo mode is a distinct UX surface regardless of underlying phase.
  if (mode === "demo") {
    return "demo_mode"
  }

  // Explicit onboarding steps when unconfigured.
  if (phase === ConnectionPhase.UNCONFIGURED) {
    if (configStep === "url") {
      return "configuring_url"
    }
    if (configStep === "auth") {
      return "configuring_auth"
    }
    return "unconfigured"
  }

  // Any active check maps to a testing state.
  if (phase === ConnectionPhase.SEARCHING || isChecking) {
    return "testing"
  }

  // Treat offline bypass the same as a healthy connection for UX.
  if (offlineBypass && isConnected) {
    return "connected_ok"
  }

  if (phase === ConnectionPhase.CONNECTED) {
    const degraded =
      errorKind === "partial" || knowledgeStatus === "offline"
    return degraded ? "connected_degraded" : "connected_ok"
  }

  if (phase === ConnectionPhase.ERROR) {
    if (errorKind === "auth") {
      return "error_auth"
    }
    return "error_unreachable"
  }

  // Fallback – treat unknown combinations as unconfigured.
  return "unconfigured"
}
