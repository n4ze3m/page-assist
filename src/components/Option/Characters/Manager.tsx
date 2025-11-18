import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Form, Input, Modal, Skeleton, Table, Tag, Tooltip, notification } from "antd"
import React from "react"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { Pen, Trash2, UserCircle2, MessageCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { confirmDanger } from "@/components/Common/confirm-danger"
import { useNavigate } from "react-router-dom"
import { useStorage } from "@plasmohq/storage/hook"

export const CharactersManager: React.FC = () => {
  const { t } = useTranslation(["settings", "common"])
  const qc = useQueryClient()
  const navigate = useNavigate()
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
        notification.error({ message: t("managePrompts.notification.error"), description: e?.message || t("managePrompts.notification.someError") })
        return []
      }
    }
  })

  const { mutate: createCharacter, isPending: creating } = useMutation({
    mutationFn: async (values: any) => tldwClient.createCharacter(values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tldw:listCharacters"] })
      setOpen(false)
      createForm.resetFields()
      notification.success({ message: t("managePrompts.notification.addSuccess") })
    },
    onError: (e: any) => notification.error({ message: t("managePrompts.notification.error"), description: e?.message || t("managePrompts.notification.someError") })
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
      notification.success({ message: t("managePrompts.notification.updatedSuccess") })
    },
    onError: (e: any) => notification.error({ message: t("managePrompts.notification.error"), description: e?.message || t("managePrompts.notification.someError") })
  })

  const { mutate: deleteCharacter, isPending: deleting } = useMutation({
    mutationFn: async (id: string) => tldwClient.deleteCharacter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tldw:listCharacters"] })
      notification.success({ message: t("managePrompts.notification.deletedSuccess") })
    },
    onError: (e: any) => notification.error({ message: t("managePrompts.notification.error"), description: e?.message || t("managePrompts.notification.someError") })
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={() => setOpen(true)}>{t('managePrompts.addBtn')}</Button>
      </div>
      {status === 'pending' && <Skeleton active paragraph={{ rows: 6 }} />}
      {status === 'success' && (
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
            { title: t('managePrompts.columns.title'), dataIndex: 'name', key: 'name' },
            { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string) => <span className="line-clamp-1">{v}</span> },
            {
              title: t('managePrompts.tags.label', { defaultValue: 'Tags' }),
              dataIndex: 'tags',
              key: 'tags',
              render: (tags: string[]) => (
                <div className="flex flex-wrap gap-1">
                  {(tags || []).map((tag: string) => <Tag key={tag}>{tag}</Tag>)}
                </div>
              )
            },
            {
              title: t('managePrompts.columns.actions'),
              key: 'actions',
              render: (_: any, record: any) => (
                <div className="flex gap-3">
                  <Tooltip title={t('managePrompts.tooltip.edit')}>
                    <button
                      className="text-gray-500"
                      onClick={() => {
                        setEditId(record.id || record.slug || record.name)
                        setEditVersion(record?.version ?? null)
                        editForm.setFieldsValue({
                          name: record.name,
                          description: record.description,
                          system_prompt: record.system_prompt
                        })
                        setOpenEdit(true)
                      }}>
                      <Pen className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip title={t('managePrompts.tooltip.delete')}>
                    <button
                      className="text-red-500"
                      disabled={deleting}
                      onClick={async () => {
                        const ok = await confirmDanger({
                          title: t("common:confirmTitle", {
                            defaultValue: "Please confirm"
                          }),
                          content: t("managePrompts.confirm.delete"),
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
                      className="text-gray-500"
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

      <Modal title={t('managePrompts.modal.addTitle')} open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form layout="vertical" form={createForm} onFinish={(v) => createCharacter(v)}>
          <Form.Item name="name" label={t('managePrompts.form.title.label')} rules={[{ required: true, message: t('managePrompts.form.title.required') }]}>
            <Input placeholder={t('managePrompts.form.title.placeholder')} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Short description" />
          </Form.Item>
          <Form.Item name="system_prompt" label={t('managePrompts.systemPrompt')}>
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={creating} className="w-full">{t('managePrompts.form.btnSave.save')}</Button>
        </Form>
      </Modal>

      <Modal title={t('managePrompts.modal.editTitle')} open={openEdit} onCancel={() => setOpenEdit(false)} footer={null}>
        <Form layout="vertical" form={editForm} onFinish={(v) => updateCharacter(v)}>
          <Form.Item name="name" label={t('managePrompts.form.title.label')} rules={[{ required: true, message: t('managePrompts.form.title.required') }]}>
            <Input placeholder={t('managePrompts.form.title.placeholder')} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Short description" />
          </Form.Item>
          <Form.Item name="system_prompt" label={t('managePrompts.systemPrompt')}>
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={updating} className="w-full">{t('managePrompts.form.btnEdit.save')}</Button>
        </Form>
      </Modal>
    </div>
  )
}
