import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig, McpTool, McpToolResult } from './types';

/**
 * MCP Client for connecting to and interacting with MCP servers
 * Uses the official @modelcontextprotocol/sdk with stdio transport
 */
export class McpClient {
  private config: McpServerConfig;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(config: McpServerConfig) {
    this.config = config;
  }

  /**
   * Connect to the MCP server and list available tools
   * @returns Array of tools available from this server
   */
  async connect(): Promise<McpTool[]> {
    try {
      // Determine command based on server URL/type
      // For now, we'll support local command execution
      // URL format: "command://python|node|npx <script_path>"
      const urlMatch = this.config.url.match(/^command:\/\/(.+)$/);
      if (!urlMatch) {
        throw new Error(`Invalid URL format for ${this.config.name}. Expected: command://<command> <args...>`);
      }

      const commandString = urlMatch[1];
      const [command, ...commandArgs] = commandString.split(' ');

      // Combine command args with config args
      const allArgs = [...commandArgs, ...(this.config.args || [])];

      // Create stdio transport for local MCP servers
      this.transport = new StdioClientTransport({
        command,
        args: allArgs,
        env: this.config.env
      });

      // Create MCP client
      this.client = new Client({
        name: 'page-assist',
        version: '1.0.0',
      }, {
        capabilities: {}
      });

      // Connect to server
      await this.client.connect(this.transport);

      // List available tools
      const response = await this.client.listTools();

      // Map SDK tool format to our McpTool format
      const tools: McpTool[] = response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema || { type: 'object', properties: {}, required: [] }
      }));

      console.log(`[McpClient] Connected to ${this.config.name}, found ${tools.length} tools`);
      return tools;
    } catch (error) {
      console.error(`[McpClient] Failed to connect to ${this.config.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a tool on the MCP server
   * @param toolName Name of the tool to execute
   * @param args Arguments to pass to the tool
   * @returns Tool execution result
   */
  async callTool(toolName: string, args?: { [key: string]: unknown }): Promise<McpToolResult> {
    if (!this.client) {
      throw new Error(`[McpClient] Not connected to ${this.config.name}`);
    }

    try {
      console.log(`[McpClient] Calling tool ${toolName} on ${this.config.name} with args:`, args);

      const response = await this.client.callTool({
        name: toolName,
        arguments: args || {}
      });

      console.log(`[McpClient] Tool ${toolName} executed successfully:`, response);

      return response as McpToolResult;
    } catch (error: any) {
      console.error(`[McpClient] Tool execution failed for ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Clean up client connection
   */
  async cleanup(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      console.log(`[McpClient] Cleaned up connection to ${this.config.name}`);
    } catch (error) {
      console.error(`[McpClient] Error during cleanup for ${this.config.name}:`, error);
    }
  }
}
