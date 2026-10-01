import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'page-action', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  registerTools(server);
  return server;
}
