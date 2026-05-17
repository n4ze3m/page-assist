import { SaveButton } from "@/components/Common/SaveButton"
import { getModelSettings, setModelSettings } from "@/services/model-settings"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Skeleton,
  Switch,
  Tabs
} from "antd"
import { Loader2 } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"
import { CustomBodyEditor } from "./CustomBodyEditor"

type Props = {
  model_id: string
  open: boolean
  setOpen: (open: boolean) => void
}

export const AddUpdateOAIModelSettings: React.FC<Props> = ({
  model_id,
  open,
  setOpen
}) => {
  const [form] = Form.useForm()
  const { t } = useTranslation("common")
  const queryClient = useQueryClient()

  const { status, isError } = useQuery({
    queryKey: ["fetchModelSettings", model_id],
    queryFn: async () => {
      const data = await getModelSettings(model_id)
      form.setFieldsValue(data)
      return data
    },
    staleTime: 0
  })

  const { mutate, isPending } = useMutation({
    mutationFn: setModelSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fetchModel"]
      })
      await queryClient.invalidateQueries({
        queryKey: ["fetchAllModels"]
      })
      await queryClient.invalidateQueries({
        queryKey: ["fetchCustomModels"]
      })
      form.resetFields()
      setOpen(false)
    }
  })

  return (
    <Modal
      title={t("modelSettings.label")}
      open={open}
      onCancel={() => {
        form.resetFields()
        setOpen(false)
      }}
      centered
      width={520}
      style={{ maxWidth: "calc(100vw - 2rem)" }}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      footer={null}>
      {status === "pending" && <Skeleton active />}
      {status === "success" && (
        <Form
          onFinish={(values: any) => {
            mutate({
              model_id,
              settings: values
            })
          }}
          form={form}
          layout="vertical">
          <Tabs
            defaultActiveKey="parameters"
            items={[
              {
                key: "parameters",
                label: t("modelSettings.form.tabs.parameters", {
                  defaultValue: "Parameters"
                }),
                children: (
                  <>
                    <Form.Item
                      name="temperature"
                      label={t("modelSettings.form.temperature.label")}>
                      <InputNumber
                        size="large"
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.temperature.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="numPredict"
                      label={t("modelSettings.form.numPredict.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.numPredict.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="topP"
                      label={t("modelSettings.form.topP.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        size="large"
                        placeholder={t("modelSettings.form.topP.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      name="reasoningEffort"
                      label={t("modelSettings.form.reasoningEffort.label")}>
                      <Input
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.reasoningEffort.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="topK"
                      label={t("modelSettings.form.topK.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t("modelSettings.form.topK.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      name="minP"
                      label={t("modelSettings.form.minP.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t("modelSettings.form.minP.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      name="numCtx"
                      label={`${t("modelSettings.form.numCtx.label")} (Ollama)`}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t("modelSettings.form.numCtx.placeholder")}
                      />
                    </Form.Item>
                  </>
                )
              },
              {
                key: "customBody",
                label: t("modelSettings.form.tabs.customBody", {
                  defaultValue: "Custom Body"
                }),
                forceRender: true,
                children: (
                  <Form.Item
                    name="customBody"
                    label={t("modelSettings.form.customBody.label", {
                      defaultValue: "Custom Body Parameters (JSON)"
                    })}
                    help={t("modelSettings.form.customBody.help", {
                      defaultValue:
                        'Merged into the request body for OpenAI-compatible models, e.g. {"thinking":{"type":"enabled"}} for DeepSeek.'
                    })}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value || !value.trim())
                            return Promise.resolve()
                          try {
                            const parsed = JSON.parse(value)
                            if (
                              !parsed ||
                              typeof parsed !== "object" ||
                              Array.isArray(parsed)
                            ) {
                              return Promise.reject(
                                new Error(
                                  t("modelSettings.form.customBody.invalid", {
                                    defaultValue:
                                      'Must be a JSON object, e.g. {"key":"value"}'
                                  })
                                )
                              )
                            }
                            return Promise.resolve()
                          } catch {
                            return Promise.reject(
                              new Error(
                                t("modelSettings.form.customBody.invalid", {
                                  defaultValue:
                                    'Must be a JSON object, e.g. {"key":"value"}'
                                })
                              )
                            )
                          }
                        }
                      }
                    ]}>
                    <CustomBodyEditor key={model_id} />
                  </Form.Item>
                )
              }
            ]}
          />

          <button
            type="submit"
            className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("save")
            )}
          </button>
        </Form>
      )}
    </Modal>
  )
}
