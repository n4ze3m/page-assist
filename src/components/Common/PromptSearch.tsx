import React from 'react'
import { Input, List, Tag, Space, Tooltip, Modal, Checkbox, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAllPrompts } from '@/db/dexie/helpers'
import { useStorage } from '@plasmohq/storage/hook'
import { tldwClient } from '@/services/tldw/TldwApiClient'

type PromptItem = { id?: string; title: string; content: string; is_system?: boolean; source: 'local' | 'server' }

type Props = {
  onInsertMessage: (content: string) => void
  onInsertSystem: (content: string) => void
}

export const PromptSearch: React.FC<Props> = ({ onInsertMessage, onInsertSystem }) => {
  const { t } = useTranslation(['option'])
  const [remote, setRemote] = useStorage('promptSearchIncludeServer', false)
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [results, setResults] = React.useState<PromptItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selected, setSelected] = React.useState<PromptItem | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState('')
  const [editContent, setEditContent] = React.useState('')
  const [editIsSystem, setEditIsSystem] = React.useState<boolean>(false)

  const { data: localPrompts } = useQuery({ queryKey: ['promptSearchAll'], queryFn: getAllPrompts })

  const runSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const local = (localPrompts || []).filter((p) => (p.title?.toLowerCase().includes(query.toLowerCase()) || p.content?.toLowerCase().includes(query.toLowerCase()))).map((p) => ({ id: p.id, title: p.title, content: p.content, is_system: p.is_system, source: 'local' as const }))
      let merged: PromptItem[] = local
      if (remote) {
        try {
          await tldwClient.initialize()
          const srv = await tldwClient.searchPrompts(query).catch(() => [])
          const serverList = Array.isArray(srv) ? srv : (srv?.results || srv?.prompts || [])
          const norm = (serverList as any[]).map((x) => ({ id: x.id, title: String(x.title || x.name || 'Untitled'), content: String(x.content || x.prompt || ''), is_system: !!x.is_system, source: 'server' as const }))
          // Merge by id+title+content fingerprint
          const seen = new Set<string>()
          merged = [...local, ...norm].filter((p) => {
            const key = `${p.source}:${p.id || ''}:${p.title}:${p.content.slice(0,64)}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        } catch {}
      }
      setResults(merged.slice(0, 50))
    } finally {
      setLoading(false)
    }
  }, [localPrompts, remote])

  React.useEffect(() => {
    const id = setTimeout(() => { void runSearch(q) }, 250)
    return () => clearTimeout(id)
  }, [q, runSearch])

  const openEditor = (item: PromptItem) => {
    setSelected(item)
    setEditTitle(item.title)
    setEditContent(item.content)
    setEditIsSystem(!!item.is_system)
    setEditorOpen(true)
  }

  return (
    <div className="w-72">
      <Tooltip title={remote ? 'Search local + server prompts' : 'Search local prompts'}>
        <Input.Search
          placeholder={t('selectAPrompt') || 'Search prompts'}
          allowClear
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 200) }}
          loading={loading}
        />
      </Tooltip>
      {open && results.length > 0 && (
        <div className="absolute mt-1 z-30 w-72 max-h-80 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] shadow">
          <List
            size="small"
            dataSource={results}
            renderItem={(item) => (
              <List.Item className="!px-2 !py-1 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onMouseDown={(e) => e.preventDefault()} onClick={() => openEditor(item)}>
                <div className="truncate text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{item.title}</span>
                    <Tag size="small" color={item.source === 'server' ? 'geekblue' : 'default'}>{item.source}</Tag>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.content}</div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      <Modal
        title={selected ? selected.title : 'Prompt'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        footer={null}
        destroyOnClose
        centered
      >
        <Space direction="vertical" className="w-full">
          <label className="text-xs text-gray-500">Title</label>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          <label className="text-xs text-gray-500">Content</label>
          <Input.TextArea value={editContent} onChange={(e) => setEditContent(e.target.value)} autoSize={{ minRows: 6 }} />
          <Checkbox checked={editIsSystem} onChange={(e) => setEditIsSystem(e.target.checked)}>System prompt</Checkbox>
          <div className="flex justify-end gap-2 mt-2">
            <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={() => {
              // Insert per choice; if system toggle is on, prefer system insert
              if (editIsSystem) onInsertSystem(editContent)
              else onInsertMessage(editContent)
              setEditorOpen(false)
            }}>Insert</Button>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default PromptSearch

