import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Form, Input, Modal, Skeleton, Table, Tag, Tooltip, Select } from "antd"
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

const truncateText = (value?: string, max?: number) => {
  if (!value) return ""
  if (!max || value.length <= max) return value
  return `${value.slice(0, max)}...`
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

  const { data, status } = useQuery({
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
        return []
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
        <Button type="primary" onClick={() => setOpen(true)}>
          {t("settings:manageCharacters.addBtn", { defaultValue: "New character" })}
        </Button>
      </div>
      {status === 'pending' && <Skeleton active paragraph={{ rows: 6 }} />}
      {status === 'success' && Array.isArray(data) && data.length === 0 && (
        <FeatureEmptyState
          title={t("settings:manageCharacters.emptyTitle", {
            defaultValue: "No characters yet"
          })}
          description={t("settings:manageCharacters.emptyDescription", {
            defaultValue:
              "Create reusable characters with names, descriptions, and behaviors you can chat with."
          })}
          examples={[
            t("settings:manageCharacters.emptyExample1", {
              defaultValue:
                "Define a writing coach, lore expert, or coding assistant you can reuse across chats."
            }),
            t("settings:manageCharacters.emptyExample2", {
              defaultValue:
                "Give each character a clear description and behavior so their responses stay consistent."
            })
          ]}
          primaryActionLabel={t("settings:manageCharacters.emptyPrimaryCta", {
            defaultValue: "Create character"
          })}
          onPrimaryAction={() => setOpen(true)}
        />
      )}
      {status === 'success' && Array.isArray(data) && data.length > 0 && (
        <Table
          rowKey={(r: any) => r.id || r.slug || r.name}
          dataSource={data}
          columns={[
            {
              title: '',
              key: 'avatar',
              width: 48,
              render: (_: any, record: any) => record?.avatar_url ? (
                <img src={record.avatar_url} className="w-6 h-6 rounded-full" />
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
              title: t('managePrompts.tags.label', { defaultValue: 'Tags' }),
              dataIndex: 'tags',
              key: 'tags',
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
              key: 'actions',
              render: (_: any, record: any) => (
                <div className="flex gap-3">
                  <Tooltip
                    title={t("settings:manageCharacters.tooltip.edit", {
                      defaultValue: "Edit character"
                    })}>
                    <button
                      type="button"
                      className="text-gray-500"
                      aria-label={t("settings:manageCharacters.tooltip.edit", {
                        defaultValue: "Edit character"
                      })}
                      onClick={() => {
                        setEditId(record.id || record.slug || record.name)
                        setEditVersion(record?.version ?? null)
                        editForm.setFieldsValue({
                          name: record.name,
                          description: record.description,
                          avatar_url: record.avatar_url,
                          tags: record.tags,
                          system_prompt: record.system_prompt
                        })
                        setOpenEdit(true)
                      }}>
                      <Pen className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip
                    title={t("settings:manageCharacters.tooltip.delete", {
                      defaultValue: "Delete character"
                    })}>
                    <button
                      type="button"
                      className="text-red-500"
                      aria-label={t("settings:manageCharacters.tooltip.delete", {
                        defaultValue: "Delete character"
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
                    </button>
                  </Tooltip>
                  <Tooltip
                    title={t("common:chatWithCharacter", {
                      defaultValue: "Chat with character"
                    })}>
                    <button
                      type="button"
                      className="text-gray-500"
                      aria-label={t("common:chatWithCharacter", {
                        defaultValue: "Chat with character"
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
                            (record.image_base64
                              ? `data:image/png;base64,${record.image_base64}`
                              : "")
                        })
                        navigate("/")
                      }}>
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              )
            }
          ]}
        />
      )}

      <Modal
        title={t("settings:manageCharacters.modal.addTitle", {
          defaultValue: "New character"
        })}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}>
        <Form layout="vertical" form={createForm} onFinish={(v) => createCharacter(v)}>
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
            label={t("managePrompts.tags.label", { defaultValue: "Tags" })}>
            <Select
              mode="tags"
              allowClear
              placeholder={t("managePrompts.tags.placeholder", {
                defaultValue: "Add tags"
              })}
              options={allTags.map((tag) => ({ label: tag, value: tag }))}
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
            )}>
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
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
        onCancel={() => setOpenEdit(false)}
        footer={null}>
        <Form layout="vertical" form={editForm} onFinish={(v) => updateCharacter(v)}>
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
            label={t("managePrompts.tags.label", { defaultValue: "Tags" })}>
            <Select
              mode="tags"
              allowClear
              placeholder={t("managePrompts.tags.placeholder", {
                defaultValue: "Add tags"
              })}
              options={allTags.map((tag) => ({ label: tag, value: tag }))}
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
            )}>
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
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
