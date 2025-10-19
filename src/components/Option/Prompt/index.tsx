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
  Segmented,
  Tag
} from "antd"
import { Trash2, Pen, Computer, Zap } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  deletePromptById,
  getAllPrompts,
  savePrompt,
  updatePrompt
} from "@/db/dexie/helpers"
import {
  getAllCopilotPrompts,
  setAllCopilotPrompts,
  getCustomCopilotPrompts,
  saveCustomCopilotPrompt,
  updateCustomCopilotPrompt,
  deleteCustomCopilotPrompt,
  toggleCustomCopilotPrompt,
  toggleCopilotPromptEnabled,
  type CustomCopilotPrompt
} from "@/services/application"
import { tagColors } from "@/utils/color"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"

export const PromptBody = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editId, setEditId] = useState("")
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const { t } = useTranslation(["settings", "common"])
  const [selectedSegment, setSelectedSegment] = useState<"custom" | "copilot" | "custom-copilot">(
    "custom"
  )

  const [openCopilotEdit, setOpenCopilotEdit] = useState(false)
  const [editCopilotId, setEditCopilotId] = useState("")
  const [editCopilotForm] = Form.useForm()

  // Custom Copilot Prompts state
  const [openCustomCopilot, setOpenCustomCopilot] = useState(false)
  const [openEditCustomCopilot, setOpenEditCustomCopilot] = useState(false)
  const [editCustomCopilotId, setEditCustomCopilotId] = useState("")
  const [createCustomCopilotForm] = Form.useForm()
  const [editCustomCopilotForm] = Form.useForm()

  const { data, status } = useQuery({
    queryKey: ["fetchAllPrompts"],
    queryFn: getAllPrompts
  })

  const { data: copilotData, status: copilotStatus } = useQuery({
    queryKey: ["fetchCopilotPrompts"],
    queryFn: getAllCopilotPrompts
  })

  const { data: customCopilotData, status: customCopilotStatus } = useQuery({
    queryKey: ["fetchCustomCopilotPrompts"],
    queryFn: getCustomCopilotPrompts
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

  const { mutate: updateCopilotPrompt, isPending: isUpdatingCopilotPrompt } =
    useMutation({
      mutationFn: async (data: any) => {
        return await setAllCopilotPrompts([
          {
            key: data.key,
            prompt: data.prompt
          }
        ])
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchCopilotPrompts"]
        })
        setOpenCopilotEdit(false)
        editCopilotForm.resetFields()
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

  // Custom Copilot Prompts mutations
  const { mutate: saveCustomCopilotMutation, isPending: isSavingCustomCopilot } =
    useMutation({
      mutationFn: saveCustomCopilotPrompt,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchCustomCopilotPrompts"]
        })
        setOpenCustomCopilot(false)
        createCustomCopilotForm.resetFields()
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

  const { mutate: updateCustomCopilotMutation, isPending: isUpdatingCustomCopilot } =
    useMutation({
      mutationFn: async (data: { id: string; title: string; prompt: string }) => {
        return await updateCustomCopilotPrompt(data.id, {
          title: data.title,
          prompt: data.prompt
        })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["fetchCustomCopilotPrompts"]
        })
        setOpenEditCustomCopilot(false)
        editCustomCopilotForm.resetFields()
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

  const { mutate: deleteCustomCopilotMutation } = useMutation({
    mutationFn: deleteCustomCopilotPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchCustomCopilotPrompts"]
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

  const { mutate: toggleCustomCopilotMutation } = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleCustomCopilotPrompt(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchCustomCopilotPrompts"]
      })
    },
    onError: (error) => {
      notification.error({
        message: t("managePrompts.notification.error"),
        description: error?.message || t("managePrompts.notification.someError")
      })
    }
  })

  const { mutate: toggleBuiltinCopilotMutation } = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      toggleCopilotPromptEnabled(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["fetchCopilotPrompts"]
      })
    },
    onError: (error) => {
      notification.error({
        message: t("managePrompts.notification.error"),
        description: error?.message || t("managePrompts.notification.someError")
      })
    }
  })

  function customPrompts() {
    return (
      <div>
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => {
                  if (isFireFoxPrivateMode) {
                    notification.error({
                      message: "Page Assist can't save data",
                      description:
                        "Firefox Private Mode does not support saving data to IndexedDB. Please add prompts from a normal window."
                    })
                    return
                  }
                  setOpen(true)
                }}
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
                key: "title",
                render: (content) => (
                  <span className="line-clamp-1">{content}</span>
                )
              },
              {
                title: t("managePrompts.columns.prompt"),
                dataIndex: "content",
                key: "content",
                render: (content) => (
                  <span className="line-clamp-1">{content}</span>
                )
              },
              {
                title: t("managePrompts.columns.type"),
                dataIndex: "is_system",
                key: "is_system",
                render: (is_system) => (
                  <span className="flex items-center gap-2 text-xs w-32">
                    {is_system ? (
                      <>
                        <Computer className="size-4" />{" "}
                        {t("managePrompts.systemPrompt")}
                      </>
                    ) : (
                      <>
                        <Zap className="size-4" />{" "}
                        {t("managePrompts.quickPrompt")}
                      </>
                    )}
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
                        disabled={isFireFoxPrivateMode}
                        className="text-red-500 dark:text-red-400 disabled:opacity-50">
                        <Trash2 className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("managePrompts.tooltip.edit")}>
                      <button
                        onClick={() => {
                          setEditId(record.id)
                          editForm.setFieldsValue(record)
                          setOpenEdit(true)
                        }}
                        disabled={isFireFoxPrivateMode}
                        className="text-gray-500 dark:text-gray-400 disabled:opacity-50">
                        <Pen className="size-4" />
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
    )
  }

  function copilotPrompts() {
    return (
      <div>
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ Copilot prompts are deprecated. Please use Custom Copilot instead. Copilot prompts will be removed in a future version.
          </p>
        </div>

        {copilotStatus === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {copilotStatus === "success" && (
          <Table
            columns={[
              {
                title: t("managePrompts.columns.title"),
                dataIndex: "key",
                key: "key",
                render: (content) => (
                  <span className="line-clamp-1">
                    <Tag color={tagColors[content || "default"]}>
                      {t(`common:copilot.${content}`)}
                    </Tag>
                  </span>
                )
              },
              {
                title: t("managePrompts.columns.prompt"),
                dataIndex: "prompt",
                key: "prompt",
                render: (content) => (
                  <span className="line-clamp-1">{content}</span>
                )
              },
              {
                title: "Enabled",
                dataIndex: "enabled",
                key: "enabled",
                render: (enabled, record) => (
                  <Switch
                    checked={enabled}
                    onChange={(checked) =>
                      toggleBuiltinCopilotMutation({ key: record.key, enabled: checked })
                    }
                  />
                )
              },
              {
                render: (_, record) => (
                  <div className="flex gap-4">
                    <Tooltip title={t("managePrompts.tooltip.edit")}>
                      <button
                        onClick={() => {
                          setEditCopilotId(record.key)
                          editCopilotForm.setFieldsValue(record)
                          setOpenCopilotEdit(true)
                        }}
                        className="text-gray-500 dark:text-gray-400">
                        <Pen className="size-4" />
                      </button>
                    </Tooltip>
                  </div>
                )
              }
            ]}
            bordered
            dataSource={copilotData}
            rowKey={(record) => record.key}
          />
        )}
      </div>
    )
  }

  function customCopilotPrompts() {
    return (
      <div>
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => setOpenCustomCopilot(true)}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("managePrompts.addBtn")}
              </button>
            </div>
          </div>
        </div>

        {customCopilotStatus === "pending" && <Skeleton paragraph={{ rows: 8 }} />}

        {customCopilotStatus === "success" && (
          <Table
            columns={[
              {
                title: t("managePrompts.columns.title"),
                dataIndex: "title",
                key: "title",
                render: (content) => (
                  <span className="line-clamp-1">{content}</span>
                )
              },
              {
                title: t("managePrompts.columns.prompt"),
                dataIndex: "prompt",
                key: "prompt",
                render: (content) => (
                  <span className="line-clamp-1">{content}</span>
                )
              },
              {
                title: "Enabled",
                dataIndex: "enabled",
                key: "enabled",
                render: (enabled, record) => (
                  <Switch
                    checked={enabled}
                    onChange={(checked) =>
                      toggleCustomCopilotMutation({ id: record.id, enabled: checked })
                    }
                  />
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
                            deleteCustomCopilotMutation(record.id)
                          }
                        }}
                        className="text-red-500 dark:text-red-400">
                        <Trash2 className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("managePrompts.tooltip.edit")}>
                      <button
                        onClick={() => {
                          setEditCustomCopilotId(record.id)
                          editCustomCopilotForm.setFieldsValue(record)
                          setOpenEditCustomCopilot(true)
                        }}
                        className="text-gray-500 dark:text-gray-400">
                        <Pen className="size-4" />
                      </button>
                    </Tooltip>
                  </div>
                )
              }
            ]}
            bordered
            dataSource={customCopilotData}
            rowKey={(record) => record.id}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <Segmented
          size="large"
          options={[
            {
              label: t("managePrompts.segmented.custom"),
              value: "custom"
            },
            {
              label: "Custom Copilot",
              value: "custom-copilot"
            },
            {
              label: t("managePrompts.segmented.copilot"),
              value: "copilot"
            },
          ]}
          onChange={(value) => {
            setSelectedSegment(value as "custom" | "copilot" | "custom-copilot")
          }}
        />
      </div>
      {selectedSegment === "custom" && customPrompts()}
      {selectedSegment === "copilot" && copilotPrompts()}
      {selectedSegment === "custom-copilot" && customCopilotPrompts()}

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

      <Modal
        title={t("managePrompts.modal.editTitle")}
        open={openCopilotEdit}
        onCancel={() => setOpenCopilotEdit(false)}
        footer={null}>
        <Form
          onFinish={(values) =>
            updateCopilotPrompt({
              key: editCopilotId,
              prompt: values.prompt
            })
          }
          layout="vertical"
          form={editCopilotForm}>
          <Form.Item
            name="prompt"
            label={t("managePrompts.form.prompt.label")}
            rules={[
              {
                required: true,
                message: t("managePrompts.form.prompt.required")
              },
              {
                validator: (_, value) => {
                  if (value && value.includes("{text}")) {
                    return Promise.resolve()
                  }
                  return Promise.reject(
                    new Error(
                      t("managePrompts.form.prompt.missingTextPlaceholder")
                    )
                  )
                }
              }
            ]}>
            <Input.TextArea
              placeholder={t("managePrompts.form.prompt.placeholder")}
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isUpdatingCopilotPrompt}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isUpdatingCopilotPrompt
                ? t("managePrompts.form.btnEdit.saving")
                : t("managePrompts.form.btnEdit.save")}
            </button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Custom Copilot Prompts Modals */}
      <Modal
        title="Add Custom Copilot Prompt"
        open={openCustomCopilot}
        onCancel={() => setOpenCustomCopilot(false)}
        footer={null}>
        <Form
          onFinish={(values) => saveCustomCopilotMutation(values)}
          layout="vertical"
          form={createCustomCopilotForm}>
          <Form.Item
            name="title"
            label="Title"
            rules={[
              {
                required: true,
                message: "Please enter a title"
              }
            ]}
            help="This will appear in the context menu">
            <Input placeholder="e.g. Simplify Text" />
          </Form.Item>

          <Form.Item
            name="prompt"
            label="Prompt Template"
            rules={[
              {
                required: true,
                message: "Please enter a prompt"
              },
              {
                validator: (_, value) => {
                  if (value && value.includes("{text}")) {
                    return Promise.resolve()
                  }
                  return Promise.reject(
                    new Error("Prompt must include {text} placeholder")
                  )
                }
              }
            ]}
            help="Use {text} as placeholder for selected text">
            <Input.TextArea
              placeholder="e.g. Simplify the following text:\n\n{text}"
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isSavingCustomCopilot}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isSavingCustomCopilot ? "Saving..." : "Save"}
            </button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Custom Copilot Prompt"
        open={openEditCustomCopilot}
        onCancel={() => setOpenEditCustomCopilot(false)}
        footer={null}>
        <Form
          onFinish={(values) =>
            updateCustomCopilotMutation({
              id: editCustomCopilotId,
              title: values.title,
              prompt: values.prompt
            })
          }
          layout="vertical"
          form={editCustomCopilotForm}>
          <Form.Item
            name="title"
            label="Title"
            rules={[
              {
                required: true,
                message: "Please enter a title"
              }
            ]}
            help="This will appear in the context menu">
            <Input placeholder="e.g. Simplify Text" />
          </Form.Item>

          <Form.Item
            name="prompt"
            label="Prompt Template"
            rules={[
              {
                required: true,
                message: "Please enter a prompt"
              },
              {
                validator: (_, value) => {
                  if (value && value.includes("{text}")) {
                    return Promise.resolve()
                  }
                  return Promise.reject(
                    new Error("Prompt must include {text} placeholder")
                  )
                }
              }
            ]}
            help="Use {text} as placeholder for selected text">
            <Input.TextArea
              placeholder="e.g. Simplify the following text:\n\n{text}"
              autoSize={{ minRows: 3, maxRows: 10 }}
            />
          </Form.Item>

          <Form.Item>
            <button
              disabled={isUpdatingCustomCopilot}
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 ">
              {isUpdatingCustomCopilot ? "Saving..." : "Save"}
            </button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
