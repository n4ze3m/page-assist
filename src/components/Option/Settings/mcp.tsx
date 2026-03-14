import {
  Alert,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
  notification
} from "antd"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { 
  Pencil,
  RefreshCw,
  Trash2,
  Trash2Icon
} from "lucide-react"
import { isFireFoxPrivateMode } from "@/utils/is-private-mode"
import {
  addMcpServer,
  deleteMcpServer,
  getAllMcpServers,
  updateMcpServer
} from "@/db/dexie/mcp"
import { getMcpErrorMessage } from "@/libs/mcp/errors"
import { inspectMcpServerTools } from "@/libs/mcp/remote-tools"
import type {
  McpAvailableTool,
  McpServer,
  McpServerInput
} from "@/libs/mcp/types"
import {
  getMcpServerConfigFingerprint,
  normalizeMcpServerInput
} from "@/libs/mcp/utils"

type ValidationSnapshot = {
  fingerprint: string
  cachedTools: McpAvailableTool[]
  toolsLastSyncedAt?: number
  toolsSyncError?: string
}

const isFormValidationError = (
  error: unknown
): error is { errorFields: unknown[] } =>
  typeof error === "object" &&
  error !== null &&
  "errorFields" in error &&
  Array.isArray((error as { errorFields: unknown[] }).errorFields)

const toServerDraft = (values: Partial<McpServerInput>): McpServerInput =>
  normalizeMcpServerInput(values)

const toValidationSnapshot = (
  server: Partial<
    Pick<McpServer, "cachedTools" | "toolsLastSyncedAt" | "toolsSyncError"> &
      McpServerInput
  >
): ValidationSnapshot => ({
  fingerprint: getMcpServerConfigFingerprint(server),
  cachedTools: server.cachedTools || [],
  toolsLastSyncedAt: server.toolsLastSyncedAt,
  toolsSyncError: server.toolsSyncError
})

const formatTimestamp = (value?: number) =>
  value ? new Date(value).toLocaleString() : ""

const ToolTags = ({
  tools,
  maxVisible = 3
}: {
  tools: McpAvailableTool[]
  maxVisible?: number
}) => {
  if (tools.length === 0) {
    return null
  }

  const visibleTools = tools.slice(0, maxVisible)
  const remainingTools = tools.length - visibleTools.length

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTools.map((tool) => (
        <Tooltip key={tool.name} title={tool.description || tool.name}>
          <Tag className="mx-0 max-w-full truncate">{tool.name}</Tag>
        </Tooltip>
      ))}
      {remainingTools > 0 ? (
        <Tag className="mx-0">+{remainingTools}</Tag>
      ) : null}
    </div>
  )
}

