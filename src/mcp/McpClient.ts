import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpServerConfig } from '@/db/dexie/types';
import { McpTool } from './types';

export class McpClient {
  private mcp: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  public tools: McpTool[] = [];

  constructor(private serverConfig: McpServerConfig) {
    this.mcp = new Client({
      name: 'PageAssist-MCP-Client',
      version: '1.0.0'
    });
  }

  /**
   * Connects to the MCP server, initializes the session, and fetches the available tools.
   */
  async connect(): Promise<McpTool[]> {
    try {
      const url = new URL(this.serverConfig.url);
      this.transport = new StreamableHTTPClientTransport(url);
      
      // The SDK's connect method handles the initialize/initialized handshake
      await this.mcp.connect(this.transport);
      
      this.setupTransportHandlers();

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools as any;
      
      return this.tools;
    } catch (e) {
      console.error(`[McpClient] Failed to connect to MCP server at ${this.serverConfig.url}:`, e);
      await this.cleanup();
      throw e; // Re-throw the error to be handled by the caller (e.g., the UI)
    }
  }

  private setupTransportHandlers() {
    if (!this.transport) return;

    this.transport.onclose = async () => {
      console.log(`[McpClient] Transport to ${this.serverConfig.url} closed.`);
      await this.cleanup();
    };

    this.transport.onerror = async (error) => {
      // The SDK may emit an error on graceful close, so we check if the transport is still active.
      if (this.transport) {
        console.error(`[McpClient] Transport error for ${this.serverConfig.url}:`, error);
        await this.cleanup();
      }
    };
  }

  /**
   * Executes a specific tool on the server.
   * @param toolName - The name of the tool to execute.
   * @param args - The arguments for the tool.
   * @returns The result from the tool call.
   */
  async callTool(toolName: string, args: { [x: string]: unknown } | undefined) {
    return this.mcp.callTool({
      name: toolName,
      arguments: args,
    });
  }

  /**
   * Gracefully closes the MCP connection and cleans up resources.
   */
  async cleanup() {
    if (!this.transport) {
      // Cleanup has already been called
      return;
    }
    const transportToClose = this.transport;
    this.transport = null; // Set to null immediately to prevent re-entry
    try {
      await this.mcp.close();
    } catch (e) {
      // Ignore errors during close, as the connection might already be severed.
    }
  }
}