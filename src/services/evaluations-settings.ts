import { Storage } from "@plasmohq/storage"

export type EvaluationDefaults = {
  defaultEvalType?: string
  defaultTargetModel?: string
  defaultSpecByType?: Record<string, string>
  defaultRunConfig?: string
  defaultDatasetId?: string | null
}

const STORAGE_KEY = "evaluationsDefaults"

const storage = new Storage({ area: "local" })

const DEFAULTS: Required<EvaluationDefaults> = {
  defaultEvalType: "response_quality",
  defaultTargetModel: "gpt-3.5-turbo",
  defaultSpecByType: {},
  defaultRunConfig: JSON.stringify({ batch_size: 10 }, null, 2),
  defaultDatasetId: null
}

export async function getEvaluationDefaults(): Promise<EvaluationDefaults> {
  try {
    const stored = await storage.get<EvaluationDefaults>(STORAGE_KEY)
    return { ...DEFAULTS, ...(stored || {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

export async function setEvaluationDefaults(
  updates: Partial<EvaluationDefaults>
): Promise<EvaluationDefaults> {
  const current = await getEvaluationDefaults()
  const next = { ...current, ...updates }
  await storage.set(STORAGE_KEY, next)
  return next
}

export async function setDefaultSpecForType(
  evalType: string,
  specJson: string
): Promise<EvaluationDefaults> {
  const current = await getEvaluationDefaults()
  const byType = { ...(current.defaultSpecByType || {}) }
  byType[evalType] = specJson
  return await setEvaluationDefaults({ defaultSpecByType: byType })
}
