import { McpClient } from './McpClient';
import { McpServerConfig, McpTool } from './types';
import { db } from '../db/dexie/schema';
import { message } from 'antd';

/**
 * Utility to sanitize server names by removing spaces and special characters.
 * @param name - The server name to sanitize.
 * @returns Sanitized server name.
 */
const sanitizeServerName = (name: string): string => {
  return name.replace(/[\s\W]+/g, '');
};

/**
 * Manages all MCP client instances and provides a unified interface
 * for interacting with all configured MCP servers.
 */
export class McpManager {
  /**
   * Normalizes the enabled field in mcpServers to use numbers (1 or 0).
   * Runs once to fix existing boolean values.
   */
  static async normalizeDatabase(): Promise<void> {
    console.log("[McpManager] Starting database normalization - Timestamp:", new Date().toISOString());
    try {
      const servers = await db.mcpServers.toArray();
      console.log("[McpManager] Servers before normalization:", JSON.stringify(servers, null, 2));
      for (const server of servers) {
        // Sanitize server name to remove spaces
        const sanitizedName = sanitizeServerName(server.name);
        if (sanitizedName !== server.name) {
          await db.mcpServers.where('id').equals(server.id).modify({
            name: sanitizedName,
          });
          console.log(`[McpManager] Sanitized server name from ${server.name} to ${sanitizedName}`);
        }
        if (typeof server.enabled !== 'number') {
          await db.mcpServers.where('id').equals(server.id).modify({
            enabled: server.enabled ? 1 : 0,
          });
          console.log(`[McpManager] Updated server ${sanitizedName} to enabled: ${server.enabled ? 1 : 0}`);
        }
        // Handle undefined or null enabled values
        if (server.enabled === undefined || server.enabled === null) {
          await db.mcpServers.where('id').equals(server.id).modify({
            enabled: 0,
          });
          console.log(`[McpManager] Set default enabled: 0 for server ${sanitizedName}`);
        }
      }
      const updatedServers = await db.mcpServers.toArray();
      console.log("[McpManager] Servers after normalization:", JSON.stringify(updatedServers, null, 2));
    } catch (error) {
      console.error("[McpManager] Error during database normalization:", error);
      message.error('Failed to normalize MCP server database.');
    }
  }

  /**
   * Fetches all tools from all enabled MCP servers.
   * @returns A promise that resolves to an array of all available tools,
   * formatted for Ollama API with prefixed names to avoid collisions.
   */
  static async getAllTools(): Promise<any[]> {
    console.log("[McpManager] Starting getAllTools - Timestamp:", new Date().toISOString());
    try {
      // Run normalization once
      await this.normalizeDatabase();
      
      // Log all servers for debugging
      const allServers: McpServerConfig[] = await db.mcpServers.toArray();
      console.log("[McpManager] All server configs:", JSON.stringify(allServers, null, 2));
      
      // Log schema for debugging
      console.log("[McpManager] mcpServers schema:", JSON.stringify(db.mcpServers.schema, null, 2));
      
      // Fetch enabled MCP server configs
      const configs: McpServerConfig[] = await db.mcpServers.where('enabled').equals(1).toArray();
      console.log("[McpManager] Enabled server configs:", JSON.stringify(configs, null, 2));
      
      if (configs.length === 0) {
        console.warn("[McpManager] No enabled MCP servers found in database");
        return [];
      }

      const allTools: any[] = [];

      for (const config of configs) {
        console.log(`[McpManager] Processing server: ${config.name} (${config.url})`);
        const client = new McpClient(config);
        try {
          console.log(`[McpManager] Connecting to ${config.name}`);
          const tools = await client.connect();
          console.log(`[McpManager] Found ${tools.length} tools from ${config.name}:`, JSON.stringify(tools, null, 2));
          // Format tools for Ollama API
          const ollamaTools = tools.map(tool => ({
            type: 'function',
            function: {
              name: `${sanitizeServerName(config.name)}::${tool.name}`, // Use sanitized name with :: delimiter
              description: tool.description || `Tool ${tool.name} from ${config.name}`,
              parameters: tool.inputSchema || { type: 'object', properties: {}, required: [] }
            }
          }));
          allTools.push(...ollamaTools);
          await client.cleanup();
          console.log(`[McpManager] Cleaned up client for ${config.name}`);
        } catch (error: any) {
          // Suppress 405 errors as they are cosmetic and handled by the SDK
          if (error.response?.status !== 405) {
            console.error(`[McpManager] Failed to fetch tools from ${config.name} (${config.url}):`, error);
            message.error(`Failed to fetch tools from ${config.name}: ${error.message}`);
          }
          // Continue to next server
        }
      }
      
      console.log("[McpManager] Total tools fetched:", JSON.stringify(allTools, null, 2));
      return allTools;
    } catch (error) {
      console.error("[McpManager] Critical error in getAllTools:", error);
      message.error('Critical error fetching MCP tools.');
      return [];
    }
  }

  /**
   * Executes a tool on the appropriate MCP server.
   * @param prefixedToolName - The name of the tool, including the server prefix (e.g., ServerName::ToolName).
   * @param args - The arguments to pass to the tool.
   * @returns A promise that resolves to the result of the tool execution.
   */
  static async executeTool(prefixedToolName: string, args: { [x: string]: unknown } | undefined): Promise<any> {
    console.log("[McpManager] Starting executeTool:", prefixedToolName, args);
    const [serverName, toolName] = prefixedToolName.split('::');
    if (!serverName || !toolName) {
      console.error("[McpManager] Invalid tool name format:", prefixedToolName);
      message.error(`Invalid tool name format: ${prefixedToolName}`);
      throw new Error(`Invalid tool name format: ${prefixedToolName}`);
    }

    // Find server config
    const config = await db.mcpServers.where('name').equals(serverName).first() ||
                   await db.mcpServers.where('name').equals(sanitizeServerName(serverName)).first();
    console.log("[McpManager] Server config for", serverName, ":", JSON.stringify(config, null, 2));
    
    if (!config) {
      console.error("[McpManager] Server config not found for server:", serverName);
      message.error(`Server config not found for server: ${serverName}`);
      throw new Error(`Server config not found for server: ${serverName}`);
    }
    
    const client = new McpClient(config);
    try {
      console.log(`[McpManager] Executing tool: ${toolName} on ${serverName} with args:`, JSON.stringify(args, null, 2));
      await client.connect();
      const result = await client.callTool(toolName, args);
      console.log(`[McpManager] Tool ${toolName} executed successfully. Result:`, JSON.stringify(result, null, 2));
      await client.cleanup();
      return result;
    } catch (error: any) {
      // Suppress 405 errors
      if (error.response?.status !== 405) {
        console.error(`[McpManager] Failed to execute tool ${toolName} on ${serverName}:`, error);
        message.error(`Failed to execute tool ${toolName}: ${error.message}`);
      }
      await client.cleanup();
      throw error;
    }
  }
}