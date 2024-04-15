import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Skeleton,
  Table,
  Tooltip,
  notification,
  Modal,
  Input,
  Form,
  Switch,
} from "antd"
import { Trash2, Pen, Computer, Zap } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  deletePromptById,
  getAllPrompts,
  savePrompt,
  updatePrompt
} from "@/db"

export const PromptBody = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editId, setEditId] = useState("")
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const { t } = useTranslation("settings")

  const { data, status } = useQuery({
    queryKey: ["fetchAllPrompts"],
    queryFn: getAllPrompts
  })

  const { mutate: deletePrompt } = useMutation({
    mutationFn: deletePromptById,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchAllPrompts"]
      })
      notification.success({
        message: t("managePrompts.notification.deletedSuccess"),
        description: t("managePrompts.notification.deletedSuccessDesc")
      })
    },
    onError: (error) => {
      notification.error({
        message: t("managePrompts.notification.error"),
        description: error?.message || t("managePrompts.notification.someError")
      })
    }
  })

  const { mutate: savePromptMutation, isPending: savePromptLoading } =
    useMutation({
      mutationFn: savePrompt,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchAllPrompts"]
        })
        setOpen(false)
        createForm.resetFields()
        notification.success({
          message: t("managePrompts.notification.addSuccess"),
          description: t("managePrompts.notification.addSuccessDesc")
        })
      },
      onError: (error) => {
        notification.error({
          message: t("managePrompts.notification.error"),
          description:
            error?.message || t("managePrompts.notification.someError")
        })
      }
    })

  const { mutate: updatePromptMutation, isPending: isUpdatingPrompt } =
    useMutation({
      mutationFn: async (data: any) => {
        return await updatePrompt({
          ...data,
          id: editId
        })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchAllPrompts"]
        })
        setOpenEdit(false)
        editForm.resetFields()
        notification.success({
          message: t("managePrompts.notification.updatedSuccess"),
          description: t("managePrompts.notification.updatedSuccessDesc")
        })
      },
      onError: (error) => {
        notification.error({
          message: t("managePrompts.notification.error"),
          description:
            error?.message || t("managePrompts.notification.someError")
        })
      }
    })

  return (
    <div>
      <div>
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("managePrompts.addBtn")}
              </button>
            </div>
          </div>
        </div>

        {status === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {status === "success" && (
          <Table
            columns={[
              {
                title: t("managePrompts.columns.title"),
                dataIndex: "title",
                key: "title"
              },
              {
                title: t("managePrompts.columns.prompt"),
                dataIndex: "content",
                key: "content"
              },
              {
                title: t("managePrompts.columns.type"),
                dataIndex: "is_system",
                key: "is_system",
                render: (is_system) =>
                  is_system ? (
                    <span className="flex items-center gap-2">
                      <Computer className="w-5 h-5 " />
                      {t("managePrompts.systemPrompt")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      {t("managePrompts.quickPrompt")}
                    </span>
                  )
              },
              {
                title: t("managePrompts.columns.actions"),
                render: (_, record) => (
                  <div className="flex gap-4">
                    <Tooltip title={t("managePrompts.tooltip.delete")}>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(t("managePrompts.confirm.delete"))
                          ) {
                            deletePrompt(record.id)
                          }
                        }}
                        className="text-red-500 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("managePrompts.tooltip.edit")}>
                      <button
                        onClick={() => {
                          setEditId(record.id)
                          editForm.setFieldsValue(record)
                          setOpenEdit(true)
                        }}
                        className="text-gray-500 dark:text-gray-400">
                        <Pen className="w-5 h-5" />
                      </button>
                    </Tooltip>
                  </div>
                )
              }
            ]}
            bordered
            dataSource={data}
            rowKey={(record) => record.id}
          />
        )}
      </div>

      <Modal
        title={t("managePrompts.modal.addTitle")}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}>
        <Form
          onFinish={(values) => savePromptMutation(values)}
          layout="vertical"
          form={createForm}>
          <Form.Item
            name="title"
            label={t("managePrompts.form.title.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.title.required")
              }
            ]}>
            <Input placeholder={t("managePrompts.form.title.placeholder")} />
          </Form.Item>

          <Form.Item
            name="content"
            label={t("managePrompts.form.prompt.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.prompt.required")
              }
            ]}
            help={t("managePrompts.form.prompt.help")}>
            <Input.TextArea
              placeholder={t("managePrompts.form.prompt.placeholder")}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="is_system"
            label={t("managePrompts.form.isSystem.label")}
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <button
              disabled={savePromptLoading}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {savePromptLoading
                ? t("managePrompts.form.btnSave.saving")
                : t("managePrompts.form.btnSave.save")}
            </button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("managePrompts.modal.editTitle")}
        open={openEdit}
        onCancel={() => setOpenEdit(false)}
        footer={null}>
        <Form
          onFinish={(values) => updatePromptMutation(values)}
          layout="vertical"
          form={editForm}>
          <Form.Item
            name="title"
            label={t("managePrompts.form.title.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.title.required")
              }
            ]}>
            <Input placeholder={t("managePrompts.form.title.placeholder")} />
          </Form.Item>

          <Form.Item
            name="content"
            label={t("managePrompts.form.prompt.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.prompt.required")
              }
            ]}
            help={t("managePrompts.form.prompt.help")}>
            <Input.TextArea
              placeholder={t("managePrompts.form.prompt.placeholder")}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="is_system"
            label={t("managePrompts.form.isSystem.label")}
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isUpdatingPrompt}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isUpdatingPrompt
                ? t("managePrompts.form.btnEdit.saving")
                : t("managePrompts.form.btnEdit.save")}
            </button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
