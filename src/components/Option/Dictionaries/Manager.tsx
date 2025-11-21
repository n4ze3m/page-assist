import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, Form, Input, Modal, Skeleton, Switch, Table, Tooltip, Tag, InputNumber, Select, Descriptions } from "antd"
import { useTranslation } from "react-i18next"
import React from "react"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { Pen, Trash2, Book } from "lucide-react"
import { confirmDanger } from "@/components/Common/confirm-danger"
import { useServerOnline } from "@/hooks/useServerOnline"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useServerCapabilities } from "@/hooks/useServerCapabilities"
import { useAntdNotification } from "@/hooks/useAntdNotification"

export const DictionariesManager: React.FC = () => {
  const { t } = useTranslation(["common", "option"])
  const isOnline = useServerOnline()
  const qc = useQueryClient()
  const notification = useAntdNotification()
  const [open, setOpen] = React.useState(false)
  const [openEdit, setOpenEdit] = React.useState(false)
  const [openEntries, setOpenEntries] = React.useState<null | number>(null)
  const [editId, setEditId] = React.useState<number | null>(null)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [entryForm] = Form.useForm()
  const [openImport, setOpenImport] = React.useState(false)
  const [activateOnImport, setActivateOnImport] = React.useState(false)
  const [statsFor, setStatsFor] = React.useState<any | null>(null)
  const { capabilities, loading: capsLoading } = useServerCapabilities()

  const { data, status } = useQuery({
    queryKey: ['tldw:listDictionaries'],
    queryFn: async () => {
      await tldwClient.initialize()
      const res = await tldwClient.listDictionaries(false)
      return res?.dictionaries || []
    },
    enabled: isOnline
  })

  const { mutate: createDict, isPending: creating } = useMutation({
    mutationFn: (v: any) => tldwClient.createDictionary(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tldw:listDictionaries'] }); setOpen(false); createForm.resetFields() },
    onError: (e: any) => notification.error({ message: 'Error', description: e?.message || 'Failed to create dictionary' })
  })
  const { mutate: updateDict, isPending: updating } = useMutation({
    mutationFn: (v: any) => editId != null ? tldwClient.updateDictionary(editId, v) : Promise.resolve(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tldw:listDictionaries'] }); setOpenEdit(false); editForm.resetFields(); setEditId(null) },
    onError: (e: any) => notification.error({ message: 'Error', description: e?.message || 'Failed to update dictionary' })
  })
  const { mutate: deleteDict } = useMutation({
    mutationFn: (id: number) => tldwClient.deleteDictionary(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tldw:listDictionaries'] })
  })
  const { mutate: importDict, isPending: importing } = useMutation({
    mutationFn: ({ data, activate }: any) => tldwClient.importDictionaryJSON(data, activate),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tldw:listDictionaries'] }); setOpenImport(false) },
    onError: (e: any) => notification.error({ message: 'Import failed', description: e?.message })
  })

  const dictionariesUnsupported =
    !capsLoading && capabilities && !capabilities.hasChatDictionaries

  const columns = [
    { title: '', key: 'icon', width: 40, render: () => <Book className="w-4 h-4" /> },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (v: string) => <span className="line-clamp-1">{v}</span> },
    { title: 'Active', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => v ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag> },
    { title: 'Entries', dataIndex: 'entry_count', key: 'entry_count' },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => (
      <div className="flex gap-3">
        <Tooltip title="Edit"><button className="text-gray-500" onClick={() => { setEditId(record.id); editForm.setFieldsValue(record); setOpenEdit(true) }}><Pen className="w-4 h-4" /></button></Tooltip>
        <Tooltip title="Manage Entries"><button className="text-gray-500" onClick={() => setOpenEntries(record.id)}>Entries</button></Tooltip>
        <Tooltip title="Export JSON"><button className="text-gray-500" onClick={async () => { try { const exp = await tldwClient.exportDictionaryJSON(record.id); const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${record.name || 'dictionary'}.json`; a.click(); URL.revokeObjectURL(url) } catch (e: any) { notification.error({ message: 'Export failed', description: e?.message }) } }}>Export JSON</button></Tooltip>
        <Tooltip title="Export Markdown"><button className="text-gray-500" onClick={async () => { try { const exp = await tldwClient.exportDictionaryMarkdown(record.id); const blob = new Blob([exp?.content || '' ], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${record.name || 'dictionary'}.md`; a.click(); URL.revokeObjectURL(url) } catch (e: any) { notification.error({ message: 'Export failed', description: e?.message }) } }}>Export MD</button></Tooltip>
        <Tooltip title="Statistics"><button className="text-gray-500" onClick={async () => { try { const s = await tldwClient.dictionaryStatistics(record.id); setStatsFor(s) } catch (e: any) { notification.error({ message: 'Stats failed', description: e?.message }) } }}>Stats</button></Tooltip>
        <Tooltip title="Delete"><button className="text-red-500" onClick={async () => { const ok = await confirmDanger({ title: t('common:confirmTitle', { defaultValue: 'Please confirm' }), content: 'Delete dictionary?', okText: t('common:delete', { defaultValue: 'Delete' }), cancelText: t('common:cancel', { defaultValue: 'Cancel' }) }); if (ok) deleteDict(record.id) }}><Trash2 className="w-4 h-4" /></button></Tooltip>
      </div>
    )}
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={() => setOpenImport(true)}>Import</Button>
        <Button type="primary" onClick={() => setOpen(true)}>New Dictionary</Button>
      </div>
      {status === 'pending' && <Skeleton active paragraph={{ rows: 6 }} />}
      {status === 'success' && dictionariesUnsupported && (
        <FeatureEmptyState
          title={t("option:dictionaries.offlineTitle", {
            defaultValue: "Chat dictionaries API not available on this server"
          })}
          description={t("option:dictionaries.offlineDescription", {
            defaultValue:
              "This tldw server does not advertise the /api/v1/chat/dictionaries endpoints. Upgrade your server to a version that includes chat dictionaries to use this workspace."
          })}
          primaryActionLabel={t("settings:healthSummary.diagnostics", {
            defaultValue: "Open Diagnostics"
          })}
          onPrimaryAction={() => {
            try {
              window.location.hash = "#/settings/health"
            } catch {}
          }}
        />
      )}
      {status === 'success' && !dictionariesUnsupported && (
        <Table rowKey={(r: any) => r.id} dataSource={data} columns={columns as any} />
      )}

      <Modal title="Create Dictionary" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form layout="vertical" form={createForm} onFinish={(v) => createDict(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" loading={creating} className="w-full">Create</Button>
        </Form>
      </Modal>

      <Modal title="Edit Dictionary" open={openEdit} onCancel={() => setOpenEdit(false)} footer={null}>
        <Form layout="vertical" form={editForm} onFinish={(v) => updateDict(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input /></Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked"><Switch /></Form.Item>
          <Button type="primary" htmlType="submit" loading={updating} className="w-full">Save</Button>
        </Form>
      </Modal>

      <Modal title="Manage Entries" open={!!openEntries} onCancel={() => setOpenEntries(null)} footer={null}>
        {openEntries && <DictionaryEntryManager dictionaryId={openEntries} form={entryForm} />}
      </Modal>
      <Modal title="Import Dictionary (JSON)" open={openImport} onCancel={() => setOpenImport(false)} footer={null}>
        <div className="space-y-3">
          <input type="file" accept="application/json" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const text = await file.text()
              const parsed = JSON.parse(text)
              await importDict({ data: parsed, activate: activateOnImport })
            } catch (err: any) {
              notification.error({ message: 'Import failed', description: err?.message })
            } finally {
              (e.target as any).value = ''
            }
          }} />
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={activateOnImport} onChange={(ev) => setActivateOnImport(ev.target.checked)} /> Activate after import</label>
        </div>
      </Modal>
      <Modal title="Dictionary Statistics" open={!!statsFor} onCancel={() => setStatsFor(null)} footer={null}>
        {statsFor && (
          <Descriptions size="small" bordered column={1}>
            <Descriptions.Item label="ID">{statsFor.dictionary_id}</Descriptions.Item>
            <Descriptions.Item label="Name">{statsFor.name}</Descriptions.Item>
            <Descriptions.Item label="Total Entries">{statsFor.total_entries}</Descriptions.Item>
            <Descriptions.Item label="Regex Entries">{statsFor.regex_entries}</Descriptions.Item>
            <Descriptions.Item label="Literal Entries">{statsFor.literal_entries}</Descriptions.Item>
            <Descriptions.Item label="Groups">{(statsFor.groups||[]).join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Average Probability">{statsFor.average_probability}</Descriptions.Item>
            <Descriptions.Item label="Total Usage Count">{statsFor.total_usage_count}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

const DictionaryEntryManager: React.FC<{ dictionaryId: number; form: any }> = ({ dictionaryId, form }) => {
  const { t } = useTranslation(["common"]) 
  const qc = useQueryClient()
  const { data, status } = useQuery({
    queryKey: ['tldw:listDictionaryEntries', dictionaryId],
    queryFn: async () => {
      await tldwClient.initialize()
      const res = await tldwClient.listDictionaryEntries(dictionaryId)
      return res?.entries || []
    }
  })
  const { mutate: addEntry, isPending: adding } = useMutation({
    mutationFn: (v: any) => tldwClient.addDictionaryEntry(dictionaryId, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tldw:listDictionaryEntries', dictionaryId] }); form.resetFields() }
  })
  const { mutate: deleteEntry } = useMutation({
    mutationFn: (id: number) => tldwClient.deleteDictionaryEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tldw:listDictionaryEntries', dictionaryId] })
  })

  return (
    <div className="space-y-3">
      {status === 'pending' && <Skeleton active paragraph={{ rows: 4 }} />}
      {status === 'success' && (
        <Table
          size="small"
          rowKey={(r: any) => r.id}
          dataSource={data}
          columns={[
            { title: 'Pattern', dataIndex: 'pattern', key: 'pattern' },
            { title: 'Replacement', dataIndex: 'replacement', key: 'replacement' },
            { title: 'Type', dataIndex: 'type', key: 'type' },
            { title: 'Prob.', dataIndex: 'probability', key: 'probability' },
            { title: 'Group', dataIndex: 'group', key: 'group' },
            { title: 'Enabled', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => v ? 'Yes' : 'No' },
            { title: 'Actions', key: 'actions', render: (_: any, r: any) => (
              <div className="flex gap-2">
                <Tooltip title="Delete"><button className="text-red-500" onClick={async () => { const ok = await confirmDanger({ title: t('common:confirmTitle', { defaultValue: 'Please confirm' }), content: 'Delete entry?', okText: t('common:delete', { defaultValue: 'Delete' }), cancelText: t('common:cancel', { defaultValue: 'Cancel' }) }); if (ok) deleteEntry(r.id) }}><Trash2 className="w-4 h-4" /></button></Tooltip>
              </div>
            ) }
          ] as any}
        />
      )}
      <Form layout="vertical" form={form} onFinish={(v) => addEntry(v)}>
        <Form.Item name="pattern" label="Pattern" rules={[{ required: true }]}><Input placeholder="hello or /hel+o/i" /></Form.Item>
        <Form.Item name="replacement" label="Replacement" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="type" label="Type" initialValue="literal"><Select options={[{ label: 'Literal', value: 'literal' }, { label: 'Regex', value: 'regex' }]} /></Form.Item>
        <Form.Item name="probability" label="Probability" initialValue={1}><InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="group" label="Group"><Input /></Form.Item>
        <Form.Item name="max_replacements" label="Max Replacements"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="enabled" label="Enabled" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        <Form.Item name="case_sensitive" label="Case Sensitive" valuePropName="checked"><Switch /></Form.Item>
        <Button type="primary" htmlType="submit" loading={adding} className="w-full">Add Entry</Button>
      </Form>
    </div>
  )
}
