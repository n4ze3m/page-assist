import { createModel } from "@/db/models"
import { getAllOpenAIConfig } from "@/db/openai"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Input, Modal, Form, Select, Radio } from "antd"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const AddCustomModelModal: React.FC<Props> = ({ open, setOpen }) => {
  const { t } = useTranslation(["openai"])
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ["fetchProviders"],
    queryFn: async () => {
      const providers = await getAllOpenAIConfig()
      return providers.filter((provider) => provider.provider !== "lmstudio")
    }
  })

  const onFinish = async (values: {
    model_id: string
    model_type: "chat" | "embedding"
    provider_id: string
  }) => {
    await createModel(
      values.model_id,
      values.model_id,
      values.provider_id,
      values.model_type
    )

    return true
  }

  const { mutate: createModelMutation, isPending: isSaving } = useMutation({
    mutationFn: onFinish,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchCustomModels"]
      })
      queryClient.invalidateQueries({
        queryKey: ["fetchModel"]
      })
      setOpen(false)
      form.resetFields()
    }
  })

  return (
    <Modal
      footer={null}
      open={open}
      title={t("manageModels.modal.title")}
      onCancel={() => setOpen(false)}>
      <Form form={form} onFinish={createModelMutation} layout="vertical">
        <Form.Item
          name="model_id"
          label={t("manageModels.modal.form.name.label")}
          rules={[
            {
              required: true,
              message: t("manageModels.modal.form.name.required")
            }
          ]}>
          <Input
            placeholder={t("manageModels.modal.form.name.placeholder")}
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="provider_id"
          label={t("manageModels.modal.form.provider.label")}
          rules={[
            {
              required: true,
              message: t("manageModels.modal.form.provider.required")
            }
          ]}>
          <Select
            placeholder={t("manageModels.modal.form.provider.placeholder")}
            size="large"
            loading={isPending}>
            {data?.map((provider: any) => (
              <Select.Option key={provider.id} value={provider.id}>
                {provider.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="model_type"
          label={t("manageModels.modal.form.type.label")}
          initialValue="chat"
          rules={[
            {
              required: true,
              message: t("manageModels.modal.form.type.required")
            }
          ]}>
          <Radio.Group>
            <Radio value="chat">{t("radio.chat")}</Radio>
            <Radio value="embedding">{t("radio.embedding")}</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
            {!isSaving ? (
              t("common:save")
            ) : (
              <Loader2 className="w-5 h-5  animate-spin" />
            )}
          </button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
