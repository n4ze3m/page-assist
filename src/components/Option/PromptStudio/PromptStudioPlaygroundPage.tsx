import React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography
} from "antd"
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

  React.useEffect(() => {
    if (!projectsQuery.data?.data?.length) return
    const defaultId = defaultsQuery.data?.defaultProjectId
    if (defaultId && projectsQuery.data.data.some((p) => p.id === defaultId)) {
      setSelectedProjectId((prev) => prev ?? defaultId)
    } else {
      setSelectedProjectId((prev) => prev ?? projectsQuery.data.data[0].id)
    }
  }, [projectsQuery.data, defaultsQuery.data])

  const promptsQuery = useQuery({
    queryKey: ["prompt-studio", "prompts", selectedProjectId, promptPage, pageSize],
    queryFn: () =>
      selectedProjectId
        ? listPrompts(selectedProjectId, { page: promptPage, per_page: pageSize })
        : null,
    enabled: capabilityQuery.data === true && !!selectedProjectId && online
  })

  React.useEffect(() => {
    if (!promptsQuery.data?.data?.length) return
    setSelectedPromptId((prev) => prev ?? (promptsQuery.data?.data?.[0]?.id || null))
  }, [promptsQuery.data])

  const promptDetailQuery = useQuery({
    queryKey: ["prompt-studio", "prompt", selectedPromptId],
    queryFn: () => (selectedPromptId ? getPrompt(selectedPromptId) : null),
    enabled: capabilityQuery.data === true && !!selectedPromptId && online
  })

  React.useEffect(() => {
    const prompt = promptDetailQuery.data?.data
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

  const testCasesQuery = useQuery({
    queryKey: ["prompt-studio", "test-cases", selectedProjectId, testCasePage, pageSize],
    queryFn: () =>
      selectedProjectId
        ? listTestCases(selectedProjectId, { page: testCasePage, per_page: pageSize })
        : null,
    enabled: capabilityQuery.data === true && !!selectedProjectId && online
  })

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
        data?.evaluations?.some((e) =>
          ["running", "pending", "processing"].includes((e.status || "").toLowerCase())
        ) ?? false
      return hasRunning ? 5000 : false
    }
  })

  React.useEffect(() => {
    if (!evaluationsQuery.data?.evaluations?.length) return
    setSelectedEvaluationId((prev) => prev ?? (evaluationsQuery.data?.evaluations?.[0]?.id || null))
  }, [evaluationsQuery.data])

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
      const status = (data?.status || "").toLowerCase()
      return status === "running" || status === "pending" ? 4000 : false
    }
  })

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      createProject({ name: values.name, description: values.description }),
    onSuccess: (resp) => {
      setProjectModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ["prompt-studio", "projects"] })
      if (resp?.data?.id) {
        setSelectedProjectId(resp.data.id)
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
      if (resp?.data?.id) {
        setSelectedPromptId(resp.data.id)
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
      setExecutionResult(data)
      setExecutionError(null)
    },
    onError: (err: any) => {
      setExecutionError(err?.message || "Execution failed")
      setExecutionResult(null)
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

  const projectList = projectsQuery.data?.data || []
  const promptList = promptsQuery.data?.data || []
  const promptHistory = promptHistoryQuery.data?.data || []
  const testCaseList = testCasesQuery.data?.data || []
  const evaluationList = evaluationsQuery.data?.evaluations || []

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
      <div className="flex items-center justify-between">
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
      </div>

      <Card
        title={t("option:promptStudio.workspaceCard", "Projects & prompts")}
        extra={
          <Space>
            <Button onClick={() => setProjectModalOpen(true)} type="primary">
              {t("common:newProject", "New project")}
            </Button>
            <Button
              disabled={!selectedProjectId}
              onClick={() => setPromptModalOpen(true)}>
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
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 space-y-3">
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
              }}
            />
            <Table<Project>
              size="small"
              rowKey="id"
              pagination={{
                current: projectPage,
                pageSize: pageSize,
                total: projectsQuery.data?.metadata?.total,
                onChange: (page) => setProjectPage(page)
              }}
              loading={projectsQuery.isLoading}
              columns={[
                { title: "Name", dataIndex: "name" },
                { title: "Prompts", dataIndex: "prompt_count", width: 80 },
                { title: "Test cases", dataIndex: "test_case_count", width: 100 }
              ]}
              dataSource={projectList}
              onRow={(record) => ({
                onClick: () => setSelectedProjectId(record.id)
              })}
            />
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <Text strong>{t("common:prompts", "Prompts")}</Text>
            </div>
            <Table<Prompt>
              size="small"
              rowKey="id"
              pagination={{
                current: promptPage,
                pageSize: pageSize,
                total: promptsQuery.data?.metadata?.total,
                onChange: (page) => setPromptPage(page)
              }}
              loading={promptsQuery.isLoading}
              columns={[
                { title: "Name", dataIndex: "name" },
                { title: "Version", dataIndex: "version_number", width: 80 },
                {
                  title: "Updated",
                  dataIndex: "updated_at",
                  render: (v) => v || "-"
                }
              ]}
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

            {promptDetailQuery.isLoading && <Skeleton active paragraph={{ rows: 4 }} />}

            {promptDetailQuery.data?.data && (
              <Card
                type="inner"
                title={promptDetailQuery.data.data.name}
                extra={
                  <Text type="secondary">
                    {t("option:promptStudio.promptVersion", "Version")}{" "}
                    {promptDetailQuery.data.data.version_number}
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

                <Text strong>{t("option:promptStudio.history", "History")}</Text>
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
            )}
          </div>
        </div>
      </Card>

      <Card
        title={t("option:promptStudio.executeCard", "Ad-hoc execute")}
        extra={
          <Text type="secondary">{t("option:promptStudio.executeHint", "Provider, model, temperature, inputs.")}</Text>
        }>
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

      <Card
        title={t("option:promptStudio.testsCard", "Test cases & evaluations")}
        extra={
          <Space>
            <Button onClick={() => setTestCaseModalOpen(true)}>{t("common:newTestCase", "New test case")}</Button>
            <Button onClick={() => setBulkTestCaseModalOpen(true)}>
              {t("option:promptStudio.bulkAdd", "Bulk add")}
            </Button>
          </Space>
        }>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Text strong>{t("option:promptStudio.testCases", "Test cases")}</Text>
            <Table<TestCase>
              size="small"
              rowKey="id"
              pagination={{
                current: testCasePage,
                pageSize,
                total: testCasesQuery.data?.metadata?.total,
                onChange: (page) => setTestCasePage(page)
              }}
              loading={testCasesQuery.isLoading}
              rowSelection={{
                selectedRowKeys: selectedTestCaseIds,
                onChange: (keys) => setSelectedTestCaseIds(keys as number[])
              }}
              columns={[
                { title: "Name", dataIndex: "name" },
                {
                  title: "Tags",
                  dataIndex: "tags",
                  render: (tags?: string[]) =>
                    tags?.map((tag) => <Tag key={tag}>{tag}</Tag>)
                },
                {
                  title: "Golden",
                  dataIndex: "is_golden",
                  width: 80,
                  render: (val) => (val ? "Yes" : "No")
                }
              ]}
              dataSource={testCaseList}
            />
          </div>

          <div className="space-y-3">
            <Text strong>{t("option:promptStudio.evaluations", "Evaluations")}</Text>
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
              <div className="grid gap-3 md:grid-cols-2">
                <Form.Item label={t("common:name", "Name")} name="name">
                  <Input placeholder="Baseline eval" />
                </Form.Item>
                <Form.Item
                  label={t("option:promptStudio.runAsync", "Run async")}
                  name="run_async"
                  valuePropName="checked">
                  <Switch />
                </Form.Item>
              </div>
              <Form.Item label={t("common:description", "Description")} name="description">
                <Input.TextArea rows={2} />
              </Form.Item>
              <div className="grid gap-3 md:grid-cols-3">
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

            <Table<PromptStudioEvaluation>
              size="small"
              rowKey="id"
              pagination={{
                current: evaluationPage,
                pageSize,
                total: evaluationsQuery.data?.total,
                onChange: (page) => setEvaluationPage(page)
              }}
              loading={evaluationsQuery.isLoading}
              dataSource={evaluationList}
              columns={[
                { title: "Name", dataIndex: "name" },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (val) => <Tag color={statusColor(val)}>{val}</Tag>
                },
                {
                  title: "Avg score",
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

            {evaluationDetailQuery.data && (
              <Card size="small" type="inner" title={evaluationDetailQuery.data.name || "Evaluation"}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Tag color={statusColor(evaluationDetailQuery.data.status)}>
                    {evaluationDetailQuery.data.status}
                  </Tag>
                  {evaluationDetailQuery.data.completed_at && (
                    <Text type="secondary">
                      {`${t("common:completed", "Completed")}: ${evaluationDetailQuery.data.completed_at}`}
                    </Text>
                  )}
                </div>
                <Divider />
                <div className="text-sm">
                  <div className="flex gap-2">
                    <Text strong>Project:</Text>
                    <Text>{evaluationDetailQuery.data.project_id}</Text>
                  </div>
                  <div className="flex gap-2">
                    <Text strong>Prompt:</Text>
                    <Text>{evaluationDetailQuery.data.prompt_id}</Text>
                  </div>
                  {evaluationDetailQuery.data.aggregate_metrics && (
                    <div className="mt-2">
                      <Text strong>Metrics</Text>
                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-[#1f1f1f] p-2 rounded">
                        {JSON.stringify(evaluationDetailQuery.data.aggregate_metrics, null, 2)}
                      </pre>
                    </div>
                  )}
                  {evaluationDetailQuery.data.metrics && !evaluationDetailQuery.data.aggregate_metrics && (
                    <div className="mt-2">
                      <Text strong>Metrics</Text>
                      <pre className="whitespace-pre-wrap text-xs bg-gray-50 dark:bg-[#1f1f1f] p-2 rounded">
                        {JSON.stringify(evaluationDetailQuery.data.metrics, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </Card>

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
