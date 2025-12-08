import { SaveButton } from "@/components/Common/SaveButton"
import { saveModelNickname } from "@/db/dexie/nickname"
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
  const { t } = useTranslation(["option"])
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
      title={t("option:nicknameModal.title", "Set a nickname for this model")}
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
          label={t(
            "option:nicknameModal.form.modelName.label",
            "Display name"
          )}
          rules={[
            {
              required: true,
              message: t(
                "option:nicknameModal.form.modelName.required",
                "Enter a display name for this model."
              )
            }
          ]}>
          <Input placeholder="DeepSeek R1" />
        </Form.Item>
        <Form.Item
          name="model_avatar"
          label={t(
            "option:nicknameModal.form.modelAvatar.label",
            "Avatar image URL"
          )}
          help={t(
            "option:nicknameModal.form.modelAvatar.help",
            "Optional: paste a URL for an image to show next to this model."
          )}>
          <Input placeholder={"https://example.com/model.png"} />
        </Form.Item>
        <SaveButton btnType="submit" className="w-full flex justify-center" />
      </Form>
    </Modal>
  )
}
