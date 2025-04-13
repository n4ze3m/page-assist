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
  Switch
} from "antd"
import { Loader2 } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"

type Props = {
  model_id: string
  open: boolean
  setOpen: (open: boolean) => void
}

export const AddUpdateModelSettings: React.FC<Props> = ({
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
    staleTime: 0,
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

      setOpen(false)
    }
  })

  return (
    <Modal
      title={t("modelSettings.label")}
      open={open}
      onCancel={() => {
        setOpen(false)
      }}
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