export const MCPSettingsApp = () => {
  const { t } = useTranslation(["settings", "common"])
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)
  const [validationSnapshot, setValidationSnapshot] =
    useState<ValidationSnapshot | null>(null)
  const authType = Form.useWatch("authType", form)
  const watchedValues = Form.useWatch([], form)
  const currentFingerprint = getMcpServerConfigFingerprint(watchedValues || {})

  const { data: servers, isLoading } = useQuery({
    queryKey: ["mcpServers"],
    queryFn: getAllMcpServers
  })

  const addMutation = useMutation({
    mutationFn: addMcpServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
      setOpen(false)
      setEditingServer(null)
      setValidationSnapshot(null)
      form.resetFields()
      message.success(t("mcpSettings.notification.added"))
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateMcpServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
      setOpen(false)
      setEditingServer(null)
      setValidationSnapshot(null)
      form.resetFields()
      message.success(t("mcpSettings.notification.updated"))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMcpServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
      message.success(t("mcpSettings.notification.deleted"))
    }
  })

  const validateMutation = useMutation({
    mutationFn: inspectMcpServerTools
  })

  const refreshToolsMutation = useMutation({
    mutationFn: async (server: McpServer) => {
      try {
        const validation = await inspectMcpServerTools(server)
        return await updateMcpServer({
          id: server.id,
          cachedTools: validation.cachedTools,
          toolsLastSyncedAt: validation.toolsLastSyncedAt,
          toolsSyncError: undefined
        })
      } catch (error) {
        await updateMcpServer({
          id: server.id,
          cachedTools: [],
          toolsLastSyncedAt: Date.now(),
          toolsSyncError: getMcpErrorMessage(error)
        })
        throw error
      }
    },
    onSuccess: (server) => {
      queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
      message.success(
        t("mcpSettings.notification.toolsRefreshed", {
          name: server.name
        })
      )
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["mcpServers"] })
      notification.error({
        message: t("mcpSettings.notification.validationFailedTitle"),
        description: getMcpErrorMessage(error)
      })
    }
  })

  const isValidationCurrent =
    validationSnapshot?.fingerprint === currentFingerprint
  const hasValidatedTools = (validationSnapshot?.cachedTools.length ?? 0) > 0
  const isValidationFresh =
    !!validationSnapshot &&
    isValidationCurrent &&
    !validationSnapshot.toolsSyncError &&
    hasValidatedTools
  const isValidationStale =
    !!validationSnapshot &&
    validationSnapshot.fingerprint.length > 0 &&
    validationSnapshot.fingerprint !== currentFingerprint

  const closeModal = () => {
    setOpen(false)
    setEditingServer(null)
    setValidationSnapshot(null)
    form.resetFields()
  }

  const ensureValidatedTools = async (
    draft: McpServerInput,
    force = false
  ): Promise<ValidationSnapshot> => {
    const fingerprint = getMcpServerConfigFingerprint(draft)

    if (
      !force &&
      validationSnapshot &&
      validationSnapshot.fingerprint === fingerprint &&
      !validationSnapshot.toolsSyncError &&
      validationSnapshot.cachedTools.length > 0
    ) {
      return validationSnapshot
    }

    try {
      const validation = await validateMutation.mutateAsync(draft)
      const snapshot: ValidationSnapshot = {
        fingerprint,
        cachedTools: validation.cachedTools,
        toolsLastSyncedAt: validation.toolsLastSyncedAt,
        toolsSyncError: undefined
      }

      setValidationSnapshot(snapshot)
      return snapshot
    } catch (error) {
      const snapshot: ValidationSnapshot = {
        fingerprint,
        cachedTools: [],
        toolsLastSyncedAt: Date.now(),
        toolsSyncError: getMcpErrorMessage(error)
      }

      setValidationSnapshot(snapshot)
      throw error
    }
  }

  const handleValidateTools = async () => {
    try {
      const values = await form.validateFields()
      const draft = toServerDraft(values)
      const snapshot = await ensureValidatedTools(draft, true)

      message.success(
        t("mcpSettings.notification.validated", {
          count: snapshot.cachedTools.length
        })
      )
    } catch (error) {
      if (isFormValidationError(error)) {
        return
      }

      notification.error({
        message: t("mcpSettings.notification.validationFailedTitle"),
        description: getMcpErrorMessage(error)
      })
    }
  }

  const handleSubmit = async (values: McpServerInput) => {
    const draft = toServerDraft(values)

    try {
      const validation = await ensureValidatedTools(draft)
      const payload = {
        ...draft,
        cachedTools: validation.cachedTools,
        toolsLastSyncedAt: validation.toolsLastSyncedAt,
        toolsSyncError: undefined
      }

      if (editingServer?.id) {
        updateMutation.mutate({
          id: editingServer.id,
          ...payload
        })
        return
      }

      addMutation.mutate(payload)
    } catch (error) {
      notification.error({
        message: t("mcpSettings.notification.validationFailedTitle"),
        description: getMcpErrorMessage(error)
      })
    }
  }

  const handleEdit = (server: McpServer) => {
    setEditingServer(server)
    form.setFieldsValue({
      ...server,
      authType: server.authType || "none",
      headers: server.headers || [],
      enabled: server.enabled ?? true
    })
    setValidationSnapshot(toValidationSnapshot(server))
    setOpen(true)
  }

  const handleAdd = () => {
    if (isFireFoxPrivateMode) {
      notification.error({
        message: t("mcpSettings.notification.storageBlockedTitle"),
        description: t("mcpSettings.notification.storageBlockedDescription")
      })
      return
    }

    setEditingServer(null)
    setValidationSnapshot(null)
    form.resetFields()
    form.setFieldsValue({
      transport: "http",
      enabled: true,
      authType: "none",
      headers: []
    })
    setOpen(true)
  }

  const renderValidationAlert = () => {
    if (!validationSnapshot) {
      return (
        <Alert
          type="info"
          showIcon
          message={t("mcpSettings.modal.validation.idle")}
        />
      )
    }

    if (isValidationStale) {
      return (
        <Alert
          type="warning"
          showIcon
          message={t("mcpSettings.modal.validation.stale")}
        />
      )
    }

    if (validationSnapshot.toolsSyncError) {
      return (
        <Alert
          type="error"
          showIcon
          message={t("mcpSettings.modal.validation.failed")}
          description={validationSnapshot.toolsSyncError}
        />
      )
    }

    return (
      <Alert
        type="success"
        showIcon
        message={t("mcpSettings.modal.validation.success", {
          count: validationSnapshot.cachedTools.length
        })}
        description={
          validationSnapshot.toolsLastSyncedAt
            ? t("mcpSettings.modal.validation.syncedAt", {
                value: formatTimestamp(validationSnapshot.toolsLastSyncedAt)
              })
            : undefined
        }
      />
    )
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="px-2 sm:px-0">
        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
                {t("mcpSettings.heading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                {t("mcpSettings.subheading")}
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-black px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-800 focus:outline-none dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 disabled:opacity-50">
              {t("mcpSettings.addBtn")}
            </button>
          </div>
          <div className="mt-4 border border-b border-gray-200 dark:border-gray-600"></div>
        </div>

        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={servers || []}
          bordered
          scroll={{ x: 980 }}
          columns={[
            {
              title: t("mcpSettings.table.name"),
              dataIndex: "name",
              key: "name"
            },
            {
              title: t("mcpSettings.table.url"),
              dataIndex: "url",
              key: "url",
              width: 200,
              render: (value: string) => (
                <span className="block max-w-[180px] truncate" title={value}>
                  {value}
                </span>
              )
            },

            {
              title: t("mcpSettings.table.auth"),
              dataIndex: "authType",
              key: "authType",
              render: (value: string, record: McpServer) =>
                value === "bearer" ? (
                  <Tooltip title={record.bearerToken ? "••••••••" : ""}>
                    <span>{t("mcpSettings.auth.bearer")}</span>
                  </Tooltip>
                ) : (
                  t("mcpSettings.auth.none")
                )
            },
            {
              title: t("mcpSettings.table.actions"),
              key: "actions",
              render: (_, record: McpServer) => (
                <div className="flex items-center gap-3">
                  <Tooltip
                    title={
                      record.enabled
                        ? t("mcpSettings.actions.disable")
                        : t("mcpSettings.actions.enable")
                    }>
                    <Switch
                      size="small"
                      checked={record.enabled}
                      onChange={(checked) =>
                        updateMcpServer({
                          id: record.id,
                          enabled: checked
                        }).then(() =>
                          queryClient.invalidateQueries({
                            queryKey: ["mcpServers"]
                          })
                        )
                      }
                    />
                  </Tooltip>
                  <Tooltip title={t("mcpSettings.actions.refreshTools")}>
                    <button
                      className="p-1 text-gray-700 dark:text-gray-400"
                      disabled={isFireFoxPrivateMode}
                      onClick={() => refreshToolsMutation.mutate(record)}>
                      <RefreshCw
                        className={`size-4 ${
                          refreshToolsMutation.isPending &&
                          refreshToolsMutation.variables?.id === record.id
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                    </button>
                  </Tooltip>
                  <Tooltip title={t("common:edit")}>
                    <button
                      className="p-1 text-gray-700 dark:text-gray-400"
                      disabled={isFireFoxPrivateMode}
                      onClick={() => handleEdit(record)}>
                      <Pencil className="size-4" />
                    </button>
                  </Tooltip>
                  <Tooltip title={t("common:delete")}>
                    <button
                      className="p-1 text-red-500 dark:text-red-400"
                      disabled={isFireFoxPrivateMode}
                      onClick={() => {
                        if (
                          confirm(
                            t("mcpSettings.modal.deleteConfirm", {
                              name: record.name
                            })
                          )
                        ) {
                          deleteMutation.mutate(record.id)
                        }
                      }}>
                      <Trash2 className="size-4" />
                    </button>
                  </Tooltip>
                </div>
              )
            }
          ]}
        />

        <Modal
          open={open}
          title={
            editingServer
              ? t("mcpSettings.modal.titleEdit")
              : t("mcpSettings.modal.titleAdd")
          }
          onCancel={closeModal}
          footer={null}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              enabled: true,
              authType: "none",
              headers: []
            }}>
            <Form.Item
              name="name"
              label={t("mcpSettings.modal.name.label")}
              rules={[
                {
                  required: true,
                  message: t("mcpSettings.modal.name.required")
                }
              ]}>
              <Input
                size="large"
                placeholder={t("mcpSettings.modal.name.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="url"
              label={t("mcpSettings.modal.url.label")}
              extra={t("mcpSettings.modal.transportNotice.description")}
              rules={[
                {
                  required: true,
                  message: t("mcpSettings.modal.url.required")
                },
                {
                  validator: async (_, value) => {
                    try {
                      const parsed = new URL(value)
                      if (!["http:", "https:"].includes(parsed.protocol)) {
                        throw new Error()
                      }
                    } catch (error) {
                      throw new Error(t("mcpSettings.modal.url.invalid"))
                    }
                  }
                }
              ]}>
              <Input
                size="large"
                placeholder={t("mcpSettings.modal.url.placeholder")}
              />
            </Form.Item>

            <Form.Item
              name="authType"
              label={t("mcpSettings.modal.auth.label")}>
              <Select
                size="large"
                options={[
                  {
                    label: t("mcpSettings.auth.none"),
                    value: "none"
                  },
                  {
                    label: t("mcpSettings.auth.bearer"),
                    value: "bearer"
                  }
                ]}
              />
            </Form.Item>

            {authType === "bearer" ? (
              <Form.Item
                name="bearerToken"
                label={t("mcpSettings.modal.bearerToken.label")}
                rules={[
                  {
                    required: true,
                    message: t("mcpSettings.modal.bearerToken.required")
                  }
                ]}>
                <Input.Password
                  size="large"
                  placeholder={t("mcpSettings.modal.bearerToken.placeholder")}
                />
              </Form.Item>
            ) : null}

            <Form.Item
              name="enabled"
              label={t("mcpSettings.modal.enabled.label")}
              valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.List name="headers">
              {(fields, { add, remove }) => (
                <div className="flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {t("mcpSettings.modal.headers.label")}
                    </h3>
                    <button
                      type="button"
                      className="rounded-md bg-black px-2 py-1 text-xs text-white dark:bg-white dark:text-black"
                      onClick={() => add()}>
                      {t("mcpSettings.modal.headers.add")}
                    </button>
                  </div>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-end">
                      <div className="w-full space-y-2 sm:flex sm:space-x-2 sm:space-y-0">
                        <Form.Item
                          label={t("mcpSettings.modal.headers.key.label")}
                          name={[field.name, "key"]}
                          className="mb-0 flex-1">
                          <Input
                            placeholder={t(
                              "mcpSettings.modal.headers.key.placeholder"
                            )}
                          />
                        </Form.Item>
                        <Form.Item
                          label={t("mcpSettings.modal.headers.value.label")}
                          name={[field.name, "value"]}
                          className="mb-0 flex-1">
                          <Input
                            placeholder={t(
                              "mcpSettings.modal.headers.value.placeholder"
                            )}
                          />
                        </Form.Item>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 p-1 text-red-500 dark:text-red-400"
                        onClick={() => remove(field.name)}>
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Form.List>

            <button
              type="submit"
              disabled={
                addMutation.isPending ||
                updateMutation.isPending ||
                validateMutation.isPending
              }
              className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-black px-2 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
              {editingServer
                ? t("mcpSettings.modal.update")
                : t("mcpSettings.modal.submit")}
            </button>

            {!isValidationFresh ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {t("mcpSettings.modal.validation.saveHint")}
              </p>
            ) : null}
          </Form>
        </Modal>
      </div>
    </div>
  )
}
