import { getEnabledMcpServers } from "@/db/dexie/mcp"
import { isPageActionServer } from "@/services/page-action"
import { isWebMcpServer } from "@/services/webmcp"
import { McpServer } from "./types"
import { HttpOnlyMcpClient } from "./http-client"

export const getConfiguredMcpServers = async () => {
  const servers = await getEnabledMcpServers()
  // Page Action only joins sidepanel chats via its dedicated toggle
  // (extraMcpServers); its tools cannot act on the web UI's own tab.
  return servers.filter(
    (server) => !isPageActionServer(server) && !isWebMcpServer(server)
  )
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
