// Legacy helper for probing OpenAI-compatible /models endpoints.
// The extension is now tldw_server-only and no longer talks to
// third-party providers directly, so this function is kept only
// to satisfy older imports and always returns an empty list.

type Model = {
  id: string
  name?: string
}

export const getAllOpenAIModels = async (_: {
  baseUrl: string
  apiKey?: string
  customHeaders?: { key: string; value: string }[]
}): Promise<Model[]> => {
  return []
}
