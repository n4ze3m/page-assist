import { DynamicStructuredTool } from "@langchain/core/tools"
import type { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { normalizeMcpToolSchema } from "./tool-schema"
import { McpServer } from "./types"
import { createMcpActionInfo, MCP_TOOL_NAME_SEPARATOR } from "./utils"
import {
  closeMcpServerConnection,
  listRemoteMcpTools,
  openMcpServerConnection
} from "./remote-tools"

type McpClientCallbacks = {
  onProgress?: (...args: any[]) => void
  beforeToolCall?: (...args: any[]) => any
  afterToolCall?: (...args: any[]) => any
}

type ConnectedServer = {
  server: McpServer
  client: Awaited<ReturnType<typeof openMcpServerConnection>>["client"]
  transport: Awaited<ReturnType<typeof openMcpServerConnection>>["transport"]
  toolsPromise?: Promise<DynamicStructuredTool[]>
}

const serializeResultValue = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value ?? "")
  }
}

const toArgumentRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const readToolContent = (content: any) => {
  if (!content || typeof content !== "object") {
    return String(content ?? "")
  }

  switch (content.type) {
    case "text":
      return typeof content.text === "string" ? content.text : ""
    case "image":
      return `[Image output${content.mimeType ? `: ${content.mimeType}` : ""}]`
    case "audio":
      return `[Audio output${content.mimeType ? `: ${content.mimeType}` : ""}]`
    case "resource":
      if (content.resource?.text) {
        return content.resource.text
      }

      if (content.resource?.uri) {
        return `[Resource: ${content.resource.uri}]`
      }

      return serializeResultValue(content.resource)
    case "resource_link":
      return content.uri ? `[Resource link: ${content.uri}]` : serializeResultValue(content)
    default:
      return serializeResultValue(content)
  }
}

const formatToolResponse = (result: any) => {
  const textParts = Array.isArray(result?.content)
    ? result.content.map((item: unknown) => readToolContent(item)).filter(Boolean)
    : []

  if (result?.structuredContent != null) {
    textParts.push(serializeResultValue(result.structuredContent))
  }

  const content = textParts.join("\n\n").trim() || "Tool executed successfully."

  const artifact =
    result?.structuredContent != null || result?._meta != null
      ? {
          structuredContent: result?.structuredContent,
          meta: result?._meta
        }
      : undefined

  return [content, artifact] as const
}

const buildToolErrorMessage = (toolName: string, serverName: string, result: any) => {
  const detail = formatToolResponse(result)[0] || "Unknown MCP tool error"
  return `MCP tool "${toolName}" on server "${serverName}" failed: ${detail}`
}

const buildRequestOptions = ({
  signal,
  timeout,
  metadata,
  onProgress
}: {
  signal?: AbortSignal
  timeout?: number
  metadata?: Record<string, any>
  onProgress?: (...args: any[]) => void
}) => {
  const timeoutMs =
    typeof metadata?.timeoutMs === "number" && metadata.timeoutMs > 0
      ? metadata.timeoutMs
      : typeof timeout === "number" && timeout > 0
        ? timeout
        : undefined

  return {
    ...(signal ? { signal } : {}),
    ...(timeoutMs ? { timeout: timeoutMs } : {}),
    ...(onProgress
      ? {
          onprogress: (progress: any) => onProgress(progress)
        }
      : {})
  }
}

const createLangChainTool = ({
  client,
  server,
  remoteTool,
  callbacks
}: {
  client: Client
  server: McpServer
  remoteTool: any
  callbacks?: McpClientCallbacks
}) => {
  const prefixedToolName = `${server.name}${MCP_TOOL_NAME_SEPARATOR}${remoteTool.name}`

  return new DynamicStructuredTool({
    name: prefixedToolName,
    description: remoteTool.description || "",
    schema: normalizeMcpToolSchema(remoteTool.inputSchema),
    responseFormat: "content_and_artifact",
    metadata: {
      serverName: server.name,
      toolName: remoteTool.name
    },
    func: async (args, _runManager, config) => {
      const interception = await callbacks?.beforeToolCall?.(
        {
          name: remoteTool.name,
          args,
          serverName: server.name
        },
        {},
        config ?? {}
      )

      const normalizedArgs = toArgumentRecord(args)
      const finalArgs = {
        ...normalizedArgs,
        ...toArgumentRecord(interception?.args)
      }

      const response = await client.callTool(
        {
          name: remoteTool.name,
          arguments: finalArgs
        },
        undefined,
        buildRequestOptions({
          signal: config?.signal,
          timeout: config?.timeout,
          metadata: config?.metadata,
          onProgress: callbacks?.onProgress
            ? (progress: any) =>
                callbacks.onProgress?.(
                  progress,
                  createMcpActionInfo("waiting_result", {
                    serverName: server.name,
                    toolName: remoteTool.name
                  })
                )
            : undefined
        })
      )

      if (response?.isError) {
        throw new Error(buildToolErrorMessage(remoteTool.name, server.name, response))
      }

      const resultTuple = formatToolResponse(response)
      const interceptedResult = await callbacks?.afterToolCall?.(
        {
          name: remoteTool.name,
          args: finalArgs,
          result: resultTuple,
          serverName: server.name
        },
        {},
        config ?? {}
      )

      if (Array.isArray(interceptedResult?.result)) {
        return interceptedResult.result
      }

      return resultTuple
    }
  })
}

export class HttpOnlyMcpClient {
  private readonly callbacks?: McpClientCallbacks
  private readonly connections = new Map<string, ConnectedServer>()
  private toolsPromise?: Promise<DynamicStructuredTool[]>

  constructor(servers: McpServer[], callbacks?: McpClientCallbacks) {
    this.servers = servers
    this.callbacks = callbacks
  }

  private readonly servers: McpServer[]

  async getTools() {
    if (!this.toolsPromise) {
      this.toolsPromise = this.loadTools()
    }

    try {
      return await this.toolsPromise
    } catch (error) {
      this.toolsPromise = undefined
      throw error
    }
  }

  async close() {
    this.toolsPromise = undefined

    const activeConnections = Array.from(this.connections.values())
    this.connections.clear()

    await Promise.allSettled(
      activeConnections.map(async ({ client, transport }) =>
        closeMcpServerConnection({
          client,
          transport
        })
      )
    )
  }

  private async loadTools() {
    const toolGroups = await Promise.all(
      this.servers.map(async (server) => {
        const connection = await this.getConnection(server)
        return await this.loadToolsForConnection(connection)
      })
    )

    return toolGroups.flat()
  }

  private async getConnection(server: McpServer) {
    const existingConnection = this.connections.get(server.id)
    if (existingConnection) {
      return existingConnection
    }
    const { client, transport } = await openMcpServerConnection(server)

    const connection: ConnectedServer = {
      server,
      client,
      transport
    }

    this.connections.set(server.id, connection)
    return connection
  }

  private async loadToolsForConnection(connection: ConnectedServer) {
    if (!connection.toolsPromise) {
      connection.toolsPromise = this.fetchTools(connection)
    }

    try {
      return await connection.toolsPromise
    } catch (error) {
      connection.toolsPromise = undefined
      throw error
    }
  }

  private async fetchTools(connection: ConnectedServer) {
    const remoteTools = await listRemoteMcpTools(
      connection.client,
      connection.server.name
    )

    return remoteTools.map((remoteTool) =>
      createLangChainTool({
        client: connection.client,
        server: connection.server,
        remoteTool,
        callbacks: this.callbacks
      })
    )
  }
}
