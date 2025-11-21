import { tldwClient } from "./TldwApiClient"

export type TldwTtsModel = {
  id: string
  label: string
}

const FALLBACK_MODELS = [
  "tts-1",
  "tts-1-hd",
  "kokoro",
  "higgs",
  "chatterbox",
  "vibevoice"
]

export const fetchTldwTtsModels = async (): Promise<TldwTtsModel[]> => {
  const seen = new Set<string>()
  const models: string[] = []

  try {
    const spec = await tldwClient.getOpenAPISpec()
    const modelSchema =
      spec?.components?.schemas?.OpenAISpeechRequest?.properties?.model

    if (modelSchema) {
      if (Array.isArray(modelSchema.enum)) {
        for (const v of modelSchema.enum) {
          const id = String(v).trim()
          if (id && !seen.has(id)) {
            seen.add(id)
            models.push(id)
          }
        }
      } else if (typeof modelSchema.description === "string") {
        const desc = modelSchema.description as string
        const match = desc.match(/Supported models?:\s*([^\.]+)/i)
        if (match && match[1]) {
          const parts = match[1]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
          for (const p of parts) {
            const id = p
            if (id && !seen.has(id)) {
              seen.add(id)
              models.push(id)
            }
          }
        }
      }
    }
  } catch {
    // Ignore and fall back to static list below.
  }

  for (const id of FALLBACK_MODELS) {
    if (!seen.has(id)) {
      seen.add(id)
      models.push(id)
    }
  }

  return models.map((id) => ({
    id,
    label: id
  }))
}

