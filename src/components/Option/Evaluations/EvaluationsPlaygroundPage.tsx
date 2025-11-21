import React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  notification
} from "antd"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import {
  DatasetResponse,
  EvaluationRateLimitStatus,
  EvaluationRunDetail,
  EvaluationSummary,
  createDataset,
  createEvaluation,
  createRun,
  deleteDataset,
  getRateLimits,
  getRun,
  listDatasets,
  listEvaluations,
  listRuns
} from "@/services/evaluations"

const { Title, Text } = Typography

const getDefaultEvalSpecForType = (evalType: string) => {
  switch (evalType) {
    case "response_quality":
      return {
        metrics: ["coherence", "conciseness", "relevance"],
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        thresholds: { min_score: 0.7 }
      }
    case "rag":
      return {
        metrics: ["relevance", "faithfulness", "answer_similarity"],
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        thresholds: {
          min_relevance: 0.7,
          min_faithfulness: 0.7,
          min_answer_similarity: 0.7
        }
      }
    case "geval":
      return {
        metrics: ["g_eval_score"],
        model: "gpt-3.5-turbo",
        temperature: 0
      }
    case "exact_match":
      return {
        metrics: ["exact_match"],
        model: "gpt-3.5-turbo",
        temperature: 0
      }
    default:
      return {
        metrics: ["accuracy"],
        model: "gpt-3.5-turbo",
        temperature: 0.3
      }
  }
}

