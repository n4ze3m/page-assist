export enum ConnectionPhase {
  UNCONFIGURED = "unconfigured",
  SEARCHING = "searching",
  CONNECTED = "connected",
  ERROR = "error"
}

export type KnowledgeStatus = "unknown" | "ready" | "indexing" | "offline"

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
}
