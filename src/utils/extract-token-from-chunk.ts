export function extractTokenFromChunk(chunk: unknown): string {
  if (typeof chunk === "string") return chunk
  if (typeof chunk === "object" && chunk !== null) {
    const c = chunk as Record<string, any>
    return (
      c.content ??
      (Array.isArray(c.choices) ? c.choices[0]?.delta?.content : "") ??
      ""
    )
  }
  return ""
}