export const EvaluationsPlaygroundPage = () => {
  const { t } = useTranslation(["settings", "common"])
  const isOnline = useServerOnline()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [createEvalOpen, setCreateEvalOpen] = React.useState(false)
  const [createDatasetOpen, setCreateDatasetOpen] = React.useState(false)
  const [evalSpecText, setEvalSpecText] = React.useState(
    JSON.stringify(getDefaultEvalSpecForType("response_quality"), null, 2)
  )
  const [evalSpecError, setEvalSpecError] = React.useState<string | null>(null)
  const [selectedEvalId, setSelectedEvalId] = React.useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)

  const [createEvalForm] = Form.useForm()
  const [createDatasetForm] = Form.useForm()

  const {
    data: evalListResp,
    isLoading: evalsLoading,
    isError: evalsError
  } = useQuery({
    queryKey: ["evaluations", "list", { limit: 20 }],
    queryFn: () => listEvaluations({ limit: 20 })
  })

  const {
    data: rateLimitsResp,
    isLoading: rateLimitsLoading,
    isError: rateLimitsError
  } = useQuery({
    queryKey: ["evaluations", "rate-limits"],
    queryFn: () => getRateLimits()
  })

  const {
    data: datasetListResp,
    isLoading: datasetsLoading,
    isError: datasetsError
  } = useQuery({
    queryKey: ["evaluations", "datasets", { limit: 50, offset: 0 }],
    queryFn: () => listDatasets({ limit: 50, offset: 0 })
  })

  const {
    data: runsListResp,
    isLoading: runsLoading,
    isError: runsError
  } = useQuery({
    queryKey: ["evaluations", "runs", selectedEvalId, { limit: 20 }],
    queryFn: () => listRuns(selectedEvalId as string, { limit: 20 }),
    enabled: !!selectedEvalId
  })

  const {
    data: runDetailResp,
    isLoading: runDetailLoading,
    isError: runDetailError
  } = useQuery({
    queryKey: ["evaluations", "run", selectedRunId],
    queryFn: () => getRun(selectedRunId as string),
    enabled: !!selectedRunId
  })

  const { mutateAsync: mutateCreateDataset, isPending: creatingDataset } =
    useMutation({
      mutationFn: createDataset,
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: ["evaluations", "datasets"]
        })
        notification.success({
          message: t("settings:evaluations.datasetCreateSuccessTitle", {
            defaultValue: "Dataset created"
          }),
          description: t(
            "settings:evaluations.datasetCreateSuccessDescription",
            {
              defaultValue: "Your dataset is ready to use in evaluations."
            }
          )
        })
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.datasetCreateErrorTitle", {
            defaultValue: "Failed to create dataset"
          }),
          description:
            error?.message ||
            t("settings:evaluations.datasetCreateErrorDescription", {
              defaultValue:
                "The server rejected this dataset. Check the fields and try again."
            })
        })
      }
    })

  const { mutateAsync: mutateCreateEvaluation, isPending: creatingEval } =
    useMutation({
      mutationFn: createEvaluation,
      onSuccess: (resp) => {
        void queryClient.invalidateQueries({
          queryKey: ["evaluations", "list"]
        })
        const evalId = (resp as any)?.data?.id
        if (evalId) {
          setSelectedEvalId(evalId)
        }
        notification.success({
          message: t("settings:evaluations.createSuccessTitle", {
            defaultValue: "Evaluation created"
          })
        })
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.createErrorTitle", {
            defaultValue: "Failed to create evaluation"
          }),
          description:
            error?.message ||
            t("settings:evaluations.createErrorDescription", {
              defaultValue:
                "The server rejected this evaluation. Ensure name, type, and spec are valid."
            })
        })
      }
    })

  const { mutateAsync: mutateCreateRun, isPending: creatingRun } = useMutation({
    mutationFn: (params: { evalId: string; targetModel: string }) =>
      createRun(params.evalId, {
        target_model: params.targetModel,
        config: {},
        webhook_url: undefined
      }),
    onSuccess: () => {
      notification.success({
        message: t("settings:evaluations.runCreateSuccessTitle", {
          defaultValue: "Run started"
        }),
        description: t("settings:evaluations.runCreateSuccessDescription", {
          defaultValue:
            "Your evaluation run has started. You can monitor it from the server UI."
        })
      })
    },
    onError: (error: any) => {
      notification.error({
        message: t("settings:evaluations.runCreateErrorTitle", {
          defaultValue: "Failed to start run"
        }),
        description:
          error?.message ||
          t("settings:evaluations.runCreateErrorDescription", {
            defaultValue:
              "The server rejected this run request. Check the model and try again."
          })
      })
    }
  })

  const { mutateAsync: mutateDeleteDataset, isPending: deletingDataset } =
    useMutation({
      mutationFn: deleteDataset,
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: ["evaluations", "datasets"]
        })
        notification.success({
          message: t("settings:evaluations.datasetDeleteSuccessTitle", {
            defaultValue: "Dataset deleted"
          })
        })
      },
      onError: () => {
        notification.error({
          message: t("settings:evaluations.datasetDeleteErrorTitle", {
            defaultValue: "Failed to delete dataset"
          })
        })
      }
    })

  if (!isOnline) {
    return (
      <FeatureEmptyState
        title={t("settings:evaluations.emptyConnectTitle", {
          defaultValue: "Connect to use Evaluations"
        })}
        description={t("settings:evaluations.emptyConnectDescription", {
          defaultValue:
            "To create and run evaluations, first connect to your tldw server."
        })}
        examples={[
          t("settings:evaluations.emptyConnectExample1", {
            defaultValue:
              "Open Settings → tldw server to add your server URL and API key."
          }),
          t("settings:evaluations.emptyConnectExample2", {
            defaultValue:
              "Once connected, you can define evaluations and inspect metrics here."
          })
        ]}
        primaryActionLabel={t("common:connectToServer", {
          defaultValue: "Connect to server"
        })}
        onPrimaryAction={() => navigate("/settings/tldw")}
      />
    )
  }

  const evaluations = evalListResp?.data?.data || []
  const rateLimits: EvaluationRateLimitStatus | undefined = rateLimitsResp?.data
  const datasets: DatasetResponse[] = datasetListResp?.data?.data || []
  const runs = runsListResp?.data?.data || []
  const runDetail: EvaluationRunDetail | undefined = runDetailResp?.data

  const handleSubmitCreateDataset = async () => {
    try {
      const values = await createDatasetForm.validateFields()
      const samples = [
        {
          input: values.sampleInput,
          expected: values.sampleExpected || undefined
        }
      ]
      await mutateCreateDataset({
        name: values.name,
        description: values.description,
        samples
      })
      createDatasetForm.resetFields()
      setCreateDatasetOpen(false)
    } catch {
      // validation errors handled by antd
    }
  }

  const handleSubmitCreateEvaluation = async () => {
    setEvalSpecError(null)
    try {
      const values = await createEvalForm.validateFields()
      let spec: any
      try {
        spec = JSON.parse(evalSpecText || "{}")
      } catch (e: any) {
        setEvalSpecError(
          e?.message ||
            t("settings:evaluations.evalSpecParseError", {
              defaultValue: "Evaluation spec must be valid JSON."
            })
        )
        return
      }

      const sanitizedName = String(values.name || "")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "-")

      await mutateCreateEvaluation({
        name: sanitizedName,
        description: values.description,
        eval_type: values.evalType,
        eval_spec: spec,
        dataset_id: values.datasetId || undefined
      })

      setCreateEvalOpen(false)
      createEvalForm.resetFields()
    } catch {
      // handled by form
    }
  }

  const handleStartRunForSelection = async () => {
    if (!selectedEvalId) {
      notification.info({
        message: t("settings:evaluations.noEvalSelectedTitle", {
          defaultValue: "Select an evaluation first"
        })
      })
      return
    }
    const targetModel =
      createEvalForm.getFieldValue("runModel") || "gpt-3.5-turbo"
    await mutateCreateRun({ evalId: selectedEvalId, targetModel })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-4">
      <div className="space-y-1">
        <Title level={4} className="!mb-0">
          {t("settings:evaluations.title", {
            defaultValue: "Evaluations playground"
          })}
        </Title>
        <Text type="secondary">
          {t("settings:evaluations.subtitle", {
            defaultValue:
              "Define evaluations against your tldw server and inspect recent runs."
          })}
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card
            title={t("settings:evaluations.listTitle", {
              defaultValue: "Recent evaluations"
            })}
            extra={
              <Space>
                <Button
                  onClick={() => {
                    setEvalSpecError(null)
                    setEvalSpecText(
                      JSON.stringify(
                        getDefaultEvalSpecForType("response_quality"),
                        null,
                        2
                      )
                    )
                    createEvalForm.setFieldsValue({
                      evalType: "response_quality",
                      runModel: "gpt-3.5-turbo"
                    })
                    setCreateEvalOpen(true)
                  }}
                  type="primary">
                  {t("settings:evaluations.newEvaluationCta", {
                    defaultValue: "New evaluation"
                  })}
                </Button>
                <Button
                  disabled={creatingRun}
                  onClick={() => void handleStartRunForSelection()}>
                  {t("settings:evaluations.startRunCta", {
                    defaultValue: "Start run"
                  })}
                </Button>
              </Space>
            }>
            {evalsLoading ? (
              <div className="flex justify-center py-6">
                <Spin />
              </div>
            ) : evalsError || evalListResp?.ok === false ? (
              <Alert
                type="error"
                message={t("settings:evaluations.loadErrorTitle", {
                  defaultValue: "Unable to load evaluations"
                })}
                description={t("settings:evaluations.loadErrorDescription", {
                  defaultValue:
                    "Check your tldw server connection and API credentials, then try again."
                })}
              />
            ) : evaluations.length === 0 ? (
              <Empty
                description={t("settings:evaluations.emptyList", {
                  defaultValue:
                    "No evaluations yet. Once you create one, it will appear here."
                })}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {evaluations.map((ev: EvaluationSummary) => (
                  <Card
                    key={ev.id}
                    size="small"
                    className="hover:border-blue-500/70"
                    bodyStyle={{ padding: "8px 12px" }}
                    onClick={() => {
                      setSelectedEvalId(ev.id)
                      setSelectedRunId(null)
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {ev.name || ev.id}
                        </span>
                        {ev.description && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {ev.description}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedEvalId === ev.id && (
                          <Tag color="green" className="text-xs">
                            {t("settings:evaluations.selectedTag", {
                              defaultValue: "Selected"
                            })}
                          </Tag>
                        )}
                        {ev.eval_type && (
                          <Tag color="blue" className="text-xs">
                            {ev.eval_type}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            title={t("settings:evaluations.rateLimitsTitle", {
              defaultValue: "Evaluation limits"
            })}>
            {rateLimitsLoading ? (
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            ) : rateLimitsError || rateLimitsResp?.ok === false ? (
              <Alert
                type="warning"
                showIcon
                message={t("settings:evaluations.rateLimitsErrorTitle", {
                  defaultValue: "Unable to fetch rate limits"
                })}
                description={t(
                  "settings:evaluations.rateLimitsErrorDescription",
                  {
                    defaultValue:
                      "We could not retrieve evaluation quotas from the server."
                  }
                )}
              />
            ) : rateLimits ? (
              <div className="space-y-2 text-xs">
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.tierLabel", {
                      defaultValue: "Tier"
                    })}
                    {": "}
                  </Text>
                  <Text>{rateLimits.tier}</Text>
                </div>
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.dailyLimitLabel", {
                      defaultValue: "Daily evaluations"
                    })}
                    {": "}
                  </Text>
                  <Text>
                    {rateLimits.usage.evaluations_today}/
                    {rateLimits.limits.evaluations_per_day}
                  </Text>
                </div>
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.tokensTodayLabel", {
                      defaultValue: "Tokens today"
                    })}
                    {": "}
                  </Text>
                  <Text>
                    {rateLimits.usage.tokens_today}/
                    {rateLimits.limits.tokens_per_day}
                  </Text>
                </div>
              </div>
            ) : (
              <Text type="secondary" className="text-xs">
                {t("settings:evaluations.rateLimitsNoData", {
                  defaultValue:
                    "Rate limit information is not available for this server."
                })}
              </Text>
            )}
          </Card>

          <Card
            title={t("settings:evaluations.runsTitle", {
              defaultValue: "Runs"
            })}>
            {!selectedEvalId ? (
              <Text type="secondary" className="text-xs">
                {t("settings:evaluations.noEvalSelectedRuns", {
                  defaultValue: "Select an evaluation to see its recent runs."
                })}
              </Text>
            ) : runsLoading ? (
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            ) : runsError || runsListResp?.ok === false ? (
              <Alert
                type="warning"
                showIcon
                message={t("settings:evaluations.runsErrorTitle", {
                  defaultValue: "Unable to load runs"
                })}
              />
            ) : runs.length === 0 ? (
              <Empty
                description={t("settings:evaluations.runsEmpty", {
                  defaultValue: "No runs yet for this evaluation."
                })}
              />
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex cursor-pointer items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-gray-700"
                    onClick={() => setSelectedRunId(run.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">Run {run.id}</span>
                      {run.status && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {run.status}
                        </span>
                      )}
                    </div>
                    {selectedRunId === run.id && (
                      <Tag color="green" className="text-[11px]">
                        {t("settings:evaluations.selectedTag", {
                          defaultValue: "Selected"
                        })}
                      </Tag>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t("settings:evaluations.runDetailTitle", {
              defaultValue: "Run details"
            })}>
            {!selectedRunId ? (
              <Text type="secondary" className="text-xs">
                {t("settings:evaluations.noRunSelected", {
                  defaultValue: "Select a run to see details."
                })}
              </Text>
            ) : runDetailLoading ? (
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            ) : runDetailError || runDetailResp?.ok === false ? (
              <Alert
                type="warning"
                showIcon
                message={t("settings:evaluations.runDetailErrorTitle", {
                  defaultValue: "Unable to load run details"
                })}
              />
            ) : runDetail ? (
              <div className="space-y-1 text-xs">
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.runStatusLabel", {
                      defaultValue: "Status"
                    })}
                    {": "}
                  </Text>
                  <Text>{runDetail.status}</Text>
                </div>
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.runModelLabelShort", {
                      defaultValue: "Target model"
                    })}
                    {": "}
                  </Text>
                  <Text>{runDetail.target_model}</Text>
                </div>
                {runDetail.error_message && (
                  <div>
                    <Text type="secondary">
                      {t("settings:evaluations.runErrorLabel", {
                        defaultValue: "Error"
                      })}
                      {": "}
                    </Text>
                    <Text type="danger">{runDetail.error_message}</Text>
                  </div>
                )}
                {runDetail.results && (
                  <div className="mt-2">
                    <Text type="secondary">
                      {t("settings:evaluations.runResultsLabel", {
                        defaultValue: "Results (snippet)"
                      })}
                    </Text>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100 dark:bg-black">
                      {JSON.stringify(runDetail.results, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}
          </Card>

          <Card
            title={t("settings:evaluations.datasetsTitle", {
              defaultValue: "Datasets"
            })}
            extra={
              <Button
                size="small"
                onClick={() => setCreateDatasetOpen(true)}
                disabled={creatingDataset}>
                {t("settings:evaluations.newDatasetCta", {
                  defaultValue: "New dataset"
                })}
              </Button>
            }>
            {datasetsLoading ? (
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            ) : datasetsError || datasetListResp?.ok === false ? (
              <Alert
                type="warning"
                showIcon
                message={t("settings:evaluations.datasetsErrorTitle", {
                  defaultValue: "Unable to load datasets"
                })}
              />
            ) : datasets.length === 0 ? (
              <Empty
                description={t("settings:evaluations.datasetsEmpty", {
                  defaultValue:
                    "No datasets yet. Create one to attach to evaluations."
                })}
              />
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {datasets.map((ds) => (
                  <div
                    key={ds.id}
                    className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-gray-700">
                    <div className="flex flex-col">
                      <span className="font-medium">{ds.name}</span>
                      {ds.description && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {ds.description}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {t("settings:evaluations.datasetSampleCount", {
                          defaultValue: "{{count}} samples",
                          count: ds.sample_count
                        })}
                      </span>
                    </div>
                    <Button
                      size="small"
                      danger
                      loading={deletingDataset}
                      onClick={() => void mutateDeleteDataset(ds.id)}>
                      {t("common:delete", { defaultValue: "Delete" })}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        title={t("settings:evaluations.createEvalModalTitle", {
          defaultValue: "New evaluation"
        })}
        open={createEvalOpen}
        onCancel={() => setCreateEvalOpen(false)}
        onOk={() => void handleSubmitCreateEvaluation()}
        confirmLoading={creatingEval}
        okText={t("common:create", { defaultValue: "Create" }) as string}>
        <Form form={createEvalForm} layout="vertical">
          <Form.Item
            label={t("settings:evaluations.evalNameLabel", {
              defaultValue: "Name"
            })}
            name="name"
            rules={[
              { required: true },
              {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message: t("settings:evaluations.evalNameValidation", {
                  defaultValue:
                    "Use only letters, numbers, hyphens, and underscores."
                }) as string
              }
            ]}>
            <Input
              placeholder={t("settings:evaluations.evalNamePlaceholder", {
                defaultValue: "my_eval_run"
              })}
            />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.evalTypeLabel", {
              defaultValue: "Evaluation type"
            })}
            name="evalType"
            initialValue="response_quality"
            rules={[{ required: true }]}>
            <Select
              onChange={(value) => {
                setEvalSpecError(null)
                setEvalSpecText(
                  JSON.stringify(getDefaultEvalSpecForType(value), null, 2)
                )
              }}
              options={[
                { value: "response_quality", label: "response_quality" },
                { value: "rag", label: "rag" },
                { value: "geval", label: "geval" },
                { value: "exact_match", label: "exact_match" }
              ]}
            />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.datasetLabel", {
              defaultValue: "Dataset (optional)"
            })}
            name="datasetId">
            <Select
              allowClear
              placeholder={t("settings:evaluations.datasetPlaceholder", {
                defaultValue: "Select dataset"
              })}
              loading={datasetsLoading}
              options={datasets.map((ds) => ({
                value: ds.id,
                label: ds.name
              }))}
            />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.runModelLabel", {
              defaultValue: "Run model (used for quick runs)"
            })}
            name="runModel"
            initialValue="gpt-3.5-turbo">
            <Input />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.evalSpecLabel", {
              defaultValue: "Evaluation spec (JSON)"
            })}>
            <Input.TextArea
              rows={6}
              value={evalSpecText}
              onChange={(e) => setEvalSpecText(e.target.value)}
            />
            {evalSpecError && (
              <div className="mt-1 text-xs text-red-600">
                {evalSpecError}
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("settings:evaluations.createDatasetModalTitle", {
          defaultValue: "New dataset"
        })}
        open={createDatasetOpen}
        onCancel={() => setCreateDatasetOpen(false)}
        onOk={() => void handleSubmitCreateDataset()}
        confirmLoading={creatingDataset}
        okText={t("common:create", { defaultValue: "Create" }) as string}>
        <Form form={createDatasetForm} layout="vertical">
          <Form.Item
            label={t("settings:evaluations.datasetNameLabel", {
              defaultValue: "Name"
            })}
            name="name"
            rules={[{ required: true }]}>
            <Input
              placeholder={t(
                "settings:evaluations.datasetNamePlaceholder",
                { defaultValue: "my_dataset" }
              )}
            />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.datasetDescriptionLabel", {
              defaultValue: "Description"
            })}
            name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.sampleInputLabel", {
              defaultValue: "Sample input"
            })}
            name="sampleInput"
            rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.sampleExpectedLabel", {
              defaultValue: "Expected output (optional)"
            })}
            name="sampleExpected">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
