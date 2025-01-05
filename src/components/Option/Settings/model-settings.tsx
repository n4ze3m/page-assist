import { BetaTag } from "@/components/Common/Beta"
import { SaveButton } from "@/components/Common/SaveButton"
import { getAllModelSettings, setModelSetting } from "@/services/model-settings"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Form, Skeleton, Input, InputNumber, Collapse, Switch } from "antd"
import React from "react"
import { useTranslation } from "react-i18next"

export const ModelSettings = () => {
  const { t } = useTranslation("common")
  const [form] = Form.useForm()
  const client = useQueryClient()
  const { isPending: isLoading } = useQuery({
    queryKey: ["fetchModelConfig"],
    queryFn: async () => {
      const data = await getAllModelSettings()
      form.setFieldsValue(data)
      return data
    }
  })

  return (
    <div>
      <div>
        <div className="inline-flex items-center gap-2">
          <BetaTag />
          <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
            {t("modelSettings.label")}
          </h2>
        </div>
        <p className="text-sm text-gray-700 dark:text-neutral-400 mt-1">
          {t("modelSettings.description")}
        </p>
        <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
      </div>
      {!isLoading ? (
        <Form
          onFinish={(values: {
            keepAlive: string
            temperature: number
            topK: number
            topP: number
            numGpu: number
          }) => {
            Object.entries(values).forEach(([key, value]) => {
              setModelSetting(key, value)
            })
            client.invalidateQueries({
              queryKey: ["fetchModelConfig"]
            })
          }}
          form={form}
          layout="vertical">
          <Form.Item
            name="keepAlive"
            help={t("modelSettings.form.keepAlive.help")}
            label={t("modelSettings.form.keepAlive.label")}>
            <Input
              size="large"
              placeholder={t("modelSettings.form.keepAlive.placeholder")}
            />
          </Form.Item>
          <Form.Item
            name="temperature"
            label={t("modelSettings.form.temperature.label")}>
            <InputNumber
              size="large"
              style={{ width: "100%" }}
              placeholder={t("modelSettings.form.temperature.placeholder")}
            />
          </Form.Item>

          <Form.Item name="numCtx" label={t("modelSettings.form.numCtx.label")}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={t("modelSettings.form.numCtx.placeholder")}
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="numPredict"
            label={t("modelSettings.form.numPredict.label")}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={t("modelSettings.form.numPredict.placeholder")}
            />
          </Form.Item>
          <Collapse
            ghost
            className="border-none bg-transparent"
            items={[
              {
                key: "1",
                label: t("modelSettings.advanced"),
                children: (
                  <React.Fragment>
                    <Form.Item
                      name="topK"
                      label={t("modelSettings.form.topK.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t("modelSettings.form.topK.placeholder")}
                        size="large"
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
                      name="numGpu"
                      label={t("modelSettings.form.numGpu.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        size="large"
                        placeholder={t("modelSettings.form.numGpu.placeholder")}
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
                      name="repeatPenalty"
                      label={t("modelSettings.form.repeatPenalty.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.repeatPenalty.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="repeatLastN"
                      label={t("modelSettings.form.repeatLastN.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.repeatLastN.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="tfsZ"
                      label={t("modelSettings.form.tfsZ.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t("modelSettings.form.tfsZ.placeholder")}
                      />
                    </Form.Item>
                    <Form.Item
                      name="numKeep"
                      label={t("modelSettings.form.numKeep.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.numKeep.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="numThread"
                      label={t("modelSettings.form.numThread.label")}>
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder={t(
                          "modelSettings.form.numThread.placeholder"
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      name="useMMap"
                      label={t("modelSettings.form.useMMap.label")}>
                      <Switch />
                    </Form.Item>
                    <Form.Item
                      name="useMlock"
                      label={t("modelSettings.form.useMlock.label")}>
                      <Switch />
                    </Form.Item>
                  </React.Fragment>
                )
              }
            ]}
          />

          <div className="flex justify-end">
            <SaveButton btnType="submit" />
          </div>
        </Form>
      ) : (
        <Skeleton active />
      )}
    </div>
  )
}
