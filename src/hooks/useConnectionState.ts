import { useConnectionStore } from "@/store/connection"

export const useConnectionState = () => useConnectionStore((s) => s.state)

export const useConnectionActions = () =>
  useConnectionStore((s) => ({
    checkOnce: s.checkOnce,
    setServerUrl: s.setServerUrl
  }))

export const useKnowledgeStatus = () =>
  useConnectionStore((s) => ({
    knowledgeStatus: s.state.knowledgeStatus,
    knowledgeLastCheckedAt: s.state.knowledgeLastCheckedAt,
    knowledgeError: s.state.knowledgeError
  }))

