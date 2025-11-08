import React from 'react'
import { Input, List, Tag, Space, Tooltip, Modal, Checkbox, Button, message, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getAllPrompts } from '@/db/dexie/helpers'
import { useStorage } from '@plasmohq/storage/hook'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { savePromptFB, updatePromptFB } from '@/db'
import { generateID, updateLastUsedPrompt as updateLastUsedPromptDB } from '@/db/dexie/helpers'
import { useMessageOption } from "@/hooks/useMessageOption"
import { Link } from 'react-router-dom'

type PromptItem = { id?: string; title: string; content: string; is_system?: boolean; source: 'local' | 'server' }

type Props = {
  onInsertMessage: (content: string) => void
  onInsertSystem: (content: string) => void
  inputId?: string
  ariaLabel?: string
  ariaLabelledby?: string
}

export const PromptSearch: React.FC<Props> = ({ onInsertMessage, onInsertSystem, inputId, ariaLabel, ariaLabelledby }) => {
  const { t } = useTranslation(['option'])
  const { historyId } = useMessageOption()
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
  const [saveRemote, setSaveRemote] = React.useState<boolean>(false)
  const [localOverwriteId, setLocalOverwriteId] = React.useState<string | undefined>(undefined)

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

  const handleInsert = async () => {
    if (editIsSystem) onInsertSystem(editContent)
    else onInsertMessage(editContent)
    try {
      if (historyId && historyId !== 'temp') {
        await updateLastUsedPromptDB(historyId, {
          prompt_id: selected?.source === 'local' && selected?.id ? String(selected.id) : undefined,
          prompt_content: editContent
        })
      }
    } catch {}
    setEditorOpen(false)
  }

  return (
    <div className="w-72">
      <Tooltip title={remote ? 'Search local + server prompts' : 'Search local prompts'}>
        <Input.Search
          id={inputId}
          placeholder={t('selectAPrompt') || 'Search prompts'}
          allowClear
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 200) }}
          loading={loading}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
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
                    <Tag color={item.source === 'server' ? 'geekblue' : 'default'}>{item.source}</Tag>
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
        <Space direction="vertical" className="w-full" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleInsert() } }}>
          <label className="text-xs text-gray-500">{t('promptSearch.title')}</label>
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          <label className="text-xs text-gray-500">{t('promptSearch.content')}</label>
          <Input.TextArea value={editContent} onChange={(e) => setEditContent(e.target.value)} autoSize={{ minRows: 6 }} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleInsert() } }} />
          <Checkbox checked={editIsSystem} onChange={(e) => setEditIsSystem(e.target.checked)}>{t('promptSearch.systemPrompt')}</Checkbox>
          <Checkbox checked={saveRemote} onChange={(e) => setSaveRemote(e.target.checked)}>{t('promptSearch.alsoSaveRemote')}</Checkbox>
          {selected?.source === 'server' && (
            <div className="mt-1">
              <label className="text-xs text-gray-500">{t('promptSearch.overwriteLocalLabel') || 'Overwrite local prompt (optional)'}</label>
              <Select
                className="w-full"
                allowClear
                placeholder={t('promptSearch.overwriteLocalPlaceholder') || 'Select a local prompt to overwrite'}
                value={localOverwriteId}
                options={(localPrompts || []).map((p) => ({ value: p.id, label: p.title }))}
                onChange={(v) => setLocalOverwriteId(v)}
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
            <Link to="/settings/prompt" className="text-xs underline text-gray-600 dark:text-gray-300">{t('promptSearch.manageLink') || 'View/Manage Prompts'}</Link>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setEditorOpen(false)}>{t('promptSearch.cancel')}</Button>
              <Button type="primary" title="Ctrl/Cmd+Enter" onClick={handleInsert}>{t('promptSearch.insert')}</Button>
            {selected?.source === 'local' && selected?.id && (
              <Button onClick={async () => {
                try {
                  await updatePromptFB({ id: String(selected.id), title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem })
                  message.success(t('promptSearch.saveLocalSuccess') || 'Saved')
                } catch (e: any) {
                  message.error(e?.message || t('promptSearch.saveLocalFailed') || 'Failed')
                }
              }}>{t('promptSearch.saveLocal') || 'Save changes (local)'}</Button>
            )}
            {selected?.source === 'server' && selected?.id && (
              <Button onClick={async () => {
                try {
                  await tldwClient.updatePrompt(String(selected.id), { title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem })
                  message.success(t('promptSearch.saveServerSuccess') || 'Saved')
                } catch (e: any) {
                  message.error(e?.message || t('promptSearch.saveServerFailed') || 'Failed')
                }
              }}>{t('promptSearch.saveServer') || 'Save changes (server)'}</Button>
            )}
            {selected?.source === 'server' && (
              <Button onClick={async () => {
                try {
                  if (localOverwriteId) {
                    await updatePromptFB({ id: localOverwriteId, title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem })
                    message.success(t('promptSearch.saveLocalSuccess') || 'Saved')
                  } else {
                    const id = generateID()
                    await savePromptFB({ id, title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem, createdAt: Date.now() })
                    message.success(t('promptSearch.saveLocalSuccess') || 'Saved')
                  }
                } catch (e: any) {
                  message.error(e?.message || t('promptSearch.saveLocalFailed') || 'Failed')
                }
              }}>{t('promptSearch.saveLocalCopy') || 'Save local copy'}</Button>
            )}
            <Button onClick={async () => {
              try {
                const now = Date.now()
                const id = generateID()
                await savePromptFB({ id, title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem, createdAt: now })
                if (saveRemote) {
                  try { await tldwClient.createPrompt({ title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem }) } catch {}
                }
                message.success(t('promptSearch.saveSuccess'))
              } catch (e: any) {
                message.error(e?.message || t('promptSearch.saveFailed'))
              }
            }}>{t('promptSearch.saveAsNew')}</Button>
            {selected?.source === 'server' && (
              <Button onClick={async () => {
                try {
                  await tldwClient.createPrompt({ title: editTitle || 'Untitled', content: editContent, is_system: !!editIsSystem })
                  message.success(t('promptSearch.saveServerSuccess') || 'Saved')
                } catch (e: any) {
                  message.error(e?.message || t('promptSearch.saveServerFailed') || 'Failed')
                }
              }}>{t('promptSearch.saveServerOnly') || 'Save as new (server only)'}</Button>
            )}
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default PromptSearch
