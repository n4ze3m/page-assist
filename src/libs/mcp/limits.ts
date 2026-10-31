import { Storage } from "@plasmohq/storage"

export const MCP_MAX_TOOL_ROUNDS_KEY = "mcpMaxToolRounds"
export const DEFAULT_MCP_MAX_TOOL_ROUNDS = 20
export const MIN_MCP_MAX_TOOL_ROUNDS = 1
export const MAX_MCP_MAX_TOOL_ROUNDS = 100

const storage = new Storage()

export const clampMcpMaxToolRounds = (value: unknown): number => {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MCP_MAX_TOOL_ROUNDS
  }
  return Math.min(
    MAX_MCP_MAX_TOOL_ROUNDS,
    Math.max(MIN_MCP_MAX_TOOL_ROUNDS, parsed)
  )
}

export const getMcpMaxToolRounds = async (): Promise<number> => {
  try {
    const stored = await storage.get(MCP_MAX_TOOL_ROUNDS_KEY)
    if (stored === undefined || stored === null || stored === "") {
      return DEFAULT_MCP_MAX_TOOL_ROUNDS
    }
    return clampMcpMaxToolRounds(stored)
  } catch {
    return DEFAULT_MCP_MAX_TOOL_ROUNDS
  }
}
