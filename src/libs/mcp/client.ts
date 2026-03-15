import { getEnabledMcpServers } from "@/db/dexie/mcp"
import { McpServer } from "./types"
import { HttpOnlyMcpClient } from "./http-client"

export const getConfiguredMcpServers = async () => {
  return await getEnabledMcpServers()
}

export const createMcpClient = (
  servers: McpServer[],
  callbacks?: {
    onProgress?: (...args: any[]) => void
    beforeToolCall?: (...args: any[]) => any
    afterToolCall?: (...args: any[]) => any
  }
) => {
  return new HttpOnlyMcpClient(servers, callbacks)
}
