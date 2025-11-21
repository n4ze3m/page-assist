import { apiSend } from "@/services/api-send"

// Prompt Studio client – aligns with tldw_server prompt_studio endpoints.

export type PaginationMeta = {
  page: number
  per_page: number
  total: number
  total_pages?: number
}

export type StandardResponse<T> = {
  success: boolean
  data?: T
  error?: string
  error_code?: string
  metadata?: Record<string, any>
}

export type ListResponse<T> = StandardResponse<T[]> & {
  metadata?: PaginationMeta
}

export type Project = {
  id: number
  uuid?: string
  name: string
  description?: string | null
  status?: string
  created_at?: string
  updated_at?: string
  prompt_count?: number
  test_case_count?: number
  metadata?: Record<string, any> | null
}

export type ProjectCreatePayload = {
  name: string
  description?: string | null
  status?: string
  metadata?: Record<string, any> | null
}

export type ProjectUpdatePayload = Partial<ProjectCreatePayload>

export type PromptModule = {
  type: string
  enabled?: boolean
  config?: Record<string, any> | null
}

export type FewShotExample = {
  inputs: Record<string, any>
  outputs: Record<string, any>
  explanation?: string | null
}

export type Prompt = {
  id: number
  uuid?: string
  project_id: number
  name: string
  system_prompt?: string | null
  user_prompt?: string | null
  few_shot_examples?: FewShotExample[] | null
  modules_config?: PromptModule[] | null
  signature_id?: number | null
  version_number: number
  change_description?: string | null
  parent_version_id?: number | null
  created_at?: string
  updated_at?: string
}

export type PromptCreatePayload = {
  project_id: number
  name: string
  system_prompt?: string | null
  user_prompt?: string | null
  few_shot_examples?: FewShotExample[] | null
  modules_config?: PromptModule[] | null
  change_description?: string | null
  signature_id?: number | null
  parent_version_id?: number | null
}

export type PromptUpdatePayload = {
  name?: string
  system_prompt?: string | null
  user_prompt?: string | null
  few_shot_examples?: FewShotExample[] | null
  modules_config?: PromptModule[] | null
  change_description: string
}

export type PromptVersion = {
  id: number
  uuid?: string
  version_number: number
  name: string
  change_description?: string | null
  created_at?: string
  parent_version_id?: number | null
}

export type ExecutePromptPayload = {
  prompt_id: number
  inputs?: Record<string, any>
  provider?: string
  model?: string
}

export type ExecutePromptResult = {
  output: string
  tokens_used?: number
  execution_time?: number
}

export type TestCase = {
  id: number
  project_id: number
  name?: string | null
  description?: string | null
  inputs: Record<string, any>
  expected_outputs?: Record<string, any> | null
  tags?: string[] | null
  is_golden?: boolean
  signature_id?: number | null
  created_at?: string
  updated_at?: string
}

export type TestCaseCreatePayload = {
  project_id: number
  name?: string | null
  description?: string | null
  inputs: Record<string, any>
  expected_outputs?: Record<string, any> | null
  tags?: string[] | null
  is_golden?: boolean
  signature_id?: number | null
}

export type TestCaseUpdatePayload = Partial<Omit<TestCaseCreatePayload, "project_id">>

export type TestCaseBulkCreatePayload = {
  project_id: number
  signature_id?: number | null
  test_cases: Array<Omit<TestCaseCreatePayload, "project_id">>
}

export type EvaluationConfig = {
  model_name?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  api_endpoint?: string
  api_key_name?: string
  timeout_seconds?: number
  retry_count?: number
  parallel_requests?: number
}

export type EvaluationCreatePayload = {
  project_id: number
  prompt_id: number
  test_case_ids: number[]
  name?: string | null
  description?: string | null
  config?: EvaluationConfig
  model_configs?: EvaluationConfig[]
  run_async?: boolean
  tags?: string[]
}

export type PromptStudioEvaluation = {
  id: number
  uuid?: string
  project_id: number
  prompt_id: number
  name?: string | null
  description?: string | null
  status: string
  metrics?: Record<string, any>
  aggregate_metrics?: Record<string, any>
  config?: Record<string, any>
  model_configs?: EvaluationConfig[]
  test_case_ids?: number[]
  test_run_ids?: number[]
  error_message?: string | null
  created_at?: string
  completed_at?: string | null
}

export type EvaluationListResponse = {
  evaluations: PromptStudioEvaluation[]
  total: number
  limit: number
  offset: number
}

export type PromptStudioStatus = {
  queue_depth: number
  processing: number
  leases: Record<string, number>
  by_status?: Record<string, number>
  by_type?: Record<string, number>
  avg_processing_time_seconds?: number
  success_rate?: number
}

const withIdempotency = (
  key?: string | null
): Record<string, string> | undefined => {
  if (!key) return undefined
  return { "Idempotency-Key": key }
}

const buildQuery = (params: Record<string, any>) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    qs.set(k, String(v))
  })
  const query = qs.toString()
  return query ? `?${query}` : ""
}

// Capability probe
export async function hasPromptStudio(): Promise<boolean> {
  try {
    const res = await getPromptStudioStatus()
    const status = (res as any)?.data
    return Boolean((res as any)?.ok && (status?.success ?? true))
  } catch {
    return false
  }
}

// Projects
export async function listProjects(params?: {
  page?: number
  per_page?: number
  include_deleted?: boolean
  search?: string
}) {
  const query = buildQuery({
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 20,
    include_deleted: params?.include_deleted,
    search: params?.search
  })
  return await apiSend<ListResponse<Project>>({
    path: `/api/v1/prompt-studio/projects${query}` as any,
    method: "GET"
  })
}

export async function createProject(
  payload: ProjectCreatePayload,
  idempotencyKey?: string | null
) {
  return await apiSend<StandardResponse<Project>>({
    path: "/api/v1/prompt-studio/projects/" as any,
    method: "POST",
    body: payload,
    headers: withIdempotency(idempotencyKey)
  })
}

export async function getProject(projectId: number) {
  return await apiSend<StandardResponse<Project>>({
    path: `/api/v1/prompt-studio/projects/${encodeURIComponent(projectId)}` as any,
    method: "GET"
  })
}

export async function updateProject(projectId: number, payload: ProjectUpdatePayload) {
  return await apiSend<StandardResponse<Project>>({
    path: `/api/v1/prompt-studio/projects/${encodeURIComponent(projectId)}` as any,
    method: "PUT",
    body: payload
  })
}

// Prompts
export async function listPrompts(projectId: number, params?: { page?: number; per_page?: number; include_deleted?: boolean }) {
  const query = buildQuery({
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 20,
    include_deleted: params?.include_deleted
  })
  return await apiSend<ListResponse<Prompt>>({
    path: `/api/v1/prompt-studio/prompts/list/${encodeURIComponent(projectId)}${query}` as any,
    method: "GET"
  })
}

export async function createPrompt(
  payload: PromptCreatePayload,
  idempotencyKey?: string | null
) {
  return await apiSend<StandardResponse<Prompt>>({
    path: "/api/v1/prompt-studio/prompts/create" as any,
    method: "POST",
    body: payload,
    headers: withIdempotency(idempotencyKey)
  })
}

export async function getPrompt(promptId: number) {
  return await apiSend<StandardResponse<Prompt>>({
    path: `/api/v1/prompt-studio/prompts/get/${encodeURIComponent(promptId)}` as any,
    method: "GET"
  })
}

export async function updatePrompt(promptId: number, payload: PromptUpdatePayload) {
  return await apiSend<StandardResponse<Prompt>>({
    path: `/api/v1/prompt-studio/prompts/update/${encodeURIComponent(promptId)}` as any,
    method: "PUT",
    body: payload
  })
}

export async function getPromptHistory(promptId: number) {
  return await apiSend<StandardResponse<PromptVersion[]>>({
    path: `/api/v1/prompt-studio/prompts/history/${encodeURIComponent(promptId)}` as any,
    method: "GET"
  })
}

export async function revertPrompt(promptId: number, version: number) {
  return await apiSend<StandardResponse<Prompt>>({
    path: `/api/v1/prompt-studio/prompts/revert/${encodeURIComponent(promptId)}/${encodeURIComponent(version)}` as any,
    method: "POST"
  })
}

export async function executePrompt(payload: ExecutePromptPayload) {
  return await apiSend<ExecutePromptResult>({
    path: "/api/v1/prompt-studio/prompts/execute" as any,
    method: "POST",
    body: payload
  })
}

// Test cases
export async function listTestCases(
  projectId: number,
  params?: {
    page?: number
    per_page?: number
    is_golden?: boolean
    tags?: string
    search?: string
    signature_id?: number
  }
) {
  const query = buildQuery({
    page: params?.page ?? 1,
    per_page: params?.per_page ?? 20,
    is_golden: params?.is_golden,
    tags: params?.tags,
    search: params?.search,
    signature_id: params?.signature_id
  })
  return await apiSend<ListResponse<TestCase>>({
    path: `/api/v1/prompt-studio/test-cases/list/${encodeURIComponent(projectId)}${query}` as any,
    method: "GET"
  })
}

export async function createTestCase(payload: TestCaseCreatePayload) {
  return await apiSend<StandardResponse<TestCase>>({
    path: "/api/v1/prompt-studio/test-cases/create" as any,
    method: "POST",
    body: payload
  })
}

export async function createBulkTestCases(payload: TestCaseBulkCreatePayload) {
  return await apiSend<StandardResponse<TestCase[]>>({
    path: "/api/v1/prompt-studio/test-cases/bulk" as any,
    method: "POST",
    body: payload
  })
}

export async function getTestCase(testCaseId: number) {
  return await apiSend<StandardResponse<TestCase>>({
    path: `/api/v1/prompt-studio/test-cases/get/${encodeURIComponent(testCaseId)}` as any,
    method: "GET"
  })
}

export async function updateTestCase(testCaseId: number, payload: TestCaseUpdatePayload) {
  return await apiSend<StandardResponse<TestCase>>({
    path: `/api/v1/prompt-studio/test-cases/update/${encodeURIComponent(testCaseId)}` as any,
    method: "PUT",
    body: payload
  })
}

// Evaluations
export async function createEvaluation(payload: EvaluationCreatePayload) {
  return await apiSend<PromptStudioEvaluation>({
    path: "/api/v1/prompt-studio/evaluations" as any,
    method: "POST",
    body: payload
  })
}

export async function listEvaluations(params: {
  project_id: number
  prompt_id?: number
  limit?: number
  offset?: number
}) {
  const query = buildQuery({
    project_id: params.project_id,
    prompt_id: params.prompt_id,
    limit: params.limit ?? 100,
    offset: params.offset ?? 0
  })
  return await apiSend<EvaluationListResponse>({
    path: `/api/v1/prompt-studio/evaluations${query}` as any,
    method: "GET"
  })
}

export async function getEvaluation(evaluationId: number) {
  return await apiSend<PromptStudioEvaluation>({
    path: `/api/v1/prompt-studio/evaluations/${encodeURIComponent(evaluationId)}` as any,
    method: "GET"
  })
}

export async function deleteEvaluation(evaluationId: number) {
  return await apiSend<{ message: string }>({
    path: `/api/v1/prompt-studio/evaluations/${encodeURIComponent(evaluationId)}` as any,
    method: "DELETE"
  })
}

// Status
export async function getPromptStudioStatus(params?: { warn_seconds?: number }) {
  const query = buildQuery({ warn_seconds: params?.warn_seconds })
  return await apiSend<StandardResponse<PromptStudioStatus>>({
    path: `/api/v1/prompt-studio/status${query}` as any,
    method: "GET"
  })
}
