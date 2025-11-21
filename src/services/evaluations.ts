import { apiSend } from "@/services/api-send"

// Lightweight client for the Evaluations module.
// Shapes are intentionally loose for now; we can tighten them
// using OpenAPI-derived types later if needed.

export type EvaluationSummary = {
  id: string
  name?: string
  description?: string
  eval_type?: string
  created?: number
}

export type EvaluationRunSummary = {
  id: string
  status?: string
  created_at?: string
  completed_at?: string | null
}

export type EvaluationListResponse = {
  object?: "list"
  data: EvaluationSummary[]
  has_more?: boolean
  first_id?: string | null
  last_id?: string | null
}

export type DatasetSample = {
  input: any
  expected?: any
  metadata?: Record<string, any>
}

export type DatasetResponse = {
  id: string
  object?: string
  name: string
  description?: string | null
  sample_count: number
  created: number
  created_at?: number | null
  created_by: string
  metadata?: Record<string, any> | null
}

export type DatasetListResponse = {
  object?: "list"
  data: DatasetResponse[]
  has_more?: boolean
  first_id?: string | null
  last_id?: string | null
  total?: number | null
}

export type EvaluationRateLimitStatus = {
  tier: string
  limits: {
    evaluations_per_minute: number
    evaluations_per_day: number
    tokens_per_day: number
    cost_per_day: number
    cost_per_month: number
  }
  usage: {
    evaluations_today: number
    tokens_today: number
    cost_today: number
    cost_month: number
  }
  remaining: {
    daily_evaluations: number
    daily_tokens: number
    daily_cost: number
    monthly_cost: number
  }
  reset_at: string
}

export type EvaluationRunDetail = {
  id: string
  eval_id: string
  status: string
  target_model: string
  created: number
  created_at?: number | null
  started_at?: number | null
  completed_at?: number | null
  progress?: Record<string, any> | null
  error_message?: string | null
  results?: Record<string, any> | null
  usage?: Record<string, any> | null
}

export type CreateEvaluationPayload = {
  name: string
  description?: string
  eval_type: string
  eval_spec: any
  dataset_id?: string
  dataset?: DatasetSample[]
  metadata?: Record<string, any>
}

export type CreateRunPayload = {
  target_model: string
  config?: Record<string, any>
  webhook_url?: string
}

export async function listEvaluations(params?: {
  limit?: number
  after?: string
  eval_type?: string
}) {
  const query = new URLSearchParams()
  if (params?.limit != null) query.set("limit", String(params.limit))
  if (params?.after) query.set("after", params.after)
  if (params?.eval_type) query.set("eval_type", params.eval_type)

  const path =
    "/api/v1/evaluations" + (query.toString() ? `?${query.toString()}` : "")

  return await apiSend<EvaluationListResponse>({
    path: path as any,
    method: "GET"
  })
}

export async function listRuns(evalId: string, params?: { limit?: number }) {
  const query = new URLSearchParams()
  if (params?.limit != null) query.set("limit", String(params.limit))
  const path =
    `/api/v1/evaluations/${encodeURIComponent(evalId)}/runs` +
    (query.toString() ? `?${query.toString()}` : "")

  return await apiSend<{
    object?: "list"
    data: EvaluationRunSummary[]
    has_more?: boolean
    first_id?: string | null
    last_id?: string | null
  }>({
    path: path as any,
    method: "GET"
  })
}

export async function getRateLimits() {
  return await apiSend<EvaluationRateLimitStatus>({
    path: "/api/v1/evaluations/rate-limits" as any,
    method: "GET"
  })
}

export async function listDatasets(params?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams()
  if (params?.limit != null) query.set("limit", String(params.limit))
  if (params?.offset != null) query.set("offset", String(params.offset))

  const path =
    "/api/v1/evaluations/datasets" +
    (query.toString() ? `?${query.toString()}` : "")

  return await apiSend<DatasetListResponse>({
    path: path as any,
    method: "GET"
  })
}

export async function createDataset(payload: {
  name: string
  description?: string
  samples: DatasetSample[]
  metadata?: Record<string, any>
}) {
  return await apiSend<DatasetResponse>({
    path: "/api/v1/evaluations/datasets" as any,
    method: "POST",
    body: payload
  })
}

export async function deleteDataset(datasetId: string) {
  return await apiSend<void>({
    path: `/api/v1/evaluations/datasets/${encodeURIComponent(
      datasetId
    )}` as any,
    method: "DELETE"
  })
}

export async function createEvaluation(payload: CreateEvaluationPayload) {
  return await apiSend({
    path: "/api/v1/evaluations" as any,
    method: "POST",
    body: payload
  })
}

export async function createRun(evalId: string, payload: CreateRunPayload) {
  return await apiSend({
    path: `/api/v1/evaluations/${encodeURIComponent(evalId)}/runs` as any,
    method: "POST",
    body: payload
  })
}

export async function getRun(runId: string) {
  return await apiSend<EvaluationRunDetail>({
    path: `/api/v1/evaluations/runs/${encodeURIComponent(runId)}` as any,
    method: "GET"
  })
}

