import React from "react"
import { Button, Card, Form, Input, Select, Space, Alert } from "antd"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

import { useServerOnline } from "@/hooks/useServerOnline"
import { getRateLimits } from "@/services/evaluations"
import {
  getEvaluationDefaults,
  setEvaluationDefaults,
  setDefaultSpecForType
} from "@/services/evaluations-settings"

const EVAL_TYPES = [
  "model_graded",
  "response_quality",
  "rag",
  "rag_pipeline",
  "geval",
  "exact_match",
  "includes",
  "fuzzy_match",
  "proposition_extraction",
  "qa3",
  "label_choice",
  "nli_factcheck",
  "ocr"
]

export const EvaluationsSettings = () => {
  const { t } = useTranslation(["settings", "common"])
  const isOnline = useServerOnline()

  const [form] = Form.useForm()
  const [specType, setSpecType] = React.useState<string>("response_quality")
  const [testResult, setTestResult] = React.useState<
    | null
    | { ok: boolean; message: string; details?: string; rate?: string }
  >(null)

  const { data: defaultsResp, isLoading: defaultsLoading } = useQuery({
    queryKey: ["evaluations", "defaults"],
    queryFn: () => getEvaluationDefaults()
  })

  React.useEffect(() => {
    if (!defaultsResp) return
    form.setFieldsValue({
      defaultEvalType: defaultsResp.defaultEvalType,
      defaultTargetModel: defaultsResp.defaultTargetModel,
      defaultRunConfig: defaultsResp.defaultRunConfig,
      defaultDatasetId: defaultsResp.defaultDatasetId || undefined,
      specJson:
        defaultsResp.defaultSpecByType?.[specType] ||
        defaultsResp.defaultSpecByType?.[defaultsResp.defaultEvalType || ""] ||
        ""
    })
    setSpecType(defaultsResp.defaultEvalType || "response_quality")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultsResp])

  const { mutateAsync: saveDefaults, isPending: saving } = useMutation({
    mutationFn: async (values: any) => {
      const updates = {
        defaultEvalType: values.defaultEvalType,
        defaultTargetModel: values.defaultTargetModel,
        defaultRunConfig: values.defaultRunConfig,
        defaultDatasetId: values.defaultDatasetId || null
      }
      await setEvaluationDefaults(updates)
      if (values.specJson) {
        await setDefaultSpecForType(specType, values.specJson)
      }
      return await getEvaluationDefaults()
    },
    onSuccess: (next) => {
      form.setFieldsValue({
        defaultEvalType: next.defaultEvalType,
        defaultTargetModel: next.defaultTargetModel,
        defaultRunConfig: next.defaultRunConfig,
        defaultDatasetId: next.defaultDatasetId || undefined,
        specJson: next.defaultSpecByType?.[specType] || ""
      })
    }
  })

  const { mutateAsync: testEvalApi, isPending: testing } = useMutation({
    mutationFn: async () => getRateLimits(),
    onSuccess: (resp) => {
      if (resp?.ok && resp.data) {
        const d: any = resp.data
        setTestResult({
          ok: true,
          message:
            t("settings:evaluationsSettings.testOk", {
              defaultValue: "Evaluations API reachable"
            }) as string,
          rate: `${d.tier || ""} · ${d.usage?.evaluations_today ?? 0}/${
            d.limits?.evaluations_per_day ?? "?"
          } today`
        })
      } else {
        setTestResult({
          ok: false,
          message:
            resp?.error ||
            (t("settings:evaluationsSettings.testFail", {
              defaultValue: "Unable to reach Evaluations API"
            }) as string)
        })
      }
    },
    onError: (e: any) => {
      setTestResult({
        ok: false,
        message:
          e?.message ||
          (t("settings:evaluationsSettings.testFail", {
            defaultValue: "Unable to reach Evaluations API"
          }) as string)
      })
    }
  })

  const defaults = defaultsResp || {}

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          {t("settings:evaluationsSettings.title", {
            defaultValue: "Evaluations defaults"
          })}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          {t("settings:evaluationsSettings.subtitle", {
            defaultValue:
              "Configure default eval type, target model, and spec snippets used by the Evaluations playground."
          })}
        </p>
      </div>

      {!isOnline && (
        <Alert
          type="warning"
          showIcon
          message={t("settings:evaluationsSettings.offline", {
            defaultValue: "Connect to your tldw server to test Evaluations."
          })}
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            defaultEvalType: defaults.defaultEvalType || "response_quality",
            defaultTargetModel: defaults.defaultTargetModel || "gpt-3.5-turbo",
            defaultRunConfig: defaults.defaultRunConfig,
            defaultDatasetId: defaults.defaultDatasetId || undefined,
            specJson:
              defaults.defaultSpecByType?.[specType] ||
              defaults.defaultSpecByType?.[
                defaults.defaultEvalType || "response_quality"
              ] ||
              ""
          }}>
          <Form.Item
            label={t("settings:evaluationsSettings.defaultType", {
              defaultValue: "Default evaluation type"
            })}
            name="defaultEvalType"
            rules={[{ required: true }]}>
            <Select
              loading={defaultsLoading}
              options={EVAL_TYPES.map((value) => ({ value, label: value }))}
              onChange={(val) => {
                setSpecType(val)
                const spec =
                  defaults.defaultSpecByType?.[val] ||
                  form.getFieldValue("specJson") ||
                  ""
                form.setFieldsValue({ specJson: spec })
              }}
            />
          </Form.Item>

          <Form.Item
            label={t("settings:evaluationsSettings.defaultModel", {
              defaultValue: "Default target model"
            })}
            name="defaultTargetModel"
            rules={[{ required: true }]}>
            <Input placeholder="gpt-3.5-turbo" />
          </Form.Item>

          <Form.Item
            label={t("settings:evaluationsSettings.defaultRunConfig", {
              defaultValue: "Default run config (JSON)"
            })}
            name="defaultRunConfig">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label={t("settings:evaluationsSettings.defaultDataset", {
              defaultValue: "Default dataset id (optional)"
            })}
            name="defaultDatasetId">
            <Input placeholder="dataset_123 (optional)" />
          </Form.Item>

          <Form.Item
            label={t("settings:evaluationsSettings.specForType", {
              defaultValue: "Spec preset for selected type"
            })}
            name="specJson">
            <Input.TextArea
              rows={6}
              placeholder='{"metrics":["coherence"]}'
            />
          </Form.Item>

          <Space size="small">
            <Button
              type="primary"
              loading={saving}
              onClick={() =>
                void form.validateFields().then((vals) => saveDefaults(vals))
              }>
              {t("common:save", { defaultValue: "Save" })}
            </Button>
            <Button
              loading={testing}
              onClick={() => void testEvalApi()}
              disabled={!isOnline}>
              {t("settings:evaluationsSettings.testCta", {
                defaultValue: "Test Evaluations API"
              })}
            </Button>
          </Space>
          {testResult && (
            <Alert
              className="mt-3"
              type={testResult.ok ? "success" : "error"}
              message={testResult.message}
              description={testResult.rate || testResult.details}
              showIcon
            />
          )}
        </Form>
      </Card>
    </div>
  )
}
