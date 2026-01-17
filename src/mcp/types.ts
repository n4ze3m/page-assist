/**
 * MCP (Model Context Protocol) Type Definitions
 */

/**
 * MCP Server Configuration
 * Stored in database to manage MCP server connections
 */
export interface McpServerConfig {
  id?: number;
  name: string;
  url: string;
  enabled: number; // 1 for enabled, 0 for disabled (boolean stored as number for Dexie)
  env?: Record<string, string>; // Environment variables for the server
  args?: string[]; // Command line arguments for stdio servers
}

/**
 * MCP Tool Definition
 * Represents a tool available from an MCP server
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

/**
 * Tool Execution Result
 * Response from executing a tool on an MCP server
 */
export interface McpToolResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
}
