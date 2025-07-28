// Describes the configuration for a single MCP Server
export interface McpServerConfig {
  id: string;          // A unique identifier, likely a UUID
  name: string;        // A user-friendly name for the server
  url: string;         // The base URL of the MCP server
  apiKey?: string;     // An optional API key for authentication
  enabled: boolean;    // Whether this server's tools should be active
}

// Describes a single tool provided by an MCP Server, based on the 'introspect' response
export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>; // JSON schema for tool parameters
}