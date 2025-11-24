import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Form, Input, Modal, Skeleton, Table, Tag, Tooltip, Select, Alert } from "antd"
import type { InputRef } from "antd"
import React from "react"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { Pen, Trash2, UserCircle2, MessageCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { confirmDanger } from "@/components/Common/confirm-danger"
import { useNavigate } from "react-router-dom"
import { useStorage } from "@plasmohq/storage/hook"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useAntdNotification } from "@/hooks/useAntdNotification"

const MAX_NAME_LENGTH = 75
const MAX_DESCRIPTION_LENGTH = 65
const MAX_TAG_LENGTH = 20
const MAX_TAGS_DISPLAYED = 6
const BASE64_IMAGE_PATTERN =
  /^(?:[A-Za-z0-9+/_-]{4})*(?:[A-Za-z0-9+/_-]{2}==|[A-Za-z0-9+/_-]{3}=)?$/
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/gif"])

const truncateText = (value?: string, max?: number) => {
  if (!value) return ""
  if (!max || value.length <= max) return value
  return `${value.slice(0, max)}...`
}

const detectImageMime = (bytes: Uint8Array): string | null => {
  const isPng =
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  if (isPng) return "image/png"

  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  if (isJpeg) return "image/jpeg"

  const isGif =
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x39 || bytes[4] === 0x37) &&
    bytes[5] === 0x61
  if (isGif) return "image/gif"

  return null
}

const decodeBase64Header = (value: string): Uint8Array | null => {
  if (typeof atob !== "function") return null

  try {
    const decoded = atob(value.slice(0, Math.min(value.length, 128)))
    const headerBytes = new Uint8Array(Math.min(decoded.length, 32))
    for (let i = 0; i < headerBytes.length; i += 1) {
      headerBytes[i] = decoded.charCodeAt(i)
    }
    return headerBytes
  } catch {
    return null
  }
}

/**
 * Lightweight client-side guard: only allows rendering known raster formats.
 * Server-side validation should enforce allowable avatar uploads.
 */
const validateAndCreateImageDataUrl = (value: unknown): string => {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase().startsWith("data:")) return ""
  if (!BASE64_IMAGE_PATTERN.test(trimmed)) return ""

  const headerBytes = decodeBase64Header(trimmed)
  if (!headerBytes) return ""

  const mime = detectImageMime(headerBytes)
  if (!mime || !ALLOWED_IMAGE_MIME_TYPES.has(mime)) return ""

  return `data:${mime};base64,${trimmed}`
}

export const CharactersManager: React.FC = () => {
  const { t } = useTranslation(["settings", "common"])
  const qc = useQueryClient()
  const navigate = useNavigate()
  const notification = useAntdNotification()
  const [open, setOpen] = React.useState(false)
  const [openEdit, setOpenEdit] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [editVersion, setEditVersion] = React.useState<number | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [, setSelectedCharacter] = useStorage<any>("selectedCharacter", null)
  const newButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const lastEditTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const createNameRef = React.useRef<InputRef>(null)
  const editNameRef = React.useRef<InputRef>(null)

  const {
    data,
    status,
    error,
    refetch
  } = useQuery({
    queryKey: ["tldw:listCharacters"],
    queryFn: async () => {
      try {
        await tldwClient.initialize()
        const list = await tldwClient.listCharacters()
        return Array.isArray(list) ? list : []
      } catch (e: any) {
        notification.error({
          message: t("settings:manageCharacters.notification.error", {
            defaultValue: "Error"
          }),
          description:
            e?.message ||
            t("settings:manageCharacters.notification.someError", {
              defaultValue: "Something went wrong. Please try again later"
            })
        })
        throw e
      }
    }
  })

  const allTags = React.useMemo(() => {
    const set = new Set<string>()
    ;(data || []).forEach((c: any) =>
      (c?.tags || []).forEach((tag: string) => set.add(tag))
    )
    return Array.from(set.values())
  }, [data])

  const { mutate: createCharacter, isPending: creating } = useMutation({
    mutationFn: async (values: any) => tldwClient.createCharacter(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tldw:listCharacters"] })
      setOpen(false)
      createForm.resetFields()
      notification.success({
        message: t("settings:manageCharacters.notification.addSuccess", {
          defaultValue: "Character created"
        })
      })
      setTimeout(() => {
        newButtonRef.current?.focus()
      }, 0)
    },
    onError: (e: any) =>
      notification.error({
        message: t("settings:manageCharacters.notification.error", {
          defaultValue: "Error"
        }),
        description:
          e?.message ||
          t("settings:manageCharacters.notification.someError", {
            defaultValue: "Something went wrong. Please try again later"
          })
      })
  })
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        createNameRef.current?.focus()
      }, 0)
    }
  }, [open])

  React.useEffect(() => {
    if (openEdit) {
      setTimeout(() => {
        editNameRef.current?.focus()
      }, 0)
    }
  }, [openEdit])

  const { mutate: updateCharacter, isPending: updating } = useMutation({
    mutationFn: async (values: any) => {
      if (!editId) return
      return await tldwClient.updateCharacter(editId, values, editVersion ?? undefined)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tldw:listCharacters"] })
      setOpenEdit(false)
      editForm.resetFields()
      setEditId(null)
      notification.success({
        message: t("settings:manageCharacters.notification.updatedSuccess", {
          defaultValue: "Character updated"
        })
      })
      setTimeout(() => {
        lastEditTriggerRef.current?.focus()
      }, 0)
    },
    onError: (e: any) =>
      notification.error({
        message: t("settings:manageCharacters.notification.error", {
          defaultValue: "Error"
        }),
        description:
          e?.message ||
          t("settings:manageCharacters.notification.someError", {
            defaultValue: "Something went wrong. Please try again later"
          })
      })
  })

  const { mutate: deleteCharacter, isPending: deleting } = useMutation({
    mutationFn: async (id: string) => tldwClient.deleteCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tldw:listCharacters"] })
      notification.success({
        message: t("settings:manageCharacters.notification.deletedSuccess", {
          defaultValue: "Character deleted"
        })
      })
    },
    onError: (e: any) =>
      notification.error({
        message: t("settings:manageCharacters.notification.error", {
          defaultValue: "Error"
        }),
        description:
          e?.message ||
          t("settings:manageCharacters.notification.someError", {
            defaultValue: "Something went wrong. Please try again later"
          })
      })
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="primary"
          ref={newButtonRef}
          onClick={() => setOpen(true)}>
          {t("settings:manageCharacters.addBtn", { defaultValue: "New character" })}
        </Button>
      </div>
      {status === "error" && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-400/40 dark:bg-red-500/10">
          <Alert
            type="error"
            message={t("settings:manageCharacters.loadError.title", {
              defaultValue: "Couldn't load characters"
            })}
            description={
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-red-700 dark:text-red-200">
                  {(error as any)?.message ||
                    t("settings:manageCharacters.loadError.description", {
                      defaultValue: "Check your connection and try again."
                    })}
                </span>
                <Button size="small" onClick={() => refetch()}>
                  {t("common:retry", { defaultValue: "Retry" })}
                </Button>
              </div>
            }
            showIcon
            className="border-0 bg-transparent p-0"
          />
        </div>
      )}
      {status === "pending" && <Skeleton active paragraph={{ rows: 6 }} />}
      {status === "success" && Array.isArray(data) && data.length === 0 && (
        <FeatureEmptyState
          title={t("settings:manageCharacters.emptyTitle", {
            defaultValue: "No characters yet"
          })}
          description={t("settings:manageCharacters.emptyDescription", {
            defaultValue:
              "Create a reusable character with a name, description, and system prompt you can chat with."
          })}
          primaryActionLabel={t("settings:manageCharacters.emptyPrimaryCta", {
            defaultValue: "Create character"
          })}
          onPrimaryAction={() => setOpen(true)}
        />
      )}
      {status === "success" && Array.isArray(data) && data.length > 0 && (
        <Table
          rowKey={(r: any) => r.id || r.slug || r.name}
          dataSource={data}
          columns={[
            {
              title: "",
              key: "avatar",
              width: 48,
              render: (_: any, record: any) =>
                record?.avatar_url ? (
                  <img
                    src={record.avatar_url}
                    className="w-6 h-6 rounded-full"
                    alt={
                      record?.name
                        ? `Avatar of ${record.name}`
                        : "User avatar"
                    }
                  />
                ) : (
                  <UserCircle2 className="w-5 h-5" />
                )
            },
            {
              title: t("settings:manageCharacters.columns.name", {
                defaultValue: "Name"
              }),
              dataIndex: "name",
              key: "name",
              render: (v: string) => (
                <span className="line-clamp-1">
                  {truncateText(v, MAX_NAME_LENGTH)}
                </span>
              )
            },
            {
              title: t("settings:manageCharacters.columns.description", {
                defaultValue: "Description"
              }),
              dataIndex: "description",
              key: "description",
              render: (v: string) => (
                <span className="line-clamp-1">
                  {truncateText(v, MAX_DESCRIPTION_LENGTH)}
                </span>
              )
            },
            {
              title: t("settings:manageCharacters.tags.label", {
                defaultValue: "Tags"
              }),
              dataIndex: "tags",
              key: "tags",
              render: (tags: string[]) => {
                const all = tags || []
                const visible = all.slice(0, MAX_TAGS_DISPLAYED)
                const hasMore = all.length > MAX_TAGS_DISPLAYED
                return (
                  <div className="flex flex-wrap gap-1">
                    {visible.map((tag: string, index: number) => (
                      <Tag key={`${tag}-${index}`}>
                        {truncateText(tag, MAX_TAG_LENGTH)}
                      </Tag>
                    ))}
                    {hasMore && <span>...</span>}
                  </div>
                )
              }
            },
            {
              title: t("settings:manageCharacters.columns.actions", {
                defaultValue: "Actions"
              }),
              key: "actions",
              render: (_: any, record: any) => {
                const chatLabel = t("settings:manageCharacters.actions.chat", {
                  defaultValue: "Chat"
                })
                const editLabel = t(
                  "settings:manageCharacters.actions.edit",
                  {
                    defaultValue: "Edit"
                  }
                )
                const deleteLabel = t(
                  "settings:manageCharacters.actions.delete",
                  {
                    defaultValue: "Delete"
                  }
                )
                const name = record?.name || record?.title || record?.slug || ""
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip
                      title={chatLabel}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-blue-600 transition hover:border-blue-100 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:border-blue-300/40 dark:hover:bg-blue-500/10"
                        aria-label={t("settings:manageCharacters.aria.chatWith", {
                          defaultValue: "Chat as {{name}}",
                          name
                        })}
                        onClick={() => {
                          const id = record.id || record.slug || record.name
                          setSelectedCharacter({
                            id,
                            name: record.name || record.title || record.slug,
                            system_prompt:
                              record.system_prompt ||
                              record.systemPrompt ||
                              record.instructions ||
                              "",
                            greeting:
                            record.greeting ||
                            record.first_message ||
                            record.greet ||
                            "",
                            avatar_url:
                              record.avatar_url ||
                              validateAndCreateImageDataUrl(record.image_base64) ||
                              ""
                          })
                          navigate("/")
                        }}>
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-medium">
                          {chatLabel}
                        </span>
                      </button>
                    </Tooltip>
                    <Tooltip
                      title={editLabel}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-gray-600 transition hover:border-gray-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-[#1f1f1f]"
                        aria-label={t("settings:manageCharacters.aria.edit", {
                          defaultValue: "Edit character {{name}}",
                          name
                        })}
                        onClick={(e) => {
                          lastEditTriggerRef.current = e.currentTarget
                          setEditId(record.id || record.slug || record.name)
                          setEditVersion(record?.version ?? null)
                          editForm.setFieldsValue({
                            name: record.name,
                            description: record.description,
                            avatar_url: record.avatar_url,
                          tags: record.tags,
                          greeting: record.greeting || record.first_message || record.greet,
                          system_prompt: record.system_prompt
                        })
                        setOpenEdit(true)
                      }}>
                        <Pen className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-medium">
                          {editLabel}
                        </span>
                      </button>
                    </Tooltip>
                    <Tooltip
                      title={deleteLabel}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-red-600 transition hover:border-red-100 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:border-red-300/40 dark:hover:bg-red-500/10"
                        aria-label={t("settings:manageCharacters.aria.delete", {
                          defaultValue: "Delete character {{name}}",
                          name
                        })}
                        disabled={deleting}
                        onClick={async () => {
                          const ok = await confirmDanger({
                            title: t("common:confirmTitle", {
                              defaultValue: "Please confirm"
                            }),
                            content: t(
                              "settings:manageCharacters.confirm.delete",
                              {
                                defaultValue:
                                  "Are you sure you want to delete this character? This action cannot be undone."
                              }
                            ),
                            okText: t("common:delete", { defaultValue: "Delete" }),
                            cancelText: t("common:cancel", {
                              defaultValue: "Cancel"
                            })
                          })
                          if (ok) {
                            deleteCharacter(record.id || record.slug || record.name)
                          }
                        }}>
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-medium">
                          {deleteLabel}
                        </span>
                      </button>
                    </Tooltip>
                  </div>
                )
              }
            }
          ]}
        />
      )}

      <Modal
        title={t("settings:manageCharacters.modal.addTitle", {
          defaultValue: "New character"
        })}
        open={open}
        onCancel={() => {
          setOpen(false)
          createForm.resetFields()
          setTimeout(() => {
            newButtonRef.current?.focus()
          }, 0)
        }}
        footer={null}>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t("settings:manageCharacters.modal.description", {
            defaultValue: "Define a reusable character you can chat with in the sidebar."
          })}
        </p>
        <Form
          layout="vertical"
          form={createForm}
          className="space-y-3"
          onFinish={(v) => createCharacter(v)}>
          <Form.Item
            name="name"
            label={t("settings:manageCharacters.form.name.label", {
              defaultValue: "Name"
            })}
            rules={[
              {
                required: true,
                message: t(
                  "settings:manageCharacters.form.name.required",
                  { defaultValue: "Please enter a name" }
                )
              }
            ]}>
            <Input
              ref={createNameRef}
              placeholder={t(
                "settings:manageCharacters.form.name.placeholder",
                { defaultValue: "e.g. Writing coach" }
              )}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("settings:manageCharacters.form.description.label", {
              defaultValue: "Description"
            })}>
            <Input
              placeholder={t(
                "settings:manageCharacters.form.description.placeholder",
                { defaultValue: "Short description" }
              )}
            />
          </Form.Item>
          <Form.Item
            name="avatar_url"
            label={t("settings:manageCharacters.form.avatarUrl.label", {
              defaultValue: "Avatar URL (optional)"
            })}>
            <Input
              placeholder={t(
                "settings:manageCharacters.form.avatarUrl.placeholder",
                { defaultValue: "https://example.com/avatar.png" }
              )}
            />
          </Form.Item>
          <Form.Item
            name="tags"
            label={t("settings:manageCharacters.tags.label", {
              defaultValue: "Tags"
            })}
            help={t("settings:manageCharacters.tags.help", {
              defaultValue:
                "Use tags to group characters by use case (e.g., “writing”, “teaching”)."
            })}>
            <Select
              mode="tags"
              allowClear
              placeholder={t(
                "settings:manageCharacters.tags.placeholder",
                {
                  defaultValue: "Add tags"
                }
              )}
              options={allTags.map((tag) => ({ label: tag, value: tag }))}
            />
          </Form.Item>
          <Form.Item
            name="greeting"
            label={t("settings:manageCharacters.form.greeting.label", {
              defaultValue: "Greeting message (optional)"
            })}
            help={t("settings:manageCharacters.form.greeting.help", {
              defaultValue:
                "Optional first message the character will send when you start a chat."
            })}>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder={t(
                "settings:manageCharacters.form.greeting.placeholder",
                {
                  defaultValue:
                    "Hi there! I’m your writing coach. Paste your draft and I’ll help you tighten it up."
                }
              )}
              showCount
              maxLength={240}
            />
          </Form.Item>
          <Form.Item
            name="system_prompt"
            label={t(
              "settings:manageCharacters.form.systemPrompt.label",
              { defaultValue: "Behavior / instructions" }
            )}
            help={t(
              "settings:manageCharacters.form.systemPrompt.help",
              {
                defaultValue:
                  "Describe how this character should respond, including role, tone, and constraints."
              }
            )}
            rules={[
              {
                min: 10,
                message: t(
                  "settings:manageCharacters.form.systemPrompt.min",
                  {
                    defaultValue:
                      "Add a short description so the character knows how to respond."
                  }
                )
              }
            ]}>
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 8 }}
              showCount
              maxLength={2000}
              placeholder={t(
                "settings:manageCharacters.form.systemPrompt.placeholder",
                {
                  defaultValue:
                    "E.g., You are a patient math teacher who explains concepts step by step and checks understanding with short examples."
                }
              )}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={creating}
            className="w-full">
            {creating
              ? t("settings:manageCharacters.form.btnSave.saving", {
                  defaultValue: "Creating character..."
                })
              : t("settings:manageCharacters.form.btnSave.save", {
                  defaultValue: "Create character"
                })}
          </Button>
        </Form>
      </Modal>

      <Modal
        title={t("settings:manageCharacters.modal.editTitle", {
          defaultValue: "Edit character"
        })}
        open={openEdit}
        onCancel={() => {
          setOpenEdit(false)
          editForm.resetFields()
          setEditId(null)
          setEditVersion(null)
          setTimeout(() => {
            lastEditTriggerRef.current?.focus()
          }, 0)
        }}
        footer={null}>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t("settings:manageCharacters.modal.description", {
            defaultValue: "Define a reusable character you can chat with in the sidebar."
          })}
        </p>
        <Form
          layout="vertical"
          form={editForm}
          className="space-y-3"
          onFinish={(v) => updateCharacter(v)}>
          <Form.Item
            name="name"
            label={t("settings:manageCharacters.form.name.label", {
              defaultValue: "Name"
            })}
            rules={[
              {
                required: true,
                message: t(
                  "settings:manageCharacters.form.name.required",
                  { defaultValue: "Please enter a name" }
                )
              }
            ]}>
            <Input
              ref={editNameRef}
              placeholder={t(
                "settings:manageCharacters.form.name.placeholder",
                { defaultValue: "e.g. Writing coach" }
              )}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label={t("settings:manageCharacters.form.description.label", {
              defaultValue: "Description"
            })}>
            <Input
              placeholder={t(
                "settings:manageCharacters.form.description.placeholder",
                { defaultValue: "Short description" }
              )}
            />
          </Form.Item>
          <Form.Item
            name="avatar_url"
            label={t("settings:manageCharacters.form.avatarUrl.label", {
              defaultValue: "Avatar URL (optional)"
            })}>
            <Input
              placeholder={t(
                "settings:manageCharacters.form.avatarUrl.placeholder",
                { defaultValue: "https://example.com/avatar.png" }
              )}
            />
          </Form.Item>
          <Form.Item
            name="tags"
            label={t("settings:manageCharacters.tags.label", {
              defaultValue: "Tags"
            })}
            help={t("settings:manageCharacters.tags.help", {
              defaultValue:
                "Use tags to group characters by use case (e.g., “writing”, “teaching”)."
            })}>
            <Select
              mode="tags"
              allowClear
              placeholder={t(
                "settings:manageCharacters.tags.placeholder",
                {
                  defaultValue: "Add tags"
                }
              )}
              options={allTags.map((tag) => ({ label: tag, value: tag }))}
            />
          </Form.Item>
          <Form.Item
            name="greeting"
            label={t("settings:manageCharacters.form.greeting.label", {
              defaultValue: "Greeting message (optional)"
            })}
            help={t("settings:manageCharacters.form.greeting.help", {
              defaultValue:
                "Optional first message the character will send when you start a chat."
            })}>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder={t(
                "settings:manageCharacters.form.greeting.placeholder",
                {
                  defaultValue:
                    "Hi there! I’m your writing coach. Paste your draft and I’ll help you tighten it up."
                }
              )}
              showCount
              maxLength={240}
            />
          </Form.Item>
          <Form.Item
            name="system_prompt"
            label={t(
              "settings:manageCharacters.form.systemPrompt.label",
              { defaultValue: "Behavior / instructions" }
            )}
            help={t(
              "settings:manageCharacters.form.systemPrompt.help",
              {
                defaultValue:
                  "Describe how this character should respond, including role, tone, and constraints."
              }
            )}
            rules={[
              {
                min: 10,
                message: t(
                  "settings:manageCharacters.form.systemPrompt.min",
                  {
                    defaultValue:
                      "Add a short description so the character knows how to respond."
                  }
                )
              }
            ]}>
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 8 }}
              showCount
              maxLength={2000}
              placeholder={t(
                "settings:manageCharacters.form.systemPrompt.placeholder",
                {
                  defaultValue:
                    "E.g., You are a patient math teacher who explains concepts step by step and checks understanding with short examples."
                }
              )}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={updating}
            className="w-full">
            {updating
              ? t("settings:manageCharacters.form.btnEdit.saving", {
                  defaultValue: "Saving changes..."
                })
              : t("settings:manageCharacters.form.btnEdit.save", {
                  defaultValue: "Save changes"
                })}
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
