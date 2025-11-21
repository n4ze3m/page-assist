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
  Checkbox,
  Divider,
} from "antd"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerOnline } from "@/hooks/useServerOnline"
import { useAntdNotification } from "@/hooks/useAntdNotification"
import {
  DatasetResponse,
  EvaluationRateLimitStatus,
  EvaluationRunDetail,
  EvaluationDetail,
  EvaluationHistoryItem,
  EvaluationSummary,
  cancelRun,
  createDataset,
  createEvaluation,
  deleteEvaluation,
  createRun,
  deleteDataset,
  getDataset,
  getEvaluation,
  getHistory,
  getRateLimits,
  getRun,
  listDatasets,
  listEvaluations,
  listRuns,
  listWebhooks,
  registerWebhook,
  updateEvaluation,
  deleteWebhook
} from "@/services/evaluations"

const { Title, Text } = Typography

const getDefaultEvalSpecForType = (evalType: string) => {
  switch (evalType) {
    case "model_graded":
      return {
        sub_type: "response_quality",
        metrics: ["coherence", "relevance", "groundedness"],
        threshold: 0.7,
        evaluator_model: "openai"
      }
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
    case "includes":
      return {
        metrics: ["includes"],
        case_sensitive: false
      }
    case "fuzzy_match":
      return {
        metrics: ["fuzzy_match"],
        threshold: 0.85
      }
    case "rag_pipeline":
      return {
        sub_type: "rag_pipeline",
        metrics: ["retrieval_precision", "faithfulness", "answer_relevancy"],
        evaluator_model: "openai"
      }
    case "proposition_extraction":
      return {
        metrics: ["proposition_extraction"],
        evaluator_model: "openai",
        proposition_schema: ["claim", "evidence"]
      }
    case "qa3":
      return {
        metrics: ["qa3"],
        evaluator_model: "openai",
        labels: ["good", "borderline", "bad"]
      }
    case "label_choice":
      return {
        metrics: ["label_choice"],
        allowed_labels: ["A", "B", "C"]
      }
    case "nli_factcheck":
      return {
        metrics: ["nli_factcheck"],
        allowed_labels: ["entailed", "contradicted", "neutral"]
      }
    case "ocr":
      return {
        metrics: ["cer", "wer", "coverage"],
        language: "eng"
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
  const notification = useAntdNotification()

  const [createEvalOpen, setCreateEvalOpen] = React.useState(false)
  const [createDatasetOpen, setCreateDatasetOpen] = React.useState(false)
  const [evalSpecText, setEvalSpecText] = React.useState(
    JSON.stringify(getDefaultEvalSpecForType("response_quality"), null, 2)
  )
  const [evalSpecError, setEvalSpecError] = React.useState<string | null>(null)
  const [selectedEvalId, setSelectedEvalId] = React.useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)
  const [editingEvalId, setEditingEvalId] = React.useState<string | null>(null)
  const [inlineDatasetEnabled, setInlineDatasetEnabled] = React.useState(false)
  const [inlineDatasetText, setInlineDatasetText] = React.useState(
    JSON.stringify(
      [
        {
          input: {
            question: "Q1",
            contexts: ["ctx"],
            response: "A"
          },
          expected: { answer: "A" }
        }
      ],
      null,
      2
    )
  )
  const [runConfigText, setRunConfigText] = React.useState(
    JSON.stringify({ batch_size: 10 }, null, 2)
  )
  const [datasetOverrideText, setDatasetOverrideText] = React.useState("")
  const [runIdempotencyKey, setRunIdempotencyKey] = React.useState(
    (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
  )
  const [evalIdempotencyKey, setEvalIdempotencyKey] = React.useState(
    (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
  )
  const [historyResults, setHistoryResults] = React.useState<
    EvaluationHistoryItem[]
  >([])
  const [viewingDataset, setViewingDataset] = React.useState<DatasetResponse | null>(null)
  const [webhookSecretText, setWebhookSecretText] = React.useState<string | null>(null)

  const [createEvalForm] = Form.useForm()
  const [createDatasetForm] = Form.useForm()
  const [runForm] = Form.useForm()
  const [historyForm] = Form.useForm()
  const [webhookForm] = Form.useForm()

  React.useEffect(() => {
    runForm.setFieldsValue({
      targetModel: runForm.getFieldValue("targetModel") || "gpt-3.5-turbo",
      configJson: runConfigText,
      datasetOverrideJson: datasetOverrideText,
      idempotencyKey: runIdempotencyKey
    })
  }, [runForm, runConfigText, datasetOverrideText, runIdempotencyKey])

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
    enabled: !!selectedRunId,
    refetchInterval: (query) => {
      const status = (query?.state?.data as any)?.data?.status
      if (!status) return false
      return ["running", "pending"].includes(String(status).toLowerCase())
        ? 3000
        : false
    }
  })

  const {
    data: evalDetailResp,
    isLoading: evalDetailLoading,
    isError: evalDetailError
  } = useQuery({
    queryKey: ["evaluations", "detail", selectedEvalId],
    queryFn: () => getEvaluation(selectedEvalId as string),
    enabled: !!selectedEvalId
  })

  const {
    data: webhooksResp,
    isLoading: webhooksLoading,
    isError: webhooksError,
    refetch: refetchWebhooks
  } = useQuery({
    queryKey: ["evaluations", "webhooks"],
    queryFn: () => listWebhooks(),
    enabled: isOnline
  })

  const ensureOk = <T,>(resp: any) => {
    if (!resp?.ok) {
      const err = new Error(resp?.error || `HTTP ${resp?.status}`)
      ;(err as any).resp = resp
      throw err
    }
    return resp as typeof resp
  }

  const { mutateAsync: mutateCreateDataset, isPending: creatingDataset } =
    useMutation({
      mutationFn: async (payload: {
        name: string
        description?: string
        samples: any[]
        metadata?: Record<string, any>
      }) => ensureOk(await createDataset(payload)),
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
        const retryAfter = error?.resp?.retryAfterMs
        notification.error({
          message: t("settings:evaluations.datasetCreateErrorTitle", {
            defaultValue: "Failed to create dataset"
          }),
          description:
            error?.message ||
            t("settings:evaluations.datasetCreateErrorDescription", {
              defaultValue:
                "The server rejected this dataset. Check the fields and try again."
            }) +
            (retryAfter
              ? ` — retry after ${Math.ceil(Number(retryAfter) / 1000)}s`
              : "")
        })
      }
    })

  const { mutateAsync: mutateCreateEvaluation, isPending: creatingEval } =
    useMutation({
      mutationFn: async (params: {
        payload: any
        idempotencyKey?: string
      }) =>
        ensureOk(
          await createEvaluation(params.payload, {
            idempotencyKey: params.idempotencyKey
          })
        ),
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
        const retryAfter = error?.resp?.retryAfterMs
        notification.error({
          message: t("settings:evaluations.createErrorTitle", {
            defaultValue: "Failed to create evaluation"
          }),
          description:
            error?.message ||
            t("settings:evaluations.createErrorDescription", {
              defaultValue:
                "The server rejected this evaluation. Ensure name, type, and spec are valid."
            }) +
            (retryAfter
              ? ` — retry after ${Math.ceil(Number(retryAfter) / 1000)}s`
              : "")
        })
      }
    })

  const { mutateAsync: mutateCreateRun, isPending: creatingRun } = useMutation({
    mutationFn: async (params: {
      evalId: string
      payload: any
      idempotencyKey?: string
    }) =>
      ensureOk(
        await createRun(params.evalId, params.payload, {
          idempotencyKey: params.idempotencyKey
        })
      ),
    onSuccess: (resp) => {
      const runId = (resp as any)?.data?.id || (resp as any)?.data?.run_id
      if (runId) {
        setSelectedRunId(String(runId))
        void queryClient.invalidateQueries({
          queryKey: ["evaluations", "runs", selectedEvalId, { limit: 20 }]
        })
      }
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
      const retryAfter = error?.resp?.retryAfterMs
      notification.error({
        message: t("settings:evaluations.runCreateErrorTitle", {
          defaultValue: "Failed to start run"
        }),
        description:
          error?.message ||
          t("settings:evaluations.runCreateErrorDescription", {
            defaultValue:
              "The server rejected this run request. Check the model and try again."
          }) +
            (retryAfter
              ? ` — retry after ${Math.ceil(Number(retryAfter) / 1000)}s`
              : "")
      })
    }
  })

  const { mutateAsync: mutateDeleteDataset, isPending: deletingDataset } =
    useMutation({
      mutationFn: async (datasetId: string) =>
        ensureOk(await deleteDataset(datasetId)),
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

  const { mutateAsync: mutateUpdateEvaluation, isPending: updatingEval } =
    useMutation({
      mutationFn: async (params: {
        evalId: string
        payload: Partial<any>
      }) => ensureOk(await updateEvaluation(params.evalId, params.payload)),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: ["evaluations", "list"]
        })
        if (selectedEvalId) {
          void queryClient.invalidateQueries({
            queryKey: ["evaluations", "detail", selectedEvalId]
          })
        }
        notification.success({
          message: t("settings:evaluations.updateSuccessTitle", {
            defaultValue: "Evaluation updated"
          })
        })
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.updateErrorTitle", {
            defaultValue: "Failed to update evaluation"
          }),
          description: error?.message
        })
      }
    })

  const { mutateAsync: mutateDeleteEvaluation, isPending: deletingEval } =
    useMutation({
      mutationFn: async (evalId: string) =>
        ensureOk(await deleteEvaluation(evalId)),
      onSuccess: (_resp, evalId) => {
        void queryClient.invalidateQueries({
          queryKey: ["evaluations", "list"]
        })
        if (selectedEvalId === evalId) {
          setSelectedEvalId(null)
          setSelectedRunId(null)
        }
        setEditingEvalId(null)
        notification.success({
          message: t("common:deleted", { defaultValue: "Deleted" })
        })
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.deleteErrorTitle", {
            defaultValue: "Failed to delete evaluation"
          }),
          description: error?.message
        })
      }
    })

  const { mutateAsync: mutateCancelRun, isPending: cancelingRun } =
    useMutation({
      mutationFn: async (runId: string) => ensureOk(await cancelRun(runId)),
      onSuccess: () => {
        notification.success({
          message: t("settings:evaluations.runCancelSuccessTitle", {
            defaultValue: "Run cancellation requested"
          })
        })
        if (selectedEvalId) {
          void queryClient.invalidateQueries({
            queryKey: ["evaluations", "runs", selectedEvalId, { limit: 20 }]
          })
        }
        if (selectedRunId) {
          void queryClient.invalidateQueries({
            queryKey: ["evaluations", "run", selectedRunId]
          })
        }
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.runCancelErrorTitle", {
            defaultValue: "Failed to cancel run"
          }),
          description: error?.message
        })
      }
    })

  const { mutateAsync: mutateHistory, isPending: historyPending } =
    useMutation({
      mutationFn: async (filters: any) => ensureOk(await getHistory(filters)),
      onSuccess: (resp) => {
        const list =
          (resp as any)?.data?.data ||
          (Array.isArray((resp as any)?.data)
            ? (resp as any)?.data
            : (resp as any)?.data?.items) ||
          []
        setHistoryResults(list as EvaluationHistoryItem[])
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.historyErrorTitle", {
            defaultValue: "Failed to fetch history"
          }),
          description: error?.message
        })
      }
    })

  const { mutateAsync: mutateLoadDataset, isPending: loadingDatasetDetail } =
    useMutation({
      mutationFn: async (datasetId: string) =>
        ensureOk(await getDataset(datasetId)),
      onSuccess: (resp) => {
        setViewingDataset((resp as any)?.data || null)
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.datasetLoadErrorTitle", {
            defaultValue: "Failed to load dataset"
          }),
          description: error?.message
        })
      }
    })

  const { mutateAsync: mutateRegisterWebhook, isPending: registeringWebhook } =
    useMutation({
      mutationFn: async (payload: { url: string; events: string[] }) =>
        ensureOk(await registerWebhook(payload)),
      onSuccess: (resp) => {
        setWebhookSecretText((resp as any)?.data?.secret || null)
        void refetchWebhooks()
        webhookForm.resetFields()
        notification.success({
          message: t("settings:evaluations.webhookCreateSuccessTitle", {
            defaultValue: "Webhook registered"
          })
        })
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.webhookCreateErrorTitle", {
            defaultValue: "Failed to register webhook"
          }),
          description: error?.message
        })
      }
    })

  const { mutateAsync: mutateDeleteWebhook, isPending: deletingWebhook } =
    useMutation({
      mutationFn: async (webhookId: string) =>
        ensureOk(await deleteWebhook(webhookId)),
      onSuccess: () => {
        void refetchWebhooks()
        notification.success({
          message: t("common:deleted", { defaultValue: "Deleted" })
        })
      },
      onError: (error: any) => {
        notification.error({
          message: t("settings:evaluations.webhookDeleteErrorTitle", {
            defaultValue: "Failed to delete webhook"
          }),
          description: error?.message
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
  const evalDetail: EvaluationDetail | undefined = evalDetailResp?.data
  const webhooks = webhooksResp?.data?.data || []

  const handleSubmitCreateDataset = async () => {
    try {
      const values = await createDatasetForm.validateFields()
      let samples = [
        {
          input: values.sampleInput,
          expected: values.sampleExpected || undefined
        }
      ]
      if (values.samplesJson) {
        try {
          const parsed = JSON.parse(values.samplesJson)
          if (Array.isArray(parsed)) {
            samples = parsed
          }
        } catch (e: any) {
          notification.error({
            message: t("settings:evaluations.datasetParseErrorTitle", {
              defaultValue: "Invalid samples JSON"
            }),
            description: e?.message
          })
          return
        }
      }
      let metadata: Record<string, any> | undefined
      if (values.metadataJson) {
        try {
          metadata = JSON.parse(values.metadataJson)
        } catch (e: any) {
          notification.error({
            message: t("settings:evaluations.datasetParseErrorTitle", {
              defaultValue: "Invalid samples JSON"
            }),
            description: e?.message
          })
          return
        }
      }
      await mutateCreateDataset({
        name: values.name,
        description: values.description,
        samples,
        metadata
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

      let inlineDataset: any[] | undefined
      if (inlineDatasetEnabled && inlineDatasetText.trim().length > 0) {
        try {
          const parsed = JSON.parse(inlineDatasetText)
          if (Array.isArray(parsed)) {
            inlineDataset = parsed
          } else {
            throw new Error("Inline dataset must be an array.")
          }
        } catch (e: any) {
          notification.error({
            message: t("settings:evaluations.inlineDatasetErrorTitle", {
              defaultValue: "Invalid inline dataset"
            }),
            description: e?.message
          })
          return
        }
      }

      let metadata: Record<string, any> | undefined
      if (values.evalMetadataJson) {
        try {
          metadata = JSON.parse(values.evalMetadataJson)
        } catch (e: any) {
          notification.error({
            message: t("settings:evaluations.evalSpecParseError", {
              defaultValue: "Evaluation spec must be valid JSON."
            }),
            description: e?.message
          })
          return
        }
      }

      const payload = {
        name: sanitizedName,
        description: values.description,
        eval_type: values.evalType,
        eval_spec: spec,
        dataset_id: inlineDataset ? undefined : values.datasetId || undefined,
        dataset: inlineDataset,
        metadata
      }

      const requestIdKey = values.idempotencyKey || evalIdempotencyKey

      if (editingEvalId) {
        await mutateUpdateEvaluation({
          evalId: editingEvalId,
          payload
        })
      } else {
        await mutateCreateEvaluation({
          payload,
          idempotencyKey: requestIdKey
        })
        setEvalIdempotencyKey(
          (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
        )
      }

      setCreateEvalOpen(false)
      setEditingEvalId(null)
      createEvalForm.resetFields()
      setInlineDatasetEnabled(false)
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
    const values = await runForm.validateFields().catch(() => null)
    if (!values) return
    let config: Record<string, any> | undefined
    if (values.configJson) {
      try {
        config = JSON.parse(values.configJson)
      } catch (e: any) {
        notification.error({
          message: t("settings:evaluations.runConfigParseError", {
            defaultValue: "Invalid config JSON"
          }),
          description: e?.message
        })
        return
      }
    }
    let datasetOverride: { samples: any[] } | undefined
    if (values.datasetOverrideJson) {
      try {
        const parsed = JSON.parse(values.datasetOverrideJson)
        if (Array.isArray(parsed)) {
          datasetOverride = { samples: parsed }
        } else if (parsed?.samples && Array.isArray(parsed.samples)) {
          datasetOverride = { samples: parsed.samples }
        } else {
          throw new Error("Dataset override must be an array of samples.")
        }
      } catch (e: any) {
        notification.error({
          message: t("settings:evaluations.datasetParseErrorTitle", {
            defaultValue: "Invalid samples JSON"
          }),
          description: e?.message
        })
        return
      }
    }
    await mutateCreateRun({
      evalId: selectedEvalId,
      payload: {
        target_model: values.targetModel || "gpt-3.5-turbo",
        config,
        dataset_override: datasetOverride,
        webhook_url: values.webhookUrl || undefined
      },
      idempotencyKey: values.idempotencyKey || runIdempotencyKey
    })
    setRunIdempotencyKey(
      (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
    )
  }

  const handleOpenCreateEval = () => {
    const nextKey =
      (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
    setEvalSpecError(null)
    setEvalSpecText(
      JSON.stringify(getDefaultEvalSpecForType("response_quality"), null, 2)
    )
    setInlineDatasetEnabled(false)
    createEvalForm.setFieldsValue({
      evalType: "response_quality",
      runModel: "gpt-3.5-turbo",
      name: "",
      description: "",
      datasetId: undefined,
      idempotencyKey: nextKey,
      evalMetadataJson: undefined
    })
    setEvalIdempotencyKey(nextKey)
    setEditingEvalId(null)
    setCreateEvalOpen(true)
  }

  const handleOpenEditEval = () => {
    if (!selectedEvalId) return
    const detail = evalDetail as any
    const selectedSummary = evaluations.find((e) => e.id === selectedEvalId)
    const type =
      detail?.eval_type || selectedSummary?.eval_type || "response_quality"
    setEvalSpecError(null)
    setEvalSpecText(
      JSON.stringify(
        detail?.eval_spec || getDefaultEvalSpecForType(type),
        null,
        2
      )
    )
    createEvalForm.setFieldsValue({
      evalType: type,
      name: detail?.name || selectedSummary?.name || selectedEvalId,
      description: detail?.description || selectedSummary?.description,
      datasetId: detail?.dataset_id || selectedSummary?.dataset_id,
      evalMetadataJson: detail?.metadata
        ? JSON.stringify(detail.metadata, null, 2)
        : undefined
    })
    setInlineDatasetEnabled(false)
    setEditingEvalId(selectedEvalId)
    setCreateEvalOpen(true)
  }

  const handleDeleteSelectedEval = () => {
    if (!selectedEvalId) return
    Modal.confirm({
      title: t("settings:evaluations.deleteConfirmTitle", {
        defaultValue: "Delete this evaluation?"
      }),
      content: t("settings:evaluations.deleteConfirmDescription", {
        defaultValue:
          "This will remove the evaluation definition. Runs already created remain in history."
      }),
      okButtonProps: { danger: true, loading: deletingEval },
      onOk: () => mutateDeleteEvaluation(selectedEvalId)
    })
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
                <Button onClick={handleOpenCreateEval} type="primary">
                  {t("settings:evaluations.newEvaluationCta", {
                    defaultValue: "New evaluation"
                  })}
                </Button>
                <Button
                  disabled={!selectedEvalId}
                  onClick={handleOpenEditEval}>
                  {t("common:edit", { defaultValue: "Edit" })}
                </Button>
                <Button
                  danger
                  disabled={!selectedEvalId}
                  loading={deletingEval}
                  onClick={handleDeleteSelectedEval}>
                  {t("common:delete", { defaultValue: "Delete" })}
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
          <Card
            title={t("settings:evaluations.detailTitle", {
              defaultValue: "Evaluation details"
            })}
            extra={
              selectedEvalId && (
                <Space>
                  <Button size="small" onClick={handleOpenEditEval}>
                    {t("common:edit", { defaultValue: "Edit" })}
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      void queryClient.invalidateQueries({
                        queryKey: ["evaluations", "detail", selectedEvalId]
                      })
                    }>
                    {t("common:refresh", { defaultValue: "Refresh" })}
                  </Button>
                </Space>
              )
            }>
            {!selectedEvalId ? (
              <Text type="secondary" className="text-xs">
                {t("settings:evaluations.noEvalSelectedDetails", {
                  defaultValue: "Select an evaluation to inspect its spec."
                })}
              </Text>
            ) : evalDetailLoading ? (
              <div className="flex justify-center py-4">
                <Spin />
              </div>
            ) : evalDetailError || evalDetailResp?.ok === false ? (
              <Alert
                type="warning"
                message={t("settings:evaluations.detailErrorTitle", {
                  defaultValue: "Unable to load evaluation details"
                })}
              />
            ) : evalDetail ? (
              <div className="space-y-2 text-xs">
                <div className="flex flex-wrap gap-3">
                  <Tag>
                    {t("common:id", { defaultValue: "ID" })}:{" "}
                    <code>{evalDetail.id}</code>
                  </Tag>
                  {evalDetail.eval_type && (
                    <Tag color="blue">{evalDetail.eval_type}</Tag>
                  )}
                  {evalDetail.dataset_id && (
                    <Tag color="purple">
                      {t("settings:evaluations.datasetLabel", {
                        defaultValue: "Dataset"
                      })}
                      : {evalDetail.dataset_id}
                    </Tag>
                  )}
                </div>
                {evalDetail.description && (
                  <div>
                    <Text type="secondary">
                      {t("settings:evaluations.descriptionLabel", {
                        defaultValue: "Description"
                      })}
                      {": "}
                    </Text>
                    <Text>{evalDetail.description}</Text>
                  </div>
                )}
                {evalDetail.metadata && (
                  <div>
                    <Text type="secondary">
                      {t("common:metadata", { defaultValue: "Metadata" })}
                    </Text>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100 dark:bg-black">
                      {JSON.stringify(evalDetail.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.evalSpecLabel", {
                      defaultValue: "Evaluation spec (snippet)"
                    })}
                  </Text>
                  <pre className="mt-1 max-h-48 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100 dark:bg-black">
                    {JSON.stringify(evalDetail.eval_spec || {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : null}
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
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.perMinuteLabel", {
                      defaultValue: "Per-minute limit"
                    })}
                    {": "}
                  </Text>
                  <Text>{rateLimits.limits.evaluations_per_minute}</Text>
                </div>
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.resetAtLabel", {
                      defaultValue: "Resets at"
                    })}
                    {": "}
                  </Text>
                  <Text>{rateLimits.reset_at}</Text>
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
            ) : (
              <>
                <Alert
                  type="info"
                  showIcon
                  className="mb-2 text-xs"
                  message={t("settings:evaluations.runPollingHint", {
                    defaultValue:
                      "Runs execute asynchronously. The UI polls every ~3s until status leaves running/pending. Provide a webhook URL if your backend can receive events instead."
                  })}
                  description={t("settings:evaluations.runBackoffHint", {
                    defaultValue:
                      "Attach an Idempotency-Key to avoid duplicates. Honor Retry-After on 429 responses; the UI shows rate limits separately."
                  })}
                />
                <Form form={runForm} layout="vertical" size="small">
                  <Form.Item
                    label={t("settings:evaluations.runModelLabelShort", {
                      defaultValue: "Target model"
                    })}
                    name="targetModel"
                    initialValue="gpt-3.5-turbo">
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:evaluations.runConfigLabel", {
                      defaultValue: "Config (JSON)"
                    })}
                    name="configJson"
                    initialValue={runConfigText}>
                    <Input.TextArea
                      rows={3}
                      onChange={(e) => setRunConfigText(e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:evaluations.datasetOverrideLabel", {
                      defaultValue: "Dataset override (JSON array of samples)"
                    })}
                    name="datasetOverrideJson"
                    initialValue={datasetOverrideText}>
                    <Input.TextArea
                      rows={3}
                      placeholder='[{"input": {"question": "Q1", "contexts": ["ctx"], "response": "A"}, "expected": {"answer": "A"}}]'
                      onChange={(e) =>
                        setDatasetOverrideText(e.target.value || "")
                      }
                    />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:evaluations.webhookUrlLabel", {
                      defaultValue: "Webhook URL (optional)"
                    })}
                    name="webhookUrl">
                    <Input placeholder="https://example.com/hook" />
                  </Form.Item>
                  <Form.Item
                    label={t("settings:evaluations.idempotencyKeyLabel", {
                      defaultValue: "Idempotency key"
                    })}
                    name="idempotencyKey"
                    initialValue={runIdempotencyKey}>
                    <Input
                      addonAfter={
                        <Button
                          size="small"
                          onClick={() => {
                            const next =
                              (crypto as any)?.randomUUID?.() ||
                              Math.random().toString(36).slice(2)
                            setRunIdempotencyKey(next)
                            runForm.setFieldsValue({ idempotencyKey: next })
                          }}>
                          {t("common:regenerate", {
                            defaultValue: "Regenerate"
                          })}
                        </Button>
                      }
                      placeholder={t("settings:evaluations.idempotencyKeyPlaceholder", {
                        defaultValue: "Use to avoid duplicate runs when retrying"
                      }) as string}
                    />
                  </Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      loading={creatingRun}
                      onClick={() => void handleStartRunForSelection()}>
                      {t("settings:evaluations.startRunCta", {
                        defaultValue: "Start run"
                      })}
                    </Button>
                    {selectedRunId &&
                      ["running", "pending"].includes(
                        String(runDetail?.status || "").toLowerCase()
                      ) && (
                        <Button
                          danger
                          loading={cancelingRun}
                          onClick={() =>
                            selectedRunId
                              ? void mutateCancelRun(selectedRunId)
                              : undefined
                          }>
                          {t("settings:evaluations.cancelRunCta", {
                            defaultValue: "Cancel run"
                          })}
                        </Button>
                      )}
                  </Space>
                </Form>
                <Divider className="my-3" />
                {runsLoading ? (
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
              </>
            )}
          </Card>

          <Card
            title={t("settings:evaluations.runDetailTitle", {
              defaultValue: "Run details"
            })}
            extra={
              selectedRunId && (
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      void queryClient.invalidateQueries({
                        queryKey: ["evaluations", "run", selectedRunId]
                      })
                    }>
                    {t("common:refresh", { defaultValue: "Refresh" })}
                  </Button>
                  {["running", "pending"].includes(
                    String(runDetail?.status || "").toLowerCase()
                  ) && (
                    <Button
                      size="small"
                      danger
                      loading={cancelingRun}
                      onClick={() =>
                        selectedRunId
                          ? void mutateCancelRun(selectedRunId)
                          : undefined
                      }>
                      {t("settings:evaluations.cancelRunCta", {
                        defaultValue: "Cancel run"
                      })}
                    </Button>
                  )}
                </Space>
              )
            }>
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
                <div>
                  <Text type="secondary">
                    {t("settings:evaluations.runEvalIdLabel", {
                      defaultValue: "Evaluation"
                    })}
                    {": "}
                  </Text>
                  <Text>{runDetail.eval_id}</Text>
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
                {runDetail.progress && (
                  <div className="mt-2">
                    <Text type="secondary">
                      {t("settings:evaluations.runProgressLabel", {
                        defaultValue: "Progress"
                      })}
                    </Text>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100 dark:bg-black">
                      {JSON.stringify(runDetail.progress, null, 2)}
                    </pre>
                  </div>
                )}
                {runDetail.usage && (
                  <div className="mt-2">
                    <Text type="secondary">
                      {t("settings:evaluations.runUsageLabel", {
                        defaultValue: "Usage"
                      })}
                    </Text>
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100 dark:bg-black">
                      {JSON.stringify(runDetail.usage, null, 2)}
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
                    <Space>
                      <Button
                        size="small"
                        loading={loadingDatasetDetail}
                        onClick={() => void mutateLoadDataset(ds.id)}>
                        {t("common:view", { defaultValue: "View" })}
                      </Button>
                      <Button
                        size="small"
                        danger
                        loading={deletingDataset}
                        onClick={() => void mutateDeleteDataset(ds.id)}>
                        {t("common:delete", { defaultValue: "Delete" })}
                      </Button>
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t("settings:evaluations.historyTitle", {
              defaultValue: "History"
            })}>
            <Form form={historyForm} layout="vertical" size="small">
              <Form.Item
                label={t("settings:evaluations.historyTypeLabel", {
                  defaultValue: "Type"
                })}
                name="type">
                <Input placeholder="evaluation.completed" />
              </Form.Item>
              <Form.Item
                label={t("settings:evaluations.historyUserLabel", {
                  defaultValue: "User ID"
                })}
                name="user_id">
                <Input placeholder="user_123" />
              </Form.Item>
              <Form.Item
                label={t("settings:evaluations.historyStartLabel", {
                  defaultValue: "Start date (ISO)"
                })}
                name="start_date">
                <Input placeholder="2024-01-01T00:00:00Z" />
              </Form.Item>
              <Form.Item
                label={t("settings:evaluations.historyEndLabel", {
                  defaultValue: "End date (ISO)"
                })}
                name="end_date">
                <Input placeholder="2024-12-31T23:59:59Z" />
              </Form.Item>
              <Button
                type="primary"
                loading={historyPending}
                onClick={() => void mutateHistory(historyForm.getFieldsValue())}>
                {t("settings:evaluations.historyFetchCta", {
                  defaultValue: "Fetch history"
                })}
              </Button>
            </Form>
            <Divider />
            {historyPending ? (
              <div className="flex justify-center py-2">
                <Spin size="small" />
              </div>
            ) : historyResults.length === 0 ? (
              <Text type="secondary" className="text-xs">
                {t("settings:evaluations.historyEmpty", {
                  defaultValue: "Run a query to see recent activity."
                })}
              </Text>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {historyResults.map((item) => (
                  <div
                    key={item.id}
                    className="rounded border border-gray-200 p-2 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.type}</span>
                      <Text type="secondary">
                        {item.created_at || ""}
                      </Text>
                    </div>
                    <div className="flex gap-2">
                      {item.eval_id && (
                        <Tag>eval: {item.eval_id}</Tag>
                      )}
                      {item.run_id && (
                        <Tag>run: {item.run_id}</Tag>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t("settings:evaluations.webhooksTitle", {
              defaultValue: "Webhooks"
            })}
            extra={
              webhooksLoading ? (
                <Spin size="small" />
              ) : webhooksError || webhooksResp?.ok === false ? (
                <Tag color="red">Error</Tag>
              ) : (
                <Tag>{webhooks.length}</Tag>
              )
            }>
            <Form form={webhookForm} layout="vertical" size="small">
              <Form.Item
                label={t("settings:evaluations.webhookUrlLabel", {
                  defaultValue: "URL"
                })}
                name="url"
                rules={[{ required: true }]}>
                <Input placeholder="https://example.com/hook" />
              </Form.Item>
              <Form.Item
                label={t("settings:evaluations.webhookEventsLabel", {
                  defaultValue: "Events"
                })}
                name="events"
                initialValue={[
                  "evaluation.started",
                  "evaluation.completed",
                  "evaluation.failed"
                ]}
                rules={[{ required: true }]}>
                <Select
                  mode="multiple"
                  options={[
                    { value: "evaluation.started", label: "evaluation.started" },
                    {
                      value: "evaluation.completed",
                      label: "evaluation.completed"
                    },
                    { value: "evaluation.failed", label: "evaluation.failed" },
                    {
                      value: "evaluation.cancelled",
                      label: "evaluation.cancelled"
                    },
                    {
                      value: "evaluation.progress",
                      label: "evaluation.progress"
                    }
                  ]}
                />
              </Form.Item>
              <Button
                type="primary"
                loading={registeringWebhook}
                onClick={() =>
                  void webhookForm
                    .validateFields()
                    .then((vals) => mutateRegisterWebhook(vals))
                }>
                {t("settings:evaluations.webhookCreateCta", {
                  defaultValue: "Register webhook"
                })}
              </Button>
              {webhookSecretText && (
                <Alert
                  className="mt-2"
                  type="info"
                  message={t("settings:evaluations.webhookSecretTitle", {
                    defaultValue: "Secret"
                  })}
                  description={webhookSecretText}
                />
              )}
            </Form>
            <Divider />
            {webhooksLoading ? (
              <div className="flex justify-center py-3">
                <Spin size="small" />
              </div>
            ) : webhooksError || webhooksResp?.ok === false ? (
              <Alert
                type="warning"
                message={t("settings:evaluations.webhookListErrorTitle", {
                  defaultValue: "Unable to load webhooks"
                })}
              />
            ) : webhooks.length === 0 ? (
              <Text type="secondary" className="text-xs">
                {t("settings:evaluations.webhooksEmpty", {
                  defaultValue: "No webhooks registered yet."
                })}
              </Text>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                {webhooks.map((hook: any) => (
                  <div
                    key={hook.id}
                    className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-gray-700">
                    <div className="flex flex-col">
                      <span className="font-medium">{hook.url}</span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        {(hook.events || []).join(", ")}
                      </span>
                    </div>
                    <Button
                      size="small"
                      danger
                      loading={deletingWebhook}
                      onClick={() => void mutateDeleteWebhook(hook.id)}>
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
        title={
          editingEvalId
            ? t("settings:evaluations.editEvalModalTitle", {
                defaultValue: "Edit evaluation"
              })
            : t("settings:evaluations.createEvalModalTitle", {
                defaultValue: "New evaluation"
              })
        }
        open={createEvalOpen}
        onCancel={() => {
          setCreateEvalOpen(false)
          setEditingEvalId(null)
        }}
        onOk={() => void handleSubmitCreateEvaluation()}
        confirmLoading={creatingEval || updatingEval}
        okText={
          editingEvalId
            ? (t("common:save", { defaultValue: "Save" }) as string)
            : (t("common:create", { defaultValue: "Create" }) as string)
        }>
        <Form form={createEvalForm} layout="vertical">
          <Alert
            type="info"
            showIcon
            className="mb-3 text-xs"
            message={t("settings:evaluations.evalTypesHint", {
              defaultValue:
                "Supported: model_graded (summarization, rag, response_quality, rag_pipeline), response_quality, rag, rag_pipeline, geval, exact_match, includes, fuzzy_match, proposition_extraction, qa3, label_choice, nli_factcheck, ocr. Specialized helpers: /api/v1/evaluations/{geval|rag|response-quality|propositions|ocr|ocr-pdf|batch|embeddings|embeddings-ab}."
            })}
            description={t("settings:evaluations.evalSpecHint", {
              defaultValue:
                "Provide an eval_spec that matches the eval_type payload shape (see docs). Use an Idempotency-Key to avoid duplicate creations if the browser retries."
            })}
          />
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
                { value: "model_graded", label: "model_graded" },
                { value: "response_quality", label: "response_quality" },
                { value: "rag", label: "rag" },
                { value: "rag_pipeline", label: "rag_pipeline" },
                { value: "geval", label: "geval" },
                { value: "exact_match", label: "exact_match" },
                { value: "includes", label: "includes" },
                { value: "fuzzy_match", label: "fuzzy_match" },
                { value: "proposition_extraction", label: "proposition_extraction" },
                { value: "qa3", label: "qa3" },
                { value: "label_choice", label: "label_choice" },
                { value: "nli_factcheck", label: "nli_factcheck" },
                { value: "ocr", label: "ocr" }
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
          <Form.Item>
            <Checkbox
              checked={inlineDatasetEnabled}
              onChange={(e) => setInlineDatasetEnabled(e.target.checked)}>
              {t("settings:evaluations.inlineDatasetCheckbox", {
                defaultValue:
                  "Attach inline dataset instead of referencing dataset_id"
              })}
            </Checkbox>
            {inlineDatasetEnabled && (
              <Input.TextArea
                rows={3}
                className="mt-2"
                value={inlineDatasetText}
                onChange={(e) => setInlineDatasetText(e.target.value)}
                placeholder='[{"input": {"question": "Q1", "contexts": ["ctx"], "response": "A"}, "expected": {"answer": "A"}}]'
              />
            )}
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
            label={t("settings:evaluations.evalMetadataLabel", {
              defaultValue: "Metadata (JSON, optional)"
            })}
            name="evalMetadataJson">
            <Input.TextArea rows={3} />
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
          {!editingEvalId && (
            <Form.Item
              label={t("settings:evaluations.idempotencyKeyLabel", {
                defaultValue: "Idempotency key"
              })}
              name="idempotencyKey"
              initialValue={evalIdempotencyKey}>
              <Input
                addonAfter={
                  <Button
                    size="small"
                    onClick={() => {
                      const next =
                        (crypto as any)?.randomUUID?.() ||
                        Math.random().toString(36).slice(2)
                      setEvalIdempotencyKey(next)
                      createEvalForm.setFieldsValue({
                        idempotencyKey: next
                      })
                    }}>
                    {t("common:regenerate", { defaultValue: "Regenerate" })}
                  </Button>
                }
                placeholder={t("settings:evaluations.idempotencyKeyPlaceholder", {
                  defaultValue: "Prevents duplicate create on retry"
                }) as string}
              />
            </Form.Item>
          )}
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
          <Form.Item
            label={t("settings:evaluations.samplesJsonLabel", {
              defaultValue: "Samples JSON (optional, overrides fields)"
            })}
            name="samplesJson">
            <Input.TextArea rows={4} placeholder='[{"input": {...}, "expected": {...}}]' />
          </Form.Item>
          <Form.Item
            label={t("settings:evaluations.datasetMetadataLabel", {
              defaultValue: "Metadata (JSON, optional)"
            })}
            name="metadataJson">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("settings:evaluations.datasetDetailTitle", {
          defaultValue: "Dataset details"
        })}
        open={!!viewingDataset}
        onCancel={() => setViewingDataset(null)}
        footer={
          <Button onClick={() => setViewingDataset(null)}>
            {t("common:close", { defaultValue: "Close" })}
          </Button>
        }>
        {viewingDataset ? (
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <Tag>
                {t("common:id", { defaultValue: "ID" })}:{" "}
                {(viewingDataset as any).id}
              </Tag>
              <Tag>
                {t("settings:evaluations.datasetSampleCount", {
                  defaultValue: "{{count}} samples",
                  count: viewingDataset.sample_count
                })}
              </Tag>
            </div>
            <div>
              <Text type="secondary">
                {t("common:name", { defaultValue: "Name" })}
                {": "}
              </Text>
              <Text>{viewingDataset.name}</Text>
            </div>
            {viewingDataset.description && (
              <div>
                <Text type="secondary">
                  {t("settings:evaluations.datasetDescriptionLabel", {
                    defaultValue: "Description"
                  })}
                  {": "}
                </Text>
                <Text>{viewingDataset.description}</Text>
              </div>
            )}
            {viewingDataset.metadata && (
              <div>
                <Text type="secondary">
                  {t("common:metadata", { defaultValue: "Metadata" })}
                </Text>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-gray-100 dark:bg-black">
                  {JSON.stringify(viewingDataset.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
