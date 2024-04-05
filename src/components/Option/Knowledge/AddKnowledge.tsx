import { Source, createKnowledge } from "@/db/knowledge"
import { defaultEmbeddingModelForRag } from "@/services/ollama"
import { convertToSource } from "@/utils/to-source"
import { useMutation } from "@tanstack/react-query"
import { Modal, Form, Input, Upload, message, UploadFile } from "antd"
import { InboxIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import PubSub from "pubsub-js"
import { KNOWLEDGE_QUEUE } from "@/queue"

type Props = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

export const AddKnowledge = ({ open, setOpen }: Props) => {
  const { t } = useTranslation("knowledge")
  const [form] = Form.useForm()

  const onUploadHandler = async (data: {
    title: string
    file: UploadFile[]
  }) => {
    const defaultEM = await defaultEmbeddingModelForRag()

    if (!defaultEM) {
      throw new Error(t("noEmbeddingModel"))
    }

    const source: Source[] = []

    for (const file of data.file) {
      const data = await convertToSource(file)
      source.push(data)
    }

    const knowledge = await createKnowledge({
      embedding_model: defaultEM,
      source,
      title: data.title
    })

    return knowledge.id
  }

  const { mutate: saveKnowledge, isPending: isSaving } = useMutation({
    mutationFn: onUploadHandler,
    onError: (error) => {
      message.error(error.message)
    },
    onSuccess: async (id) => {
      message.success(t("form.success"))
      PubSub.publish(KNOWLEDGE_QUEUE, id)
      setOpen(false)
    }
  })

  return (
    <Modal
      title={t("addKnowledge")}
      open={open}
      footer={null}
      onCancel={() => setOpen(false)}>
      <Form onFinish={saveKnowledge} form={form} layout="vertical">
        <Form.Item
          rules={[
            {
              required: true,
              message: t("form.title.required")
            }
          ]}
          name="title"
          label={t("form.title.label")}>
          <Input size="large" placeholder={t("form.title.placeholder")} />
        </Form.Item>
        <Form.Item
          name="file"
          label={t("form.uploadFile.label")}
          rules={[
            {
              required: true,
              message: t("form.uploadFile.required")
            }
          ]}
          getValueFromEvent={(e) => {
            if (Array.isArray(e)) {
              return e
            }
            return e?.fileList
          }}>
          <Upload.Dragger
            accept={".pdf, .csv, .txt"}
            multiple={true}
            maxCount={10}
            beforeUpload={(file) => {
              const allowedTypes = [
                "application/pdf",
                // "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/csv",
                "text/plain"
              ]
                .map((type) => type.toLowerCase())
                .join(", ")

              if (!allowedTypes.includes(file.type.toLowerCase())) {
                message.error(
                  t("form.uploadFile.uploadError", { allowedTypes })
                )
                return Upload.LIST_IGNORE
              }

              return false
            }}>
            <div className="p-3">
              <p className="ant-upload-drag-icon justify-center flex">
                <InboxIcon className="h-10 w-10 text-gray-400" />
              </p>
              <p className="ant-upload-text">
                {t("form.uploadFile.uploadText")}
              </p>
              <p className="ant-upload-hint">
                {t("form.uploadFile.uploadHint")}
              </p>
            </div>
          </Upload.Dragger>
        </Form.Item>

        <Form.Item>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full text-center justify-center items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
            {t("form.submit")}
          </button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
