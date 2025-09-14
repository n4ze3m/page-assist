/**
 * The `OpenAIApp` component is the main entry point for the OpenAI configuration management functionality in the application.
 * It provides a user interface for adding, editing, deleting, and refetching OpenAI configurations.
 * The component uses React Query to manage the state and perform CRUD operations on the OpenAI configurations.
 * It also includes a modal for fetching the available models from the selected OpenAI configuration.
 */
import {
  Form,
  Input,
  Modal,
  Table,
  message,
  Tooltip,
  Select,
  Switch,
  notification
} from "antd"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  addOpenAICofig,
  getAllOpenAIConfig,
  deleteOpenAIConfig,
  updateOpenAIConfig
} from "@/db/dexie/openai"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2, DownloadIcon, Trash2Icon } from "lucide-react"
import { OpenAIFetchModel } from "./openai-fetch-model"
import { OAI_API_PROVIDERS } from "@/utils/oai-api-providers"
import { ProviderIcons } from "@/components/Common/ProviderIcon"
const noPopupProvider = ["lmstudio", "llamafile", "ollama2", "llamacpp", "vllm"]
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"

export const OpenAIApp = () => {
  const { t } = useTranslation(["openai", "settings"])
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
      form.resetFields()
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
      form.resetFields()
      setEditingConfig(null)
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
    fix_cors?: boolean
    headers?: { key: string; value: string }[]
  }) => {
    if (editingConfig) {
      updateMutation.mutate({
        id: editingConfig.id,
        ...values
      })
    } else {
      addMutation.mutate({
        ...values,
        provider
      })
    }
  }

  const handleEdit = (record: any) => {
    setEditingConfig({
      ...record,
      headers: record?.headers || []
    })
    form.setFieldsValue({
      ...record,
      headers: record?.headers || [],
      fix_cors: record?.fix_cors || false
    })
    setOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="px-2 sm:px-0">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("heading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {t("subheading")}
              </p>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  if (isFireFoxPrivateMode) {
                    notification.error({
                      message: "Page Assist can't save data",
                      description:
                        "Firefox Private Mode does not support saving data to IndexedDB. Please add OpenAI configurations from a normal window."
                    })
                    return
                  }

                  setEditingConfig(null)
                  setOpen(true)
                  form.resetFields()
                }}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-black px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100 dark:focus:ring-gray-500 dark:focus:ring-offset-gray-100 disabled:opacity-50 w-full sm:w-auto">
                {t("addBtn")}
              </button>
            </div>
          </div>
          <div className="border border-b border-gray-200 dark:border-gray-600 mt-4 mb-0"></div>
        </div>

        <Table
          columns={[
            {
              title: t("table.name"),
              dataIndex: "name",
              key: "name",
              ellipsis: true
            },
            {
              title: t("table.baseUrl"),
              dataIndex: "baseUrl",
              key: "baseUrl",
              render: (text) => (
                <span className="truncate block" title={text}>
                  {text}
                </span>
              )
            },
            {
              title: t("table.actions"),
              key: "actions",
              render: (_, record) => (
                <div className="flex gap-2 sm:gap-4 justify-start">
                  <Tooltip title={t("edit")}>
                    <button
                      className="text-gray-700 dark:text-gray-400 disabled:opacity-50 p-1"
                      disabled={isFireFoxPrivateMode}
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
                      className="text-gray-700 dark:text-gray-400 disabled:opacity-50 p-1"
                      onClick={() => {
                        setOpenModelModal(true)
                        setOpenaiId(record.id)
                      }}
                      disabled={
                        !record.id ||
                        noPopupProvider.includes(record.provider) ||
                        isFireFoxPrivateMode
                      }>
                      <DownloadIcon className="size-4" />
                    </button>
                  </Tooltip>

                  <Tooltip title={t("delete")}>
                    <button
                      className="text-red-500 dark:text-red-400 disabled:opacity-50 p-1"
                      disabled={isFireFoxPrivateMode}
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
          bordered
          scroll={{ x: 600 }}
          className="[&_.ant-table]:text-sm"
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
              filterOption={(input, option) => {
                //@ts-ignore
                return (
                  option?.label?.props["data-title"]
                    ?.toLowerCase()
                    ?.indexOf(input.toLowerCase()) >= 0
                )
              }}
              showSearch
              className="w-full !mb-4"
              size="large"
              options={OAI_API_PROVIDERS.map((e) => ({
                value: e.value,
                label: (
                  <span
                    key={e.value}
                    data-title={e.label}
                    className="flex flex-row gap-3 items-center">
                    <ProviderIcons
                      provider={e.value}
                      className="size-5 flex-shrink-0"
                    />
                    <span className="line-clamp-2 text-sm">{e.label}</span>
                  </span>
                )
              }))}
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

            <Form.Item
              name="fix_cors"
              label={t("modal.fixCors.label", {
                defaultValue: "Fix CORS issues"
              })}
              valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.List name="headers">
              {(fields, { add, remove }) => (
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold">
                      {t(
                        "settings:ollamaSettings.settings.advanced.headers.label"
                      )}
                    </h3>
                    <button
                      type="button"
                      className="dark:bg-white dark:text-black text-white bg-black px-2 py-1 text-xs rounded-md"
                      onClick={() => {
                        add()
                      }}>
                      {t(
                        "settings:ollamaSettings.settings.advanced.headers.add"
                      )}
                    </button>
                  </div>
                  {fields.map((field, index) => (
                    <div
                      key={field.key}
                      className="flex flex-col sm:flex-row items-start sm:items-end gap-2 mb-3">
                      <div className="flex-grow w-full space-y-2 sm:space-y-0 sm:space-x-2 sm:flex">
                        <Form.Item
                          label={t(
                            "settings:ollamaSettings.settings.advanced.headers.key.label"
                          )}
                          name={[field.name, "key"]}
                          className="flex-1 mb-0 w-full">
                          <Input
                            className="w-full"
                            placeholder={t(
                              "settings:ollamaSettings.settings.advanced.headers.key.placeholder"
                            )}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t(
                            "settings:ollamaSettings.settings.advanced.headers.value.label"
                          )}
                          name={[field.name, "value"]}
                          className="flex-1 mb-0 w-full">
                          <Input
                            className="w-full"
                            placeholder={t(
                              "settings:ollamaSettings.settings.advanced.headers.value.placeholder"
                            )}
                          />
                        </Form.Item>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          remove(field.name)
                        }}
                        className="shrink-0 p-1 text-red-500 dark:text-red-400 sm:ml-2 self-start sm:self-auto">
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Form.List>
            {provider === "lmstudio" && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
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
          onCancel={() => setOpenModelModal(false)}
  >
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
