import { SaveButton } from "@/components/Common/SaveButton"
import { saveModelNickname } from "@/db/nickname"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Form, Input, Modal } from "antd"
import React from "react"
import { useTranslation } from "react-i18next"

type Props = {
  model_id: string
  open: boolean
  setOpen: (open: boolean) => void
  model_name?: string
  model_avatar?: string
}

export const ModelNickModelNicknameModal: React.FC<Props> = ({
  model_id,
  open,
  setOpen,
  model_avatar,
  model_name
}) => {
  const [form] = Form.useForm()
  const { t } = useTranslation("openai")
  const queryClient = useQueryClient()

  React.useEffect(() => {
    form.setFieldsValue({
      model_name,
      model_avatar
    })
  }, [model_id, model_avatar, model_name])

  const { mutate } = useMutation({
    mutationFn: saveModelNickname,
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
      title={t("nicknameModal.title")}
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          model_name,
          model_avatar
        }}
        onFinish={async (e) => {
          await mutate({
            model_id,
            ...e
          })
        }}>
        <Form.Item
          name="model_name"
          label={t("nicknameModal.form.modelName.label")}
          rules={[
            {
              required: true,
              message: t("nicknameModal.form.modelName.required")
            }
          ]}>
          <Input placeholder="DeepSeek R1" />
        </Form.Item>
        <Form.Item
          name="model_avatar"
          label={t("nicknameModal.form.modelAvatar.label")}
          help={t("nicknameModal.form.modelAvatar.help")}>
          <Input placeholder={"https://example.com/model.png"} />
        </Form.Item>
        <SaveButton btnType="submit" className="w-full flex justify-center" />
      </Form>
    </Modal>
  )
}
