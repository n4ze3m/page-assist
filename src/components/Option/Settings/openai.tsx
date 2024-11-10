/**
 * The `OpenAIApp` component is the main entry point for the OpenAI configuration management functionality in the application.
 * It provides a user interface for adding, editing, deleting, and refetching OpenAI configurations.
 * The component uses React Query to manage the state and perform CRUD operations on the OpenAI configurations.
 * It also includes a modal for fetching the available models from the selected OpenAI configuration.
 */
import { Form, Input, Modal, Table, message, Tooltip, Select } from "antd"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  addOpenAICofig,
  getAllOpenAIConfig,
  deleteOpenAIConfig,
  updateOpenAIConfig
} from "@/db/openai"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Pencil,
  Trash2,
  RotateCwIcon,
  DownloadIcon,
  AlertTriangle
} from "lucide-react"
import { OpenAIFetchModel } from "./openai-fetch-model"
import { OAI_API_PROVIDERS } from "@/utils/oai-api-providers"
const noPopupProvider = ["lmstudio", "llamafile", "ollama2"]

export const OpenAIApp = () => {
  const { t } = useTranslation("openai")
  const [open, setOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [openaiId, setOpenaiId] = useState<string | null>(null)
  const [openModelModal, setOpenModelModal] = useState(false)
  const [provider, setProvider] = useState("custom")

  const { data: configs, isLoading } = useQuery({
    queryKey: ["openAIConfigs"],
    queryFn: getAllOpenAIConfig
  })

  const addMutation = useMutation({
    mutationFn: addOpenAICofig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["openAIConfigs"]
      })
      setOpen(false)
      message.success(t("addSuccess"))
      if (!noPopupProvider.includes(provider)) {
        setOpenaiId(data)
        setOpenModelModal(true)
      }
      setProvider("custom")
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateOpenAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["openAIConfigs"]
      })
      setOpen(false)
      message.success(t("updateSuccess"))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOpenAIConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["openAIConfigs"]
      })
      message.success(t("deleteSuccess"))
    }
  })

  const handleSubmit = (values: {
    id?: string
    name: string
    baseUrl: string
    apiKey: string
  }) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, ...values })
    } else {
      addMutation.mutate({
        ...values,
        provider
      })
    }
  }

  const handleEdit = (record: any) => {
    setEditingConfig(record)
    setOpen(true)
    form.setFieldsValue(record)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <div>
      <div>
        <div>
          <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
            {t("heading")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
            {t("subheading")}
          </p>
          <div className="border border-b border-gray-200 dark:border-gray-600 mt-3 mb-6"></div>
        </div>
        <div className="mb-6">
          <div className="-ml-4 -mt-2 flex flex-wrap items-center justify-end sm:flex-nowrap">
            <div className="ml-4 mt-2 flex-shrink-0">
              <button
                onClick={() => {
                  setEditingConfig(null)
                  setOpen(true)
                  form.resetFields()
                }}
                className="inline-flex items-center rounded-md border border-transparent bg-black px-2 py-2 text-md font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
                {t("addBtn")}
              </button>
            </div>
          </div>
        </div>

        <Table
          columns={[
            {
              title: t("table.name"),
              dataIndex: "name",
              key: "name"
            },
            {
              title: t("table.baseUrl"),
              dataIndex: "baseUrl",
              key: "baseUrl"
            },
            {
              title: t("table.actions"),
              key: "actions",
              render: (_, record) => (
                <div className="flex gap-4">
                  <Tooltip title={t("edit")}>
                    <button
                      className="text-gray-700 dark:text-gray-400"
                      onClick={() => handleEdit(record)}>
                      <Pencil className="size-4" />
                    </button>
                  </Tooltip>

                  <Tooltip
                    title={
                      !noPopupProvider.includes(record.provider)
                        ? t("newModel")
                        : t("noNewModel")
                    }>
                    <button
                      className="text-gray-700 dark:text-gray-400 disabled:opacity-50"
                      onClick={() => {
                        setOpenModelModal(true)
                        setOpenaiId(record.id)
                      }}
                      disabled={
                        !record.id || noPopupProvider.includes(record.provider)
                      }>
                      <DownloadIcon className="size-4" />
                    </button>
                  </Tooltip>

                  <Tooltip title={t("delete")}>
                    <button
                      className="text-red-500 dark:text-red-400"
                      onClick={() => {
                        // add confirmation here
                        if (
                          confirm(
                            t("modal.deleteConfirm", {
                              name: record.name
                            })
                          )
                        ) {
                          handleDelete(record.id)
                        }
                      }}>
                      <Trash2 className="size-4" />
                    </button>
                  </Tooltip>
                </div>
              )
            }
          ]}
          dataSource={configs}
          loading={isLoading}
          rowKey="id"
        />

        <Modal
          open={open}
          title={editingConfig ? t("modal.titleEdit") : t("modal.titleAdd")}
          onCancel={() => {
            setOpen(false)
            setEditingConfig(null)
            setProvider("custom")
            form.resetFields()
          }}
          footer={null}>
          {!editingConfig && (
            <Select
              value={provider}
              onSelect={(e) => {
                const value = OAI_API_PROVIDERS.find((item) => item.value === e)
                form.setFieldsValue({
                  baseUrl: value?.baseUrl,
                  name: value?.label
                })
                setProvider(e)
              }}
              className="w-full !mb-4"
              options={OAI_API_PROVIDERS}
            />
          )}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ ...editingConfig }}>
            <Form.Item
              name="name"
              label={t("modal.name.label")}
              rules={[
                {
                  required: true,
                  message: t("modal.name.required")
                }
              ]}>
              <Input size="large" placeholder={t("modal.name.placeholder")} />
            </Form.Item>

            <Form.Item
              name="baseUrl"
              label={t("modal.baseUrl.label")}
              help={t("modal.baseUrl.help")}
              rules={[
                {
                  required: true,
                  message: t("modal.baseUrl.required")
                }
              ]}>
              <Input
                size="large"
                placeholder={t("modal.baseUrl.placeholder")}
              />
            </Form.Item>

            <Form.Item name="apiKey" label={t("modal.apiKey.label")}>
              <Input.Password
                size="large"
                placeholder={t("modal.apiKey.placeholder")}
              />
            </Form.Item>
            {provider === "lmstudio" && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                {t("modal.tipLMStudio")}
              </div>
            )}
            <button
              type="submit"
              className="inline-flex justify-center w-full text-center mt-4 items-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50">
              {editingConfig ? t("modal.update") : t("modal.submit")}
            </button>
          </Form>
        </Modal>

        <Modal
          open={openModelModal}
          title={t("modal.model.title")}
          footer={null}
          onCancel={() => setOpenModelModal(false)}>
          {openaiId ? (
            <OpenAIFetchModel
              openaiId={openaiId}
              setOpenModelModal={setOpenModelModal}
            />
          ) : null}
        </Modal>
      </div>
    </div>
  )
}
