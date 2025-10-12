import { getKnowledgeById, updateKnowledgebase } from "@/db/dexie/knowledge"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Alert, Button, Form, Input, Modal, Skeleton, message } from "antd"
import { Loader2 } from "lucide-react"
import React from "react"
import { useTranslation } from "react-i18next"

const DEFAULT_RAG_QUESTION_PROMPT =
  "Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.   Chat History: {chat_history} Follow Up Input: {question} Standalone question:"

const DEFAUTL_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say you don't know. DO NOT try to make up an answer. If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.  {context}  Question: {question} Helpful answer:`

type Props = {
  id: string
  open: boolean
  setOpen: (open: boolean) => void
}

export const EditKnowledgeSettings: React.FC<Props> = ({
  id,
  open,
  setOpen
}) => {
  const [form] = Form.useForm()
  const { t } = useTranslation(["knowledge", "common"])
  const queryClient = useQueryClient()

  const { status } = useQuery({
    queryKey: ["fetchKnowledgeById", id],
    queryFn: async () => {
      const data = await getKnowledgeById(id)
      if (data) {
        form.setFieldsValue({
          title: data.title,
          systemPrompt: data.systemPrompt || "",
          followupPrompt: data.followupPrompt || ""
        })
      }
      return data
    },
    enabled: open && !!id,
    staleTime: 0
  })

  const { mutate, isPending } = useMutation({
    mutationFn: updateKnowledgebase,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["fetchAllKnowledge"]
      })
      await queryClient.invalidateQueries({
        queryKey: ["fetchKnowledgeById", id]
      })
      message.success(t("editSettings.success"))
      setOpen(false)
    },
    onError: (error) => {
      message.error(error.message)
    }
  })

  const handleSubmit = (values: any) => {
    mutate({
      id,
      title: values.title,
      systemPrompt: values.systemPrompt,
      followupPrompt: values.followupPrompt
    })
  }

  return (
    <Modal
      title={t("editSettings.title")}
      open={open}
      onCancel={() => {
        setOpen(false)
      }}
      footer={null}
      width={700}>
      {status === "pending" && <Skeleton active />}
      {status === "success" && (
        <Form onFinish={handleSubmit} form={form} layout="vertical">
          <Form.Item
            name="title"
            label={t("editSettings.form.title.label")}
            rules={[
              {
                required: true,
                message: t("editSettings.form.title.required")
              }
            ]}>
            <Input
              size="large"
              placeholder={t("editSettings.form.title.placeholder")}
            />
          </Form.Item>

          <Form.Item
            name="systemPrompt"
            label={
              <div className="flex items-center justify-between w-full">
                <span>{t("editSettings.form.systemPrompt.label")}</span>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    form.setFieldValue(
                      "systemPrompt",
                      DEFAUTL_RAG_SYSTEM_PROMPT
                    )
                  }}>
                  {t("editSettings.form.systemPrompt.prefillButton")}
                </Button>
              </div>
            }
            help={t("editSettings.form.systemPrompt.help")}>
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder={t("editSettings.form.systemPrompt.placeholder")}
            />
          </Form.Item>

          <Form.Item
            name="followupPrompt"
            label={
              <div className="flex items-center justify-between w-full">
                <span>{t("editSettings.form.followupPrompt.label")}</span>
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    form.setFieldValue(
                      "followupPrompt",
                      DEFAULT_RAG_QUESTION_PROMPT
                    )
                  }}>
                  {t("editSettings.form.followupPrompt.prefillButton")}
                </Button>
              </div>
            }
            help={t("editSettings.form.followupPrompt.help")}>
            <Input.TextArea
              autoSize={{ minRows: 4, maxRows: 10 }}
              placeholder={t("editSettings.form.followupPrompt.placeholder")}
            />
          </Form.Item>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t("common:save")
            )}
          </button>
        </Form>
      )}
    </Modal>
  )
}
