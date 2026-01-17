/**
 * Generates a system prompt addition that documents available MCP tools
 * @param tools Array of tools formatted for LLM APIs
 * @returns System prompt text describing available tools
 */
export function generateMcpToolSystemPrompt(tools: any[]): string {
  if (tools.length === 0) {
    return '';
  }

  const toolDescriptions = tools.map((tool) => {
    const func = tool.function;
    const params = func.parameters?.properties || {};
    const required = func.parameters?.required || [];

    const paramDescriptions = Object.entries(params)
      .map(([name, schema]: [string, any]) => {
        const isRequired = required.includes(name);
        const type = schema.type || 'any';
        const description = schema.description || 'No description provided';
        return `  - ${name} (${type})${isRequired ? ' [required]' : ''}: ${description}`;
      })
      .join('\n');

    return `
### ${func.name}
${func.description || 'No description provided'}

Parameters:
${paramDescriptions || '  No parameters'}
`;
  }).join('\n');

  return `
## Available Tools

You have access to the following tools that you can use to help answer user queries. When you need to use a tool, call it using the function calling mechanism provided by the API.

${toolDescriptions}

When using tools:
1. Only call tools when necessary to answer the user's question
2. Provide all required parameters
3. Wait for the tool result before continuing your response
4. Interpret the tool results and incorporate them naturally into your answer
`;
}
