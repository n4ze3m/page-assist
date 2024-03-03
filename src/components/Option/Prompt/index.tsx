import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Skeleton,
  Table,
  Tooltip,
  notification,
  Modal,
  Input,
  Form,
  Switch
} from "antd"
import { Trash2, Pen, Computer, Zap } from "lucide-react"
import { useState } from "react"
import {
  deletePromptById,
  getAllPrompts,
  savePrompt,
  updatePrompt
} from "~libs/db"

export const PromptBody = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editId, setEditId] = useState("")
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

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
        message: "Model Deleted",
        description: "Model has been deleted successfully"
      })
    },
    onError: (error) => {
      notification.error({
        message: "Error",
        description: error?.message || "Something went wrong"
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
          message: "Prompt Added",
          description: "Prompt has been added successfully"
        })
      },
      onError: (error) => {
        notification.error({
          message: "Error",
          description: error?.message || "Something went wrong"
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
          message: "Prompt Updated",
          description: "Prompt has been updated successfully"
        })
      },
      onError: (error) => {
        notification.error({
          message: "Error",
          description: error?.message || "Something went wrong"
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
                Add New Prompt
              </button>
            </div>
          </div>
        </div>

        {status === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {status === "success" && (
          <Table
            columns={[
              {
                title: "Title",
                dataIndex: "title",
                key: "title"
              },
              {
                title: "Prompt",
                dataIndex: "content",
                key: "content"
              },
              {
                title: "Prompt Type",
                dataIndex: "is_system",
                key: "is_system",
                render: (is_system) =>
                  is_system ? (
                    <span className="flex justify-between">
                       <Computer className="w-5 h-5 mr-3" />
                       System Prompt
                    </span>
                  ) : (
                    <span className="flex justify-between">
                      <Zap className="w-5 h-5 mr-3" />
                      Quick Prompt
                    </span>
                  )
              },
              {
                title: "Action",
                render: (_, record) => (
                  <div className="flex gap-4">
                    <Tooltip title="Delete Prompt">
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this prompt? This action cannot be undone."
                            )
                          ) {
                            deletePrompt(record.id)
                          }
                        }}
                        className="text-red-500 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Edit Prompt">
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
        title="Add New Prompt"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}>
        <Form
          onFinish={(values) => savePromptMutation(values)}
          layout="vertical"
          form={createForm}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="My Awesome Prompt" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Prompt"
            rules={[{ required: true, message: "Prompt is required" }]}
            help="You can use {key} as variable in your prompt.">
            <Input.TextArea
              placeholder="Your prompt goes here..."
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="is_system"
            label="Is System Prompt"
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <button
              disabled={savePromptLoading}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {savePromptLoading ? "Adding Prompt..." : "Add Prompt"}
            </button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Update Prompt"
        open={openEdit}
        onCancel={() => setOpenEdit(false)}
        footer={null}>
        <Form
          onFinish={(values) => updatePromptMutation(values)}
          layout="vertical"
          form={editForm}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="My Awesome Prompt" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Prompt"
            rules={[{ required: true, message: "Prompt is required" }]}
            help="You can use {key} as variable in your prompt.">
            <Input.TextArea
              placeholder="Your prompt goes here..."
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item
            name="is_system"
            label="Is System Prompt"
            valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isUpdatingPrompt}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isUpdatingPrompt ? "Updating Prompt..." : "Update Prompt"}
            </button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
