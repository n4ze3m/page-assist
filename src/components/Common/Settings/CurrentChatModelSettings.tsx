import { getAllModelSettings } from "@/services/model-settings"
import { useStoreChatModelSettings } from "@/store/model"
import { useQuery } from "@tanstack/react-query"
import { Collapse, Form, Input, InputNumber, Modal, Skeleton } from "antd"
import React from "react"
import { useTranslation } from "react-i18next"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const CurrentChatModelSettings = ({ open, setOpen }: Props) => {
  const { t } = useTranslation("common")
  const [form] = Form.useForm()
  const cUserSettings = useStoreChatModelSettings()
  const { isPending: isLoading } = useQuery({
    queryKey: ["fetchModelConfig2", open],
    queryFn: async () => {
      const data = await getAllModelSettings()
      form.setFieldsValue({
        temperature: cUserSettings.temperature ?? data.temperature,
        topK: cUserSettings.topK ?? data.topK,
        topP: cUserSettings.topP ?? data.topP,
        keepAlive: cUserSettings.keepAlive ?? data.keepAlive,
        numCtx: cUserSettings.numCtx ?? data.numCtx,
        seed: cUserSettings.seed
      })
      return data
    },
    enabled: open,
    refetchOnMount: true
  })
  return (
    <Modal
      title={t("currentChatModelSettings")}
      open={open}
      onOk={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      footer={null}>
      {!isLoading ? (
        <Form
          onFinish={(values: {
            keepAlive: string
            temperature: number
            topK: number
            topP: number
          }) => {
            Object.entries(values).forEach(([key, value]) => {
              cUserSettings.setX(key, value)
              setOpen(false)
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
          <Form.Item
            name="seed"
            help={t("modelSettings.form.seed.help")}
            label={t("modelSettings.form.seed.label")}>
            <InputNumber
              size="large"
              style={{ width: "100%" }}
              placeholder={t("modelSettings.form.seed.placeholder")}
            />
          </Form.Item>
          <Form.Item name="numCtx" label={t("modelSettings.form.numCtx.label")}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={t("modelSettings.form.numCtx.placeholder")}
              size="large"
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
                  </React.Fragment>
                )
              }
            ]}
          />

          <button
            type="submit"
            className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
            {t("save")}
          </button>
        </Form>
      ) : (
        <Skeleton active />
      )}
    </Modal>
  )
}
