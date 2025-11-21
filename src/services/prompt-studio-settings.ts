import { Storage } from "@plasmohq/storage"

export type PromptStudioDefaults = {
  defaultProjectId?: number | null
  executeProvider?: string
  executeModel?: string
  executeTemperature?: number
  executeMaxTokens?: number
  evalModelName?: string
  evalTemperature?: number
  evalMaxTokens?: number
  pageSize?: number
  warnSeconds?: number
}

const STORAGE_KEY = "promptStudioDefaults"

const storage = new Storage({ area: "local" })

const DEFAULTS: Required<PromptStudioDefaults> = {
  defaultProjectId: null,
  executeProvider: "openai",
  executeModel: "gpt-3.5-turbo",
  executeTemperature: 0.2,
  executeMaxTokens: 256,
  evalModelName: "gpt-3.5-turbo",
  evalTemperature: 0.2,
  evalMaxTokens: 512,
  pageSize: 10,
  warnSeconds: 30
}

export async function getPromptStudioDefaults(): Promise<PromptStudioDefaults> {
  try {
    const stored = await storage.get<PromptStudioDefaults>(STORAGE_KEY)
    return { ...DEFAULTS, ...(stored || {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function setPromptStudioDefaults(
  updates: Partial<PromptStudioDefaults>
): Promise<PromptStudioDefaults> {
  const current = await getPromptStudioDefaults()
  const next = { ...current, ...updates }
  await storage.set(STORAGE_KEY, next)
  return next
}
