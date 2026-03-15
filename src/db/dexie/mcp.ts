import { db } from "./schema"
import { McpServer } from "@/libs/mcp/types"
import { buildMcpHeaders, normalizeMcpServerInput } from "@/libs/mcp/utils"

export const generateMcpServerId = () => {
  return "mcp-xxxx-xxx-xxxx".replace(/[x]/g, () => {
    const r = Math.floor(Math.random() * 16)
    return r.toString(16)
  })
}

export class McpServerDb {
  getAll = async (): Promise<McpServer[]> => {
    return await db.mcpServers.orderBy("createdAt").reverse().toArray()
  }

  getEnabled = async (): Promise<McpServer[]> => {
    return await db.mcpServers.filter((server) => server.enabled).toArray()
  }

  getById = async (id: string): Promise<McpServer | undefined> => {
    return await db.mcpServers.get(id)
  }

  create = async (server: McpServer): Promise<void> => {
    await db.mcpServers.add(server)
  }

  update = async (server: McpServer): Promise<void> => {
    await db.mcpServers.put(server)
  }

  delete = async (id: string): Promise<void> => {
    await db.mcpServers.delete(id)
  }

  async importDataV2(
    data: McpServer[],
    options: {
      replaceExisting?: boolean
      mergeData?: boolean
    } = {}
  ): Promise<void> {
    const { replaceExisting = false, mergeData = true } = options

    for (const server of data) {
      const existing = await this.getById(server.id)

      if (existing && !replaceExisting) {
        if (mergeData) {
          await this.update({
            ...existing,
            ...server
          })
        }
        continue
      }

      await this.update(server)
    }
  }
}

export const addMcpServer = async (server: Omit<McpServer, "id" | "createdAt" | "updatedAt">) => {
  const mcpDb = new McpServerDb()
  const now = Date.now()
  const data: McpServer = {
    ...server,
    ...normalizeMcpServerInput(server),
    id: generateMcpServerId(),
    createdAt: now,
    updatedAt: now
  }

  await mcpDb.create(data)
  return data.id
}

export const updateMcpServer = async (
  server: Partial<McpServer> & Pick<McpServer, "id">
) => {
  const mcpDb = new McpServerDb()
  const existing = await mcpDb.getById(server.id)

  if (!existing) {
    throw new Error("MCP server not found")
  }

  const data: McpServer = {
    ...existing,
    ...server,
    ...normalizeMcpServerInput({
      ...existing,
      ...server
    }),
    updatedAt: Date.now()
  }

  await mcpDb.update(data)
  return data
}

export const deleteMcpServer = async (id: string) => {
  const mcpDb = new McpServerDb()
  await mcpDb.delete(id)
}

export const getAllMcpServers = async () => {
  const mcpDb = new McpServerDb()
  return await mcpDb.getAll()
}

export const getEnabledMcpServers = async () => {
  const mcpDb = new McpServerDb()
  return await mcpDb.getEnabled()
}

export const exportMcpServers = async () => {
  const mcpDb = new McpServerDb()
  return await mcpDb.getAll()
}

export const importMcpServersV2 = async (
  data: McpServer[],
  options: {
    replaceExisting?: boolean
    mergeData?: boolean
  } = {}
) => {
  const mcpDb = new McpServerDb()
  return await mcpDb.importDataV2(data, options)
}

export const getMcpServerHeaders = (server: McpServer) =>
  buildMcpHeaders({
    authType: server.authType,
    bearerToken: server.bearerToken,
    headers: server.headers,
    oauthTokens: server.oauthTokens
  })
