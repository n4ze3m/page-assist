/**
 * Generates a system prompt for the chatbot, incorporating available MCP tools in Ollama format.
 * @param tools - Array of tools in Ollama format as returned by McpManager.getAllTools.
 * @returns A string containing the system prompt with tool descriptions.
 */
export const generateMcpToolSystemPrompt = (tools: any[]): string => {
  if (tools.length === 0) {
    return "You are a helpful assistant.";
  }

  const toolList = tools
    .map(
      (tool) =>
        `- ${tool.function.name}: ${tool.function.description}\n  Parameters: ${JSON.stringify(
          tool.function.parameters,
          null,
          2
        )}`
    )
    .join("\n");

  return `You are a helpful assistant with access to the following tools. When a user request matches a tool's purpose, respond **only** with a JSON object in this format to invoke the tool:

\`\`\`json
{
  "tool": "tool_name",
  "args": {
    "arg1": "value1",
    "arg2": "value2"
  }
}
\`\`\`

After receiving the tool's result, interpret the result to address the user's original query in a clear, human-readable text response, extracting relevant content (e.g., the 'text' field from the tool's response) and presenting it naturally without JSON formatting. If the request does not require a tool, provide a direct text response without JSON.

Available tools:
${toolList}`;
};