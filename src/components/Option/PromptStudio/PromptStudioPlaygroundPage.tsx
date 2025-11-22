import React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography
} from "antd"
import { BugOutlined, HistoryOutlined, PlayCircleOutlined } from "@ant-design/icons"
import { useTranslation } from "react-i18next"

import { useServerOnline } from "@/hooks/useServerOnline"
import {
  hasPromptStudio,
  listProjects,
  createProject,
  listPrompts,
  createPrompt,
  getPrompt,
  updatePrompt,
  getPromptHistory,
  revertPrompt,
  executePrompt,
  listTestCases,
  createTestCase,
  createBulkTestCases,
  listEvaluations,
  createEvaluation,
  getEvaluation,
  type Prompt,
  type PromptVersion,
  type Project,
  type TestCase,
  type PromptStudioEvaluation
} from "@/services/prompt-studio"
import { getPromptStudioDefaults } from "@/services/prompt-studio-settings"

const { Title, Paragraph, Text } = Typography

const parseJson = (value: string | undefined, fallback: any = {}) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (e: any) {
    throw new Error(e?.message || "Invalid JSON")
  }
}

type PromptFormFields = {
  name?: string
  system_prompt?: string
  user_prompt?: string
  change_description: string
  few_shot_examples?: string
  modules_config?: string
}

type TestCaseFormFields = {
  name?: string
  description?: string
  inputs: string
  expected_outputs?: string
  tags?: string
  is_golden?: boolean
}

type EvaluationFormFields = {
  name?: string
  description?: string
  model_name?: string
  temperature?: number
  max_tokens?: number
  run_async?: boolean
}

const statusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "running":
    case "processing":
      return "blue"
    case "pending":
      return "gold"
    case "completed":
      return "green"
    case "failed":
    case "cancelled":
      return "red"
    default:
      return "default"
  }
}

export const PromptStudioPlaygroundPage: React.FC = () => {
  const { t } = useTranslation(["option", "settings", "common"])
  const online = useServerOnline()
  const queryClient = useQueryClient()

  const [projectPage, setProjectPage] = React.useState(1)
  const [promptPage, setPromptPage] = React.useState(1)
  const [testCasePage, setTestCasePage] = React.useState(1)
  const [evaluationPage, setEvaluationPage] = React.useState(1)
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null)
  const [selectedPromptId, setSelectedPromptId] = React.useState<number | null>(null)
  const [selectedEvaluationId, setSelectedEvaluationId] = React.useState<number | null>(null)
  const [selectedTestCaseIds, setSelectedTestCaseIds] = React.useState<number[]>([])
  const [projectModalOpen, setProjectModalOpen] = React.useState(false)
  const [promptModalOpen, setPromptModalOpen] = React.useState(false)
  const [testCaseModalOpen, setTestCaseModalOpen] = React.useState(false)
  const [bulkTestCaseModalOpen, setBulkTestCaseModalOpen] = React.useState(false)
  const [executionResult, setExecutionResult] = React.useState<any>(null)
  const [executionError, setExecutionError] = React.useState<string | null>(null)
  const [savePromptForm] = Form.useForm<PromptFormFields>()
  const [createPromptForm] = Form.useForm<Partial<PromptFormFields>>()
  const [executeForm] = Form.useForm()
  const [testCaseForm] = Form.useForm<TestCaseFormFields>()
  const [bulkTestCaseForm] = Form.useForm<{ json: string }>()
  const [evaluationForm] = Form.useForm<EvaluationFormFields>()
  const [activeTab, setActiveTab] = React.useState<string>("overview")
  const [lastDebugTestCase, setLastDebugTestCase] = React.useState<TestCase | null>(null)
  const [testCaseRuns, setTestCaseRuns] = React.useState<
    Record<
      number,
      { status: "running" | "done" | "error"; output?: string; tokens?: number; time?: number; error?: string }
    >
  >({})

  const capabilityQuery = useQuery({
    queryKey: ["prompt-studio", "capability"],
    queryFn: hasPromptStudio
  })

  const defaultsQuery = useQuery({
    queryKey: ["prompt-studio", "defaults"],
    queryFn: getPromptStudioDefaults
  })

  const pageSize = defaultsQuery.data?.pageSize ?? 10

  const projectsQuery = useQuery({
    queryKey: ["prompt-studio", "projects", projectPage, pageSize],
    queryFn: () => listProjects({ page: projectPage, per_page: pageSize }),
    enabled: capabilityQuery.data === true && online
  })

  // Unwrap payloads up front so effects/hooks don't use variables before declaration
  const projectsPayload = projectsQuery.data?.data
  const projectList = React.useMemo(() => {
    const raw =
      Array.isArray(projectsPayload?.data)
        ? projectsPayload?.data
        : Array.isArray((projectsPayload as any)?.projects)
          ? (projectsPayload as any).projects
          : []
    return raw || []
  }, [projectsPayload])
  const projectMeta = React.useMemo(
    () => (projectsPayload as any)?.metadata || (projectsPayload as any)?.pagination,
    [projectsPayload]
  )

  React.useEffect(() => {
    if (!projectList.length) return
    const defaultId = defaultsQuery.data?.defaultProjectId
    if (defaultId && projectList.some((p) => p.id === defaultId)) {
      setSelectedProjectId((prev) => prev ?? defaultId)
    } else {
      setSelectedProjectId((prev) => prev ?? projectList[0].id)
    }
  }, [projectList, defaultsQuery.data])

  const promptsQuery = useQuery({
    queryKey: ["prompt-studio", "prompts", selectedProjectId, promptPage, pageSize],
    queryFn: () =>
      selectedProjectId
        ? listPrompts(selectedProjectId, { page: promptPage, per_page: pageSize })
        : null,
    enabled: capabilityQuery.data === true && !!selectedProjectId && online
  })

  const promptsPayload = promptsQuery.data?.data
  const promptList = React.useMemo(
    () => (Array.isArray(promptsPayload?.data) ? promptsPayload?.data || [] : []),
    [promptsPayload]
  )
  const promptMeta = React.useMemo(
    () => (promptsPayload as any)?.metadata || (promptsPayload as any)?.pagination,
    [promptsPayload]
  )

  React.useEffect(() => {
    if (!promptList.length) return
    setSelectedPromptId((prev) => prev ?? (promptList[0]?.id || null))
  }, [promptList])

  React.useEffect(() => {
    if (selectedPromptId) {
      setActiveTab((prev) => (prev === "overview" ? "editor" : prev))
    } else {
      setActiveTab("overview")
    }
  }, [selectedPromptId])

  const promptDetailQuery = useQuery({
    queryKey: ["prompt-studio", "prompt", selectedPromptId],
    queryFn: () => (selectedPromptId ? getPrompt(selectedPromptId) : null),
    enabled: capabilityQuery.data === true && !!selectedPromptId && online
  })

  React.useEffect(() => {
    const prompt = promptDetailQuery.data?.data?.data
    if (!prompt) return
    savePromptForm.setFieldsValue({
      name: prompt.name,
      system_prompt: prompt.system_prompt || "",
      user_prompt: prompt.user_prompt || "",
      change_description: "",
      few_shot_examples: prompt.few_shot_examples ? JSON.stringify(prompt.few_shot_examples, null, 2) : "",
      modules_config: prompt.modules_config ? JSON.stringify(prompt.modules_config, null, 2) : ""
    })
  }, [promptDetailQuery.data, savePromptForm])

  const promptHistoryQuery = useQuery({
    queryKey: ["prompt-studio", "prompt-history", selectedPromptId],
    queryFn: () => (selectedPromptId ? getPromptHistory(selectedPromptId) : null),
    enabled: capabilityQuery.data === true && !!selectedPromptId && online
  })

  const promptHistory = React.useMemo(
    () => promptHistoryQuery.data?.data?.data || [],
    [promptHistoryQuery.data]
  )

  const testCasesQuery = useQuery({
    queryKey: ["prompt-studio", "test-cases", selectedProjectId, testCasePage, pageSize],
    queryFn: () =>
      selectedProjectId
        ? listTestCases(selectedProjectId, { page: testCasePage, per_page: pageSize })
        : null,
    enabled: capabilityQuery.data === true && !!selectedProjectId && online
  })

  const testCasesPayload = testCasesQuery.data?.data
  const testCaseList = React.useMemo(
    () => (Array.isArray(testCasesPayload?.data) ? testCasesPayload?.data || [] : []),
    [testCasesPayload]
  )
  const testCaseMeta = React.useMemo(
    () => (testCasesPayload as any)?.metadata || (testCasesPayload as any)?.pagination,
    [testCasesPayload]
  )

  const evaluationsQuery = useQuery({
    queryKey: ["prompt-studio", "evaluations", selectedProjectId, selectedPromptId, evaluationPage, pageSize],
    queryFn: () =>
      selectedProjectId
        ? listEvaluations({
            project_id: selectedProjectId,
            prompt_id: selectedPromptId || undefined,
            limit: pageSize,
            offset: (evaluationPage - 1) * pageSize
          })
        : null,
    enabled: capabilityQuery.data === true && !!selectedProjectId && online,
    refetchInterval: (data) => {
      const hasRunning =
        (data as any)?.data?.evaluations?.some((e: any) =>
          ["running", "pending", "processing"].includes((e.status || "").toLowerCase())
        ) ?? false
      return hasRunning ? 5000 : false
    }
  })

  const evaluationsPayload = evaluationsQuery.data?.data
  const evaluationList = React.useMemo(
    () => evaluationsPayload?.evaluations || [],
    [evaluationsPayload]
  )
  const evaluationTotal = evaluationsPayload?.total

  React.useEffect(() => {
    if (!evaluationList.length) return
    setSelectedEvaluationId((prev) => prev ?? (evaluationList[0]?.id || null))
  }, [evaluationList])

  React.useEffect(() => {
    if (!defaultsQuery.data) return
    executeForm.setFieldsValue({
      provider: defaultsQuery.data.executeProvider || "openai",
      model: defaultsQuery.data.executeModel || "gpt-3.5-turbo",
      inputs: "{}"
    })
    evaluationForm.setFieldsValue({
      model_name: defaultsQuery.data.evalModelName || "gpt-3.5-turbo",
      temperature: defaultsQuery.data.evalTemperature ?? 0.2,
      max_tokens: defaultsQuery.data.evalMaxTokens ?? 512,
      run_async: true
    })
  }, [defaultsQuery.data, executeForm, evaluationForm])

  const evaluationDetailQuery = useQuery({
    queryKey: ["prompt-studio", "evaluation", selectedEvaluationId],
    queryFn: () => (selectedEvaluationId ? getEvaluation(selectedEvaluationId) : null),
    enabled: capabilityQuery.data === true && !!selectedEvaluationId && online,
    refetchInterval: (data) => {
      const status = ((data as any)?.data?.status || "").toLowerCase()
      return status === "running" || status === "pending" ? 4000 : false
    }
  })

  const promptDetail = React.useMemo(() => {
    const raw = promptDetailQuery.data?.data as any
    return raw?.data ?? raw
  }, [promptDetailQuery.data])

  const evaluationDetail = React.useMemo(() => {
    const raw = evaluationDetailQuery.data as any
    return raw?.data ?? raw
  }, [evaluationDetailQuery.data])

  const selectedProject = React.useMemo(
    () => projectList.find((p) => p.id === selectedProjectId),
    [projectList, selectedProjectId]
  )
  const promptCountForProject = promptMeta?.total ?? promptList.length
  const testCaseCountForProject = testCaseMeta?.total ?? testCaseList.length
  const runningEvalCount =
    evaluationList?.filter((e) =>
      ["running", "processing", "pending"].includes((e.status || "").toLowerCase())
    ).length || 0

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      createProject({ name: values.name, description: values.description }),
    onSuccess: (resp) => {
      setProjectModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "projects"] })
      if (resp?.data?.data?.id) {
        setSelectedProjectId(resp.data.data.id)
      }
    }
  })

  const createPromptMutation = useMutation({
    mutationFn: (values: any) =>
      createPrompt({
        project_id: selectedProjectId!,
        name: values.name,
        system_prompt: values.system_prompt,
        user_prompt: values.user_prompt,
        change_description: values.change_description || undefined
      }),
    onSuccess: () => {
      setPromptModalOpen(false)
      createPromptForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompts"] })
    }
  })

  const updatePromptMutation = useMutation({
    mutationFn: (values: PromptFormFields) => {
      if (!selectedPromptId) throw new Error("No prompt selected")
      return updatePrompt(selectedPromptId, {
        name: values.name,
        system_prompt: values.system_prompt,
        user_prompt: values.user_prompt,
        change_description: values.change_description,
        few_shot_examples: values.few_shot_examples
          ? parseJson(values.few_shot_examples, null)
          : undefined,
        modules_config: values.modules_config
          ? parseJson(values.modules_config, null)
          : undefined
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompt"] })
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompt-history"] })
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompts"] })
      savePromptForm.setFieldValue("change_description", "")
    }
  })

  const revertPromptMutation = useMutation({
    mutationFn: ({ version }: { version: number }) => {
      if (!selectedPromptId) throw new Error("No prompt selected")
      return revertPrompt(selectedPromptId, version)
    },
    onSuccess: (resp) => {
      if (resp?.data?.data?.id) {
        setSelectedPromptId(resp.data.data.id)
      }
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompt-history"] })
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompt"] })
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "prompts"] })
    }
  })

  const executePromptMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!selectedPromptId) throw new Error("No prompt selected")
      const inputs = parseJson(values.inputs || "{}", {})
      return await executePrompt({
        prompt_id: selectedPromptId,
        inputs,
        provider: values.provider,
        model: values.model
      })
    },
    onSuccess: (data) => {
      setExecutionResult(data?.data || data)
      setExecutionError(null)
    },
    onError: (err: any) => {
      setExecutionError(err?.message || "Execution failed")
      setExecutionResult(null)
    }
  })

  const runTestCaseMutation = useMutation({
    mutationFn: async (testCase: TestCase) => {
      if (!selectedPromptId) throw new Error("No prompt selected")
      const provider =
        executeForm.getFieldValue("provider") ||
        defaultsQuery.data?.executeProvider ||
        "openai"
      const model =
        evaluationForm.getFieldValue("model_name") ||
        executeForm.getFieldValue("model") ||
        defaultsQuery.data?.evalModelName ||
        defaultsQuery.data?.executeModel ||
        "gpt-3.5-turbo"

      return await executePrompt({
        prompt_id: selectedPromptId,
        inputs: testCase.inputs || {},
        provider,
        model
      })
    },
    onMutate: (testCase) => {
      setTestCaseRuns((prev) => ({
        ...prev,
        [testCase.id]: { status: "running" }
      }))
    },
    onSuccess: (resp, testCase) => {
      const payload = (resp as any)?.data || (resp as any)
      setTestCaseRuns((prev) => ({
        ...prev,
        [testCase.id]: {
          status: "done",
          output: payload?.output,
          tokens: payload?.tokens_used,
          time: payload?.execution_time
        }
      }))
    },
    onError: (err: any, testCase) => {
      setTestCaseRuns((prev) => ({
        ...prev,
        [testCase.id]: { status: "error", error: err?.message || "Inline run failed" }
      }))
    }
  })

  const createTestCaseMutation = useMutation({
    mutationFn: async (values: TestCaseFormFields) => {
      if (!selectedProjectId) throw new Error("No project selected")
      const inputs = parseJson(values.inputs, {})
      const expected = values.expected_outputs ? parseJson(values.expected_outputs, {}) : undefined
      const tags = values.tags
        ? values.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined
      return await createTestCase({
        project_id: selectedProjectId,
        name: values.name,
        description: values.description,
        inputs,
        expected_outputs: expected,
        tags,
        is_golden: values.is_golden
      })
    },
    onSuccess: () => {
      setTestCaseModalOpen(false)
      testCaseForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "test-cases"] })
    }
  })

  const bulkCreateTestCasesMutation = useMutation({
    mutationFn: async (values: { json: string }) => {
      if (!selectedProjectId) throw new Error("No project selected")
      const parsed = parseJson(values.json, [])
      if (!Array.isArray(parsed)) throw new Error("Bulk payload must be an array")
      return await createBulkTestCases({
        project_id: selectedProjectId,
        test_cases: parsed
      })
    },
    onSuccess: () => {
      setBulkTestCaseModalOpen(false)
      bulkTestCaseForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "test-cases"] })
    }
  })

  const createEvaluationMutation = useMutation({
    mutationFn: async (values: EvaluationFormFields) => {
      if (!selectedProjectId || !selectedPromptId) throw new Error("Select a prompt")
      if (!selectedTestCaseIds.length) throw new Error("Select at least one test case")
      const config = {
        model_name: values.model_name,
        temperature: values.temperature,
        max_tokens: values.max_tokens
      }
      return await createEvaluation({
        project_id: selectedProjectId,
        prompt_id: selectedPromptId,
        test_case_ids: selectedTestCaseIds,
        name: values.name,
        description: values.description,
        run_async: values.run_async ?? false,
        model_configs: [config]
      })
    },
    onSuccess: () => {
      evaluationForm.resetFields()
      setSelectedEvaluationId(null)
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "evaluations"] })
    }
  })

  const handleDebugTestCase = React.useCallback(
    (testCase: TestCase) => {
      executeForm.setFieldsValue({
        provider:
          executeForm.getFieldValue("provider") ||
          defaultsQuery.data?.executeProvider ||
          "openai",
        model:
          executeForm.getFieldValue("model") ||
          defaultsQuery.data?.executeModel ||
          "gpt-3.5-turbo",
        inputs: JSON.stringify(testCase.inputs || {}, null, 2)
      })
      setLastDebugTestCase(testCase)
      setActiveTab("playground")
    },
    [defaultsQuery.data, executeForm]
  )

  if (!online) {
    return (
      <Alert
        type="warning"
        message={t("option:promptStudio.offline", "Connect to your server to use Prompt Studio")}
      />
    )
  }

  if (capabilityQuery.isLoading || defaultsQuery.isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />
  }

  if (capabilityQuery.data === false) {
    return (
      <Alert
        type="info"
        message={t("option:promptStudio.unavailable", "Prompt Studio is not enabled on this server.")}
        description={t(
          "option:promptStudio.unavailableBody",
          "When available, you will see projects, prompt history, execute flows, and evaluations here."
        )}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Title level={3} className="mb-0">
            {t("option:promptStudio.title", "Prompt Studio Playground")}
          </Title>
          <Paragraph className="mb-0 text-gray-600 dark:text-gray-300">
            {t(
              "option:promptStudio.subtitle",
              "Manage Prompt Studio projects, prompts, executions, test cases, and evaluations."
            )}
          </Paragraph>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <Badge
            status={capabilityQuery.data ? "success" : "warning"}
            text={
              capabilityQuery.data
                ? t("option:promptStudio.capable", "Prompt Studio available")
                : t("option:promptStudio.capabilityUnknown", "Status check failed")
            }
          />
          <Tag color="blue">{selectedProject?.name || t("common:selectProject", "Select project")}</Tag>
          <Tag color="purple">
            {selectedPromptId
              ? t("option:promptStudio.promptId", "Prompt {{id}}", { id: selectedPromptId })
              : t("option:promptStudio.noPromptSelected", "No prompt selected")}
          </Tag>
          <Tag color={runningEvalCount ? "blue" : "default"}>
            {t("option:promptStudio.runningEvals", "{{count}} running", { count: runningEvalCount })}
          </Tag>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card
          title={t("option:promptStudio.workspaceCard", "Projects & prompts")}
          extra={
            <Space>
              <Button onClick={() => setProjectModalOpen(true)} size="small">
                {t("common:newProject", "New project")}
              </Button>
              <Button disabled={!selectedProjectId} onClick={() => setPromptModalOpen(true)} size="small" type="primary">
                {t("common:newPrompt", "New prompt")}
              </Button>
            </Space>
          }>
          {projectsQuery.isError && (
            <Alert
              type="error"
              message={t("option:promptStudio.projectsError", "Could not load projects")}
            />
          )}
          <Space direction="vertical" className="w-full">
            <Select
              className="w-full"
              placeholder={t("common:selectProject", "Select project") as string}
              loading={projectsQuery.isLoading}
              value={selectedProjectId ?? undefined}
              options={projectList.map((p) => ({
                value: p.id,
                label: p.name
              }))}
              onChange={(val) => {
                setSelectedProjectId(val)
                setPromptPage(1)
                setSelectedPromptId(null)
                setSelectedEvaluationId(null)
                setTestCasePage(1)
                setEvaluationPage(1)
                setSelectedTestCaseIds([])
                setLastDebugTestCase(null)
                setExecutionResult(null)
              }}
            />
            <Table<Project>
              size="small"
              rowKey="id"
              pagination={{
                current: projectPage,
                pageSize: pageSize,
                total: projectMeta?.total,
                onChange: (page) => setProjectPage(page)
              }}
              loading={projectsQuery.isLoading}
              columns={[
                { title: t("common:name", "Name"), dataIndex: "name" },
                { title: t("common:prompts", "Prompts"), dataIndex: "prompt_count", width: 90 },
                { title: t("common:testCases", "Test cases"), dataIndex: "test_case_count", width: 110 }
              ]}
              locale={{ emptyText: t("option:promptStudio.noProjects", "No projects yet") }}
              dataSource={projectList}
              onRow={(record) => ({
                onClick: () => setSelectedProjectId(record.id)
              })}
            />
            <Divider className="my-2" />
            <div className="flex items-center justify-between">
              <Text strong>{t("common:prompts", "Prompts")}</Text>
              <Button size="small" type="link" disabled={!selectedProjectId} onClick={() => setPromptModalOpen(true)}>
                {t("common:newPrompt", "New prompt")}
              </Button>
            </div>
            <Table<Prompt>
              size="small"
              rowKey="id"
              pagination={{
                current: promptPage,
                pageSize: pageSize,
                total: promptMeta?.total,
                onChange: (page) => setPromptPage(page)
              }}
              loading={promptsQuery.isLoading}
              columns={[
                { title: t("common:name", "Name"), dataIndex: "name" },
                { title: t("option:promptStudio.promptVersion", "Version"), dataIndex: "version_number", width: 90 },
                {
                  title: t("common:updated", "Updated"),
                  dataIndex: "updated_at",
                  render: (v) => v || "-"
                }
              ]}
              locale={{ emptyText: t("option:promptStudio.noPrompts", "No prompts in this project") }}
              dataSource={promptList}
              onRow={(record) => ({
                onClick: () => setSelectedPromptId(record.id)
              })}
              rowClassName={(record) =>
                record.id === selectedPromptId
                  ? "bg-gray-50 dark:bg-[#1f1f1f]"
                  : ""
              }
            />
          </Space>
        </Card>

        <div className="space-y-4">
          <Card
            size="small"
            title={t("option:promptStudio.atGlance", "Workspace at a glance")}
            extra={
              <Text type="secondary">
                {selectedProject
                  ? t("option:promptStudio.filterLabel", "Showing test cases for {{project}}", {
                      project: selectedProject.name
                    })
                  : t("option:promptStudio.pickProject", "Pick a project to begin")}
              </Text>
            }>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Text type="secondary">{t("common:projects", "Projects")}</Text>
                <div className="text-xl font-semibold">{projectMeta?.total ?? projectList.length}</div>
              </div>
              <div>
                <Text type="secondary">{t("common:prompts", "Prompts")}</Text>
                <div className="text-xl font-semibold">{promptCountForProject}</div>
              </div>
              <div>
                <Text type="secondary">{t("common:testCases", "Test cases")}</Text>
                <div className="text-xl font-semibold">{testCaseCountForProject}</div>
              </div>
              <div>
                <Text type="secondary">{t("option:promptStudio.evaluations", "Evaluations")}</Text>
                <div className="text-xl font-semibold">
                  {(evaluationTotal ?? evaluationList?.length ?? 0) || 0}
                  {runningEvalCount ? (
                    <span className="ml-1 text-xs text-blue-600 dark:text-blue-300">
                      ({t("option:promptStudio.running", "running")} {runningEvalCount})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          {selectedPromptId ? (
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              destroyInactiveTabPane={false}
              items={[
                {
                  key: "editor",
                  label: (
                    <span className="flex items-center gap-2">
                      <HistoryOutlined />
                      {t("option:promptStudio.editorTab", "Editor")}
                    </span>
                  ),
                  children: (
                    <div className="space-y-3">
                      {promptDetailQuery.isLoading && <Skeleton active paragraph={{ rows: 4 }} />}
                      {promptDetail ? (
                        <Card
                          type="inner"
                          title={promptDetail?.name}
                          extra={
                            <Text type="secondary">
                              {t("option:promptStudio.promptVersion", "Version")}{" "}
                              {promptDetail?.version_number}
                            </Text>
                          }>
                          <Form
                            layout="vertical"
                            form={savePromptForm}
                            onFinish={(values) => updatePromptMutation.mutate(values)}>
                            <div className="grid gap-4 md:grid-cols-2">
                              <Form.Item label={t("common:name", "Name")} name="name">
                                <Input />
                              </Form.Item>
                              <Form.Item
                                label={t("option:promptStudio.changeDescription", "Change description")}
                                name="change_description"
                                rules={[{ required: true }]}>
                                <Input placeholder="What changed?" />
                              </Form.Item>
                            </div>
                            <Form.Item
                              label={t("option:promptStudio.systemPrompt", "System prompt")}
                              name="system_prompt">
                              <Input.TextArea rows={3} />
                            </Form.Item>
                            <Form.Item
                              label={t("option:promptStudio.userPrompt", "User prompt")}
                              name="user_prompt">
                              <Input.TextArea rows={3} />
                            </Form.Item>
                            <div className="grid gap-4 md:grid-cols-2">
                              <Form.Item
                                label={t("option:promptStudio.fewShot", "Few-shot examples (JSON)")}
                                name="few_shot_examples">
                                <Input.TextArea rows={4} placeholder='[{"inputs":{},"outputs":{}}]' />
                              </Form.Item>
                              <Form.Item
                                label={t("option:promptStudio.modulesConfig", "Modules config (JSON)")}
                                name="modules_config">
                                <Input.TextArea rows={4} placeholder='[{"type":"cot","enabled":true}]' />
                              </Form.Item>
                            </div>
                            <Space>
                              <Button
                                type="primary"
                                htmlType="submit"
                                loading={updatePromptMutation.isPending}>
                                {t("common:save", "Save new version")}
                              </Button>
                            </Space>
                          </Form>

                          <Divider />
                          <div className="flex items-center gap-2">
                            <HistoryOutlined />
                            <Text strong>{t("option:promptStudio.history", "History")}</Text>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {promptHistoryQuery.isLoading && <Skeleton active paragraph={{ rows: 2 }} />}
                            {promptHistory?.map((v: PromptVersion) => (
                              <Tag
                                key={v.id}
                                color={v.id === selectedPromptId ? "blue" : "default"}
                                closable={false}
                                onClick={() => setSelectedPromptId(v.id)}
                                style={{ cursor: "pointer" }}>
                                {`v${v.version_number} — ${v.change_description || ""}`}
                                <Button
                                  size="small"
                                  className="ml-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    revertPromptMutation.mutate({ version: v.version_number })
                                  }}
                                  loading={revertPromptMutation.isPending}>
                                  {t("common:revert", "Revert")}
                                </Button>
                              </Tag>
                            ))}
                          </div>
                        </Card>
                      ) : (
                        <Empty description={t("option:promptStudio.noPromptSelected", "Select a prompt to edit")} />
                      )}
                    </div>
                  )
                },
                {
                  key: "playground",
                  label: t("option:promptStudio.playgroundTab", "Playground"),
                  children: (
                    <Card
                      title={t("option:promptStudio.executeCard", "Ad-hoc execute")}
                      extra={
                        <Text type="secondary">
                          {t("option:promptStudio.executeHint", "Provider, model, temperature, inputs.")}
                        </Text>
                      }>
                      {lastDebugTestCase && (
                        <Alert
                          type="info"
                          className="mb-3"
                          message={t("option:promptStudio.debugging", "Debugging {{name}}", {
                            name: lastDebugTestCase.name || lastDebugTestCase.id
                          })}
                          description={t(
                            "option:promptStudio.debuggingDesc",
                            "Inputs pre-filled from this test case. Adjust and run to iterate quickly."
                          )}
                        />
                      )}
                      <Form
                        layout="vertical"
                        form={executeForm}
                        onFinish={(values) => executePromptMutation.mutate(values)}
                        initialValues={{
                          provider: defaultsQuery.data?.executeProvider || "openai",
                          model: defaultsQuery.data?.executeModel || "gpt-3.5-turbo",
                          inputs: "{}"
                        }}>
                        <div className="grid gap-4 md:grid-cols-3">
                          <Form.Item label={t("option:promptStudio.provider", "Provider")} name="provider">
                            <Input placeholder="openai" />
                          </Form.Item>
                          <Form.Item label={t("option:promptStudio.model", "Model")} name="model">
                            <Input placeholder="gpt-3.5-turbo" />
                          </Form.Item>
                          <Form.Item label="Inputs (JSON)" name="inputs">
                            <Input.TextArea rows={3} placeholder='{"text":"hello"}' />
                          </Form.Item>
                        </div>
                        <Space>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={executePromptMutation.isPending}
                            disabled={!selectedPromptId}>
                            {t("option:promptStudio.runPrompt", "Run prompt")}
                          </Button>
                        </Space>
                      </Form>
                      {executionError && (
                        <Alert className="mt-3" type="error" message={executionError} />
                      )}
                      {executionResult && (
                        <Card className="mt-3" size="small" title={t("common:result", "Result")}>
                          <pre className="whitespace-pre-wrap text-sm">{executionResult.output}</pre>
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                            <div>{`Tokens: ${executionResult.tokens_used ?? 0}`}</div>
                            <div>{`Execution time: ${executionResult.execution_time ?? 0}s`}</div>
                          </div>
                        </Card>
                      )}
                    </Card>
                  )
                },
                {
                  key: "tests",
                  label: t("option:promptStudio.testsTab", "Tests & evals"),
                  children: (
                    <div className="space-y-3">
                      <Card
                        size="small"
                        title={t("option:promptStudio.evalConfig", "Evaluation config")}
                        extra={
                          <Text type="secondary">
                            {t("option:promptStudio.evalHint", "Applies to new runs and inline test plays")}
                          </Text>
                        }>
                        <Form
                          layout="vertical"
                          form={evaluationForm}
                          onFinish={(values) => createEvaluationMutation.mutate(values)}
                          initialValues={{
                            model_name: defaultsQuery.data?.evalModelName || "gpt-3.5-turbo",
                            temperature: defaultsQuery.data?.evalTemperature ?? 0.2,
                            max_tokens: defaultsQuery.data?.evalMaxTokens ?? 512,
                            run_async: true
                          }}>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Form.Item label={t("common:name", "Name")} name="name">
                              <Input placeholder="Baseline eval" />
                            </Form.Item>
                            <Form.Item label={t("option:promptStudio.model", "Model")} name="model_name">
                              <Input placeholder="gpt-3.5-turbo" />
                            </Form.Item>
                            <Form.Item label={t("option:promptStudio.temperature", "Temperature")} name="temperature">
                              <InputNumber step={0.1} min={0} max={2} className="w-full" />
                            </Form.Item>
                            <Form.Item label={t("option:promptStudio.maxTokens", "Max tokens")} name="max_tokens">
                              <InputNumber min={1} className="w-full" />
                            </Form.Item>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Form.Item label={t("common:description", "Description")} name="description">
                              <Input.TextArea rows={2} />
                            </Form.Item>
                            <Form.Item
                              label={t("option:promptStudio.runAsync", "Run async")}
                              name="run_async"
                              valuePropName="checked">
                              <Switch />
                            </Form.Item>
                          </div>
                          <Space>
                            <Button
                              type="primary"
                              htmlType="submit"
                              loading={createEvaluationMutation.isPending}
                              disabled={!selectedPromptId || !selectedTestCaseIds.length}>
                              {t("option:promptStudio.runEvaluation", "Run evaluation")}
                            </Button>
                          </Space>
                        </Form>
                      </Card>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card
                          title={t("option:promptStudio.testCases", "Test cases")}
                          extra={
                            <Space>
                              <Button size="small" onClick={() => setTestCaseModalOpen(true)}>
                                {t("common:newTestCase", "New test case")}
                              </Button>
                              <Button size="small" onClick={() => setBulkTestCaseModalOpen(true)}>
                                {t("option:promptStudio.bulkAdd", "Bulk add")}
                              </Button>
                            </Space>
                          }>
                          <Table<TestCase>
                            size="small"
                            rowKey="id"
                            pagination={{
                              current: testCasePage,
                              pageSize,
                              total: testCaseMeta?.total,
                              onChange: (page) => setTestCasePage(page)
                            }}
                            loading={testCasesQuery.isLoading}
                            rowSelection={{
                              selectedRowKeys: selectedTestCaseIds,
                              onChange: (keys) => setSelectedTestCaseIds(keys as number[])
                            }}
                            locale={{ emptyText: t("option:promptStudio.noTestCases", "No test cases yet") }}
                            columns={[
                              { title: t("common:name", "Name"), dataIndex: "name" },
                              {
                                title: t("common:tags", "Tags"),
                                dataIndex: "tags",
                                render: (tags?: string[]) =>
                                  tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)
                              },
                              {
                                title: t("option:promptStudio.golden", "Golden"),
                                dataIndex: "is_golden",
                                width: 80,
                                render: (val) => (val ? t("common:yes", "Yes") : t("common:no", "No"))
                              },
                              {
                                title: t("common:actions", "Actions"),
                                width: 180,
                                render: (_: any, record: TestCase) => (
                                  <Space size="small">
                                    <Button
                                      size="small"
                                      icon={<BugOutlined />}
                                      onClick={() => handleDebugTestCase(record)}>
                                      {t("option:promptStudio.debug", "Debug")}
                                    </Button>
                                    <Button
                                      size="small"
                                      icon={<PlayCircleOutlined />}
                                      loading={testCaseRuns[record.id]?.status === "running"}
                                      onClick={() => runTestCaseMutation.mutate(record)}>
                                      {t("common:run", "Run")}
                                    </Button>
                                  </Space>
                                )
                              },
                              {
                                title: t("option:promptStudio.lastRun", "Last run"),
                                width: 120,
                                render: (_: any, record: TestCase) => {
                                  const run = testCaseRuns[record.id]
                                  if (!run) return <Text type="secondary">-</Text>
                                  if (run.status === "running") return <Tag color="blue">{t("common:running", "Running")}</Tag>
                                  if (run.status === "error") return <Tag color="red">{t("common:error", "Error")}</Tag>
                                  return <Tag color="green">{t("common:done", "Done")}</Tag>
                                }
                              }
                            ]}
                            expandable={{
                              expandedRowRender: (record) => {
                                const run = testCaseRuns[record.id]
                                if (!run) {
                                  return (
                                    <Text type="secondary">
                                      {t("option:promptStudio.noInlineRun", "Run this case inline to see output")}
                                    </Text>
                                  )
                                }
                                if (run.status === "error") {
                                  return <Alert type="error" message={run.error} />
                                }
                                return (
                                  <div>
                                    <Text strong>{t("common:output", "Output")}</Text>
                                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 dark:bg-[#1f1f1f] p-2 rounded">
                                      {run.output || t("option:promptStudio.noOutput", "No output returned")}
                                    </pre>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                                      {run.tokens != null && <span className="mr-3">{`Tokens: ${run.tokens}`}</span>}
                                      {run.time != null && <span>{`Time: ${run.time ?? 0}s`}</span>}
                                    </div>
                                  </div>
                                )
                              }
                            }}
                            dataSource={testCaseList}
                          />
                        </Card>

                        <Card title={t("option:promptStudio.evaluations", "Evaluations")}>
                          <Table<PromptStudioEvaluation>
                            size="small"
                            rowKey="id"
                            pagination={{
                              current: evaluationPage,
                              pageSize,
                              total: evaluationTotal,
                              onChange: (page) => setEvaluationPage(page)
                            }}
                            loading={evaluationsQuery.isLoading}
                            dataSource={evaluationList}
                            columns={[
                              { title: t("common:name", "Name"), dataIndex: "name" },
                              {
                                title: t("common:status", "Status"),
                                dataIndex: "status",
                                render: (val) => <Tag color={statusColor(val)}>{val}</Tag>
                              },
                              {
                                title: t("option:promptStudio.avgScore", "Avg score"),
                                dataIndex: "aggregate_metrics",
                                render: (metrics: any) =>
                                  metrics?.average_score != null
                                    ? Number(metrics.average_score).toFixed(3)
                                    : "-"
                              }
                            ]}
                            onRow={(record) => ({
                              onClick: () => setSelectedEvaluationId(record.id)
                            })}
                            rowClassName={(record) =>
                              record.id === selectedEvaluationId ? "bg-gray-50 dark:bg-[#1f1f1f]" : ""
                            }
                          />

                          {evaluationDetail && (
                            <Card size="small" type="inner" className="mt-3" title={evaluationDetail.name || "Evaluation"}>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <Tag color={statusColor(evaluationDetail.status)}>
                                  {evaluationDetail.status}
                                </Tag>
                                {evaluationDetail.completed_at && (
                                  <Text type="secondary">
                                    {`${t("common:completed", "Completed")}: ${evaluationDetail.completed_at}`}
                                  </Text>
                                )}
                              </div>
                              <Divider />
                              <div className="text-sm space-y-2">
                                <div className="flex gap-2">
                                  <Text strong>Project:</Text>
                                  <Text>{evaluationDetail.project_id}</Text>
                                </div>
                                <div className="flex gap-2">
                                  <Text strong>Prompt:</Text>
                                  <Text>{evaluationDetail.prompt_id}</Text>
                                </div>
                                {evaluationDetail.aggregate_metrics && (
                                  <div>
                                    <Text strong>Metrics</Text>
                                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-[#1f1f1f] p-2 rounded">
                                      {JSON.stringify(evaluationDetail.aggregate_metrics, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {evaluationDetail.metrics && !evaluationDetail.aggregate_metrics && (
                                  <div>
                                    <Text strong>Metrics</Text>
                                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-[#1f1f1f] p-2 rounded">
                                      {JSON.stringify(evaluationDetail.metrics, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </Card>
                          )}
                        </Card>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          ) : (
            <Card>
              <Empty
                description={t("option:promptStudio.pickPrompt", "Select or create a prompt to begin")}
                image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Space>
                  <Button type="primary" disabled={!selectedProjectId} onClick={() => setPromptModalOpen(true)}>
                    {t("common:newPrompt", "New prompt")}
                  </Button>
                  <Button onClick={() => setProjectModalOpen(true)}>
                    {t("common:newProject", "New project")}
                  </Button>
                </Space>
              </Empty>
            </Card>
          )}
        </div>
      </div>

      <Modal
        title={t("common:newProject", "New project")}
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        footer={null}
        destroyOnClose>
        <Form layout="vertical" onFinish={(vals) => createProjectMutation.mutate(vals)}>
          <Form.Item
            name="name"
            label={t("common:name", "Name")}
            rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("common:description", "Description")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button onClick={() => setProjectModalOpen(false)}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button type="primary" htmlType="submit" loading={createProjectMutation.isPending}>
              {t("common:create", "Create")}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={t("common:newPrompt", "New prompt")}
        open={promptModalOpen}
        onCancel={() => setPromptModalOpen(false)}
        footer={null}
        destroyOnClose>
        <Form
          layout="vertical"
          form={createPromptForm}
          onFinish={(vals) => createPromptMutation.mutate(vals)}>
          <Form.Item
            name="name"
            label={t("common:name", "Name")}
            rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="system_prompt" label={t("option:promptStudio.systemPrompt", "System prompt")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="user_prompt" label={t("option:promptStudio.userPrompt", "User prompt")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button onClick={() => setPromptModalOpen(false)}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button type="primary" htmlType="submit" loading={createPromptMutation.isPending} disabled={!selectedProjectId}>
              {t("common:create", "Create")}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={t("common:newTestCase", "New test case")}
        open={testCaseModalOpen}
        onCancel={() => setTestCaseModalOpen(false)}
        footer={null}
        destroyOnClose>
        <Form
          layout="vertical"
          form={testCaseForm}
          onFinish={(vals) => createTestCaseMutation.mutate(vals)}
          initialValues={{ inputs: "{}", is_golden: false }}>
          <Form.Item name="name" label={t("common:name", "Name")}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t("common:description", "Description")}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="inputs"
            label={t("option:promptStudio.inputsJson", "Inputs (JSON)")}
            rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="expected_outputs"
            label={t("option:promptStudio.expectedJson", "Expected outputs (JSON)")}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="tags" label={t("common:tags", "Tags")}>
            <Input placeholder="comma,separated,tags" />
          </Form.Item>
          <Form.Item
            name="is_golden"
            valuePropName="checked"
            label={t("option:promptStudio.golden", "Is golden?")}>
            <Switch />
          </Form.Item>
          <Space>
            <Button onClick={() => setTestCaseModalOpen(false)}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createTestCaseMutation.isPending}
              disabled={!selectedProjectId}>
              {t("common:create", "Create")}
            </Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={t("option:promptStudio.bulkAdd", "Bulk add test cases")}
        open={bulkTestCaseModalOpen}
        onCancel={() => setBulkTestCaseModalOpen(false)}
        footer={null}
        destroyOnClose>
        <Form
          layout="vertical"
          form={bulkTestCaseForm}
          onFinish={(vals) => bulkCreateTestCasesMutation.mutate(vals)}>
          <Form.Item
            name="json"
            label={t("option:promptStudio.bulkJson", "JSON array of test cases")}
            rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder='[{"name":"Case","inputs":{},"expected_outputs":{}}]' />
          </Form.Item>
          <Space>
            <Button onClick={() => setBulkTestCaseModalOpen(false)}>
              {t("common:cancel", "Cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={bulkCreateTestCasesMutation.isPending}
              disabled={!selectedProjectId}>
              {t("common:create", "Create")}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
