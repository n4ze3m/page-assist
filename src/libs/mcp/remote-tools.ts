import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker"
import { getMcpErrorMessage } from "./errors"
import { McpAvailableTool, McpServerInput } from "./types"
import { buildMcpHeaders, getMcpToolExecutionMode, isMcpToolEnabled } from "./utils"
import { Implementation } from "@modelcontextprotocol/sdk/types.js"

export type McpConnectableServer = Pick<
  McpServerInput,
  "name" | "url" | "authType" | "bearerToken" | "headers" | "oauthTokens"
>

export type McpRemoteTool = {
  name: string
  description?: string
  inputSchema?: unknown
}

export type McpServerConnection = {
  client: Client
  transport: StreamableHTTPClientTransport
}

export type McpToolValidationResult = {
  cachedTools: McpAvailableTool[]
  toolsLastSyncedAt: number
  toolsSyncError?: string
}

const MCP_CLIENT_INFO: Implementation = {
  name: "page-assist",
  version: "1",
  description: "Use your locally running AI models to assist you in your web browsing",
  title: "Page Assist",
  websiteUrl: "https://pageassist.xyz",
  icons: [
    {
      src: "https://pageassist.xyz/favicon.ico",
      mimeType: "image/x-icon",
      theme: "dark"
    }
  ]
}

export const openMcpServerConnection = async (
  server: McpConnectableServer
): Promise<McpServerConnection> => {
  let url: URL
  try {
    url = new URL(server.url)
  } catch (error) {
    throw new Error(`Invalid MCP URL for server "${server.name}"`)
  }

  const headers = buildMcpHeaders({
    authType: server.authType,
    bearerToken: server.bearerToken,
    headers: server.headers,
    oauthTokens: server.oauthTokens
  })

  const transport = new StreamableHTTPClientTransport(url, {
    ...(Object.keys(headers).length > 0
      ? { requestInit: { headers } }
      : {})
  })

  const client = new Client(MCP_CLIENT_INFO, {
    jsonSchemaValidator: new CfWorkerJsonSchemaValidator()
  })

  try {
    await client.connect(transport)
  } catch (error) {
    throw new Error(
      `Failed to connect to MCP server "${server.name}": ${getMcpErrorMessage(error)}`
    )
  }

  return {
    client,
    transport
  }
}

export const closeMcpServerConnection = async (
  connection: McpServerConnection
) => {
  try {
    await connection.transport.terminateSession?.()
  } catch (error) {
    // Ignore session termination errors during cleanup.
  }

  await connection.client.close()
}

export const listRemoteMcpTools = async (
  client: Client,
  serverName: string
): Promise<McpRemoteTool[]> => {
  const tools: McpRemoteTool[] = []
  let cursor: string | undefined = undefined

  try {
    do {
      const response = await client.listTools(cursor ? { cursor } : undefined)

      for (const remoteTool of response.tools || []) {
        if (!remoteTool?.name) {
          continue
        }

        tools.push({
          name: remoteTool.name,
          description: remoteTool.description || undefined,
          inputSchema: remoteTool.inputSchema
        })
      }

      cursor = response.nextCursor
    } while (cursor)
  } catch (error) {
    throw new Error(
      `Failed to load MCP tools from "${serverName}": ${getMcpErrorMessage(error)}`
    )
  }

  return tools
}

export const toCachedMcpTools = (
  tools: McpRemoteTool[],
  existingTools?: McpAvailableTool[]
): McpAvailableTool[] => {
  const existingByName = new Map(
    (existingTools || []).map((t) => [t.name, t])
  )
  return tools.map((tool) => {
    const existingTool = existingByName.get(tool.name)
    const executionMode = getMcpToolExecutionMode(existingTool)

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      enabled: isMcpToolEnabled({ executionMode }),
      executionMode
    }
  })
}

export const inspectMcpServerTools = async (
  server: McpConnectableServer & { cachedTools?: McpAvailableTool[] }
): Promise<McpToolValidationResult> => {
  const connection = await openMcpServerConnection(server)

  try {
    const cachedTools = toCachedMcpTools(
      await listRemoteMcpTools(connection.client, server.name),
      server.cachedTools
    )

    if (cachedTools.length === 0) {
      throw new Error(`No MCP tools were loaded from "${server.name}".`)
    }

    return {
      cachedTools,
      toolsLastSyncedAt: Date.now(),
      toolsSyncError: undefined
    }
  } finally {
    await closeMcpServerConnection(connection)
  }
}
