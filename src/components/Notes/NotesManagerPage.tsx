import React from 'react'
import { Button, Input, List, Pagination, Space, Spin, Tooltip, Typography, message, Select } from 'antd'
import { bgRequest } from '@/services/background-proxy'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useServerOnline } from '@/hooks/useServerOnline'
import { Copy as CopyIcon, Save as SaveIcon, Trash2 as TrashIcon, FileDown as FileDownIcon, Plus as PlusIcon, Search as SearchIcon } from 'lucide-react'
import { confirmDanger } from '@/components/Common/confirm-danger'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import FeatureEmptyState from '@/components/Common/FeatureEmptyState'

type NoteListItem = {
  id: string | number
  title?: string
  content?: string
  updated_at?: string
}

const NotesManagerPage: React.FC = () => {
  const { t } = useTranslation(['option', 'common'])
  const [query, setQuery] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [selectedId, setSelectedId] = React.useState<string | number | null>(null)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [loadingDetail, setLoadingDetail] = React.useState(false)
  const [keywordTokens, setKeywordTokens] = React.useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = React.useState<string[]>([])
  const [editorKeywords, setEditorKeywords] = React.useState<string[]>([])
  const isOnline = useServerOnline()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const fetchNotes = async (): Promise<NoteListItem[]> => {
    const q = query.trim()
    const toks = keywordTokens.map((k) => k.toLowerCase())
    // Prefer search when query or keyword filters are present
    if (q || toks.length > 0) {
      const cfg = await (async () => {
        try { return await (await import('@/services/tldw/TldwApiClient')).tldwClient.getConfig() } catch { return null }
      })()
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      const qstr = q || toks.join(' ')
      const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(qstr)}` as any, method: 'GET' as any })
      let arr: any[] = Array.isArray(abs) ? abs : []
      if (toks.length > 0) {
        arr = arr.filter((n) => {
          const hay = `${n?.title || ''} ${n?.content || ''}`.toLowerCase()
          return toks.every((k) => hay.includes(k))
        })
      }
      if (q) {
        const ql = q.toLowerCase()
        arr = arr.filter((n) => (`${n?.title || ''} ${n?.content || ''}`.toLowerCase()).includes(ql))
      }
      setTotal(arr.length)
      return arr.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content, updated_at: n?.updated_at }))
    }
    // Browse list with pagination when no filters
    const res = await bgRequest<any>({ path: `/api/v1/notes/?page=${page}&results_per_page=${pageSize}` as any, method: 'GET' as any })
    const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
    const pagination = res?.pagination
    setTotal(Number(pagination?.total_items || items.length || 0))
    return items.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content, updated_at: n?.updated_at }))
  }

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['notes', query, page, pageSize],
    queryFn: fetchNotes,
    placeholderData: keepPreviousData,
    enabled: isOnline
  })

  const loadDetail = React.useCallback(async (id: string | number) => {
    setLoadingDetail(true)
    try {
      const d = await bgRequest<any>({ path: `/api/v1/notes/${id}` as any, method: 'GET' as any })
      setSelectedId(id)
      setTitle(String(d?.title || ''))
      setContent(String(d?.content || ''))
      const k = (Array.isArray(d?.metadata?.keywords) ? d.metadata.keywords : (Array.isArray(d?.keywords) ? d.keywords : [])) as any[]
      setEditorKeywords((k || []).map(String))
    } catch {
      message.error('Failed to load note')
    } finally { setLoadingDetail(false) }
  }, [])

  const resetEditor = () => {
    setSelectedId(null)
    setTitle('')
    setContent('')
  }

  const saveNote = async () => {
    if (!content.trim() && !title.trim()) { message.warning('Nothing to save'); return }
    try {
      if (selectedId == null) {
        const payload = { title: title || undefined, content, metadata: { keywords: editorKeywords } }
        const created = await bgRequest<any>({ path: '/api/v1/notes/' as any, method: 'POST' as any, headers: { 'Content-Type': 'application/json' }, body: payload })
        message.success('Note created')
        await refetch()
        if (created?.id != null) await loadDetail(created.id)
      } else {
        const payload = { title: title || undefined, content, metadata: { keywords: editorKeywords } }
        await bgRequest<any>({ path: `/api/v1/notes/${selectedId}` as any, method: 'PUT' as any, headers: { 'Content-Type': 'application/json' }, body: payload })
        message.success('Note updated')
        await refetch()
      }
    } catch (e: any) {
      message.error(e?.message || 'Save failed')
    }
  }

  const deleteNote = async (id?: string | number | null) => {
    const target = id ?? selectedId
    if (target == null) { message.warning('No note selected'); return }
    const ok = await confirmDanger({ title: 'Please confirm', content: 'Delete this note?', okText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    try {
      await bgRequest<any>({ path: `/api/v1/notes/${target}` as any, method: 'DELETE' as any })
      message.success('Note deleted')
      if (selectedId === target) resetEditor()
      await refetch()
    } catch (e: any) {
      message.error(e?.message || 'Delete failed')
    }
  }

  const copySelected = async () => {
    try {
      await navigator.clipboard.writeText(content || '')
      message.success('Copied')
    } catch { message.error('Copy failed') }
  }

  const exportSelected = () => {
    const name = (title || `note-${selectedId ?? 'new'}`).replace(/[^a-z0-9-_]+/gi, '-')
    const md = title ? `# ${title}\n\n${content || ''}` : (content || '')
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAll = async () => {
    try {
      let arr: NoteListItem[] = []
      const q = query.trim()
      const toks = keywordTokens.map((k) => k.toLowerCase())
      if (q || toks.length > 0) {
        const cfg = await (await import('@/services/tldw/TldwApiClient')).tldwClient.getConfig().catch(() => null)
        const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
        const qstr = q || toks.join(' ')
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(qstr)}` as any, method: 'GET' as any })
        let raw: any[] = Array.isArray(abs) ? abs : []
        if (toks.length > 0) {
          raw = raw.filter((n) => {
            const hay = `${n?.title || ''} ${n?.content || ''}`.toLowerCase()
            return toks.every((k) => hay.includes(k))
          })
        }
        if (q) {
          const ql = q.toLowerCase()
          raw = raw.filter((n) => (`${n?.title || ''} ${n?.content || ''}`.toLowerCase()).includes(ql))
        }
        arr = raw.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content }))
      } else {
        // Iterate pages (chunk by 100)
        let p = 1
        const ps = 100
        while (true) {
          const res = await bgRequest<any>({ path: `/api/v1/notes/?page=${p}&results_per_page=${ps}` as any, method: 'GET' as any })
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
          arr.push(...items.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content })))
          const pagination = res?.pagination
          const totalPages = Number(pagination?.total_pages || (items.length < ps ? p : p + 1))
          if (p >= totalPages || items.length === 0) break
          p++
        }
      }
      if (arr.length === 0) { message.info('No notes to export'); return }
      const md = arr.map((n, idx) => `### ${n.title || `Note ${n.id ?? idx+1}`}\n\n${String(n.content || '')}`).join("\n\n---\n\n")
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export.md`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Exported all notes')
    } catch (e: any) {
      message.error(e?.message || 'Export failed')
    }
  }

  const gatherAllMatching = async (): Promise<NoteListItem[]> => {
    let arr: NoteListItem[] = []
    const q = query.trim()
    const toks = keywordTokens.map((k) => k.toLowerCase())
    if (q || toks.length > 0) {
      const cfg = await (await import('@/services/tldw/TldwApiClient')).tldwClient.getConfig().catch(() => null)
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      const qstr = q || toks.join(' ')
      const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(qstr)}` as any, method: 'GET' as any })
      let raw: any[] = Array.isArray(abs) ? abs : []
      if (toks.length > 0) {
        raw = raw.filter((n) => {
          const hay = `${n?.title || ''} ${n?.content || ''}`.toLowerCase()
          return toks.every((k) => hay.includes(k))
        })
      }
      if (q) {
        const ql = q.toLowerCase()
        raw = raw.filter((n) => (`${n?.title || ''} ${n?.content || ''}`.toLowerCase()).includes(ql))
      }
      arr = raw.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content, updated_at: n?.updated_at }))
    } else {
      // Iterate pages (chunk by 100)
      let p = 1
      const ps = 100
      while (true) {
        const res = await bgRequest<any>({ path: `/api/v1/notes/?page=${p}&results_per_page=${ps}` as any, method: 'GET' as any })
        const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : [])
        arr.push(...items.map((n: any) => ({ id: n?.id, title: n?.title, content: n?.content, updated_at: n?.updated_at })))
        const pagination = res?.pagination
        const totalPages = Number(pagination?.total_pages || (items.length < ps ? p : p + 1))
        if (p >= totalPages || items.length === 0) break
        p++
      }
    }
    return arr
  }

  const exportAllCSV = async () => {
    try {
      const arr = await gatherAllMatching()
      if (!arr.length) { message.info('No notes to export'); return }
      const escape = (s: any) => '"' + String(s ?? '').replace(/"/g, '""') + '"'
      const header = ['id','title','content','updated_at']
      const rows = [header.join(','), ...arr.map(n => [n.id, n.title || '', (n.content || '').replace(/\r?\n/g, '\\n'), n.updated_at || ''].map(escape).join(','))]
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Exported CSV')
    } catch (e: any) {
      message.error(e?.message || 'Export failed')
    }
  }

  const exportAllJSON = async () => {
    try {
      const arr = await gatherAllMatching()
      if (!arr.length) { message.info('No notes to export'); return }
      const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notes-export.json`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Exported JSON')
    } catch (e: any) {
      message.error(e?.message || 'Export failed')
    }
  }

  const loadKeywordSuggestions = React.useCallback(async (text?: string) => {
    try {
      const cfg = await (await import('@/services/tldw/TldwApiClient')).tldwClient.getConfig().catch(() => null)
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      if (text && text.trim().length > 0) {
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/keywords/search/?query=${encodeURIComponent(text)}&limit=10` as any, method: 'GET' as any })
        const arr = Array.isArray(abs) ? abs.map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || "")).filter(Boolean) : []
        setKeywordOptions(arr)
      } else {
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/keywords/?limit=200` as any, method: 'GET' as any })
        const arr = Array.isArray(abs) ? abs.map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || "")).filter(Boolean) : []
        setKeywordOptions(arr)
      }
    } catch {}
  }, [])

  return (
    <div className="w-full h-full flex gap-4 mt-16">
      {/* Left: search + list */}
      <div className="w-full lg:w-1/3 min-w-0 lg:sticky lg:top-16 lg:self-start">
        <div className="p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717]">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={() => { setPage(1); refetch() }}
              className="flex-1 min-w-[12rem]"
            />
            <Button type="primary" onClick={() => { setPage(1); refetch() }} icon={(<SearchIcon className="w-4 h-4" />) as any}>Search</Button>
            <Button onClick={() => { setQuery(''); setKeywordTokens([]); setPage(1); refetch() }}>Clear</Button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Select
              mode="tags"
              allowClear
              placeholder="Keywords"
              className="min-w-[12rem] flex-1"
              value={keywordTokens}
              onSearch={(txt) => { if (isOnline) void loadKeywordSuggestions(txt) }}
              onChange={(vals) => { setKeywordTokens(vals as string[]); setPage(1); refetch() }}
              options={keywordOptions.map((k) => ({ label: k, value: k }))}
            />
            <Button type="link" onClick={() => { setKeywordTokens([]); setPage(1); refetch() }}>Reset filters</Button>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] max-h-[50vh] md:max-h-[60vh] lg:max-h-[calc(100dvh-18rem)] overflow-auto">
          <div className="sticky -m-3 mb-2 top-0 z-10 px-3 py-2 bg-white dark:bg-[#171717] border-b dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gray-500">Notes</span>
            <span className="text-xs text-gray-400">{total}</span>
            <div className="ml-auto flex items-center gap-2">
              <Tooltip title="Export all (Markdown)"><Button size="small" onClick={() => void exportAll()}>MD</Button></Tooltip>
              <Tooltip title="Export all (CSV)"><Button size="small" onClick={() => void exportAllCSV()}>CSV</Button></Tooltip>
              <Tooltip title="Export all (JSON)"><Button size="small" onClick={() => void exportAllJSON()}>JSON</Button></Tooltip>
            </div>
          </div>
          {isFetching ? (
            <div className="flex items-center justify-center py-10"><Spin /></div>
          ) : !isOnline ? (
            <FeatureEmptyState
              title={t('option:notesEmpty.connectTitle', { defaultValue: 'Connect to use Notes' })}
              description={t('option:notesEmpty.connectDescription', {
                defaultValue: 'To use Notes, first connect to your tldw server.'
              })}
              examples={[
                t('option:notesEmpty.connectExample1', {
                  defaultValue: 'Open Settings → tldw server to add your server URL.'
                }),
                t('option:notesEmpty.connectExample2', {
                  defaultValue: 'Use Diagnostics if your server is running but not reachable.'
                })
              ]}
              primaryActionLabel={t('common:connectToServer', { defaultValue: 'Connect to server' })}
              onPrimaryAction={() => navigate('/settings/tldw')}
            />
          ) : Array.isArray(data) && data.length > 0 ? (
            <>
              <List
                size="small"
                dataSource={data}
                renderItem={(item) => (
                  <List.Item
                    key={String(item.id)}
                    onClick={() => void loadDetail(item.id)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 ${selectedId === item.id ? '!bg-gray-100 dark:!bg-gray-800' : ''}`}
                  >
                    <div className="w-full">
                      <Typography.Text strong ellipsis className="max-w-[18rem]">{item.title || `Note ${item.id}`}</Typography.Text>
                      {item.content && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{String(item.content).slice(0, 160)}</div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5">{item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}</div>
                    </div>
                  </List.Item>
                )}
              />
              <div className="mt-2 flex justify-center">
                <Pagination size="small" current={page} pageSize={pageSize} total={total} showSizeChanger pageSizeOptions={[10,20,50,100] as any} onChange={(p, ps) => { setPage(p); setPageSize(ps) }} />
              </div>
            </>
          ) : (
            <FeatureEmptyState
              title={t('option:notesEmpty.title', { defaultValue: 'No notes yet' })}
              description={t('option:notesEmpty.description', {
                defaultValue: 'Capture and organize free-form notes connected to your tldw insights.'
              })}
              examples={[
                t('option:notesEmpty.exampleCreate', {
                  defaultValue: 'Create a new note for a recent meeting or transcript.'
                }),
                t('option:notesEmpty.exampleLink', {
                  defaultValue: 'Save review outputs into Notes so you can revisit them later.'
                })
              ]}
              primaryActionLabel={t('option:notesEmpty.primaryCta', { defaultValue: 'Create note' })}
              onPrimaryAction={resetEditor}
            />
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex-1 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] min-h-[70vh] min-w-0 lg:h-[calc(100dvh-8rem)] overflow-auto">
        <div className="flex items-center justify-between">
          <Typography.Title level={5} className="!mb-0">{selectedId == null ? 'New Note' : (title || `Note ${selectedId}`)}</Typography.Title>
          <Space>
            <Tooltip title="New note"><Button size="small" onClick={resetEditor} icon={(<PlusIcon className="w-4 h-4" />) as any}>New</Button></Tooltip>
            <Tooltip title="Copy"><Button size="small" onClick={copySelected} icon={(<CopyIcon className="w-4 h-4" />) as any} /></Tooltip>
            <Tooltip title="Export as Markdown"><Button size="small" onClick={exportSelected} icon={(<FileDownIcon className="w-4 h-4" />) as any}>MD</Button></Tooltip>
            <Tooltip title="Save"><Button type="primary" size="small" onClick={saveNote} loading={loadingDetail} icon={(<SaveIcon className="w-4 h-4" />) as any}>Save</Button></Tooltip>
            <Tooltip title="Delete">
              <Button danger size="small" onClick={() => void deleteNote()} icon={(<TrashIcon className="w-4 h-4" />) as any} disabled={selectedId == null}>Delete</Button>
            </Tooltip>
          </Space>
        </div>
        <div className="mt-2">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="mt-2">
          <Select
            mode="tags"
            allowClear
            placeholder="Keywords (tags)"
            className="min-w-[12rem] w-full"
            value={editorKeywords}
            onSearch={(txt) => { if (isOnline) void loadKeywordSuggestions(txt) }}
            onChange={(vals) => setEditorKeywords(vals as string[])}
            options={keywordOptions.map((k) => ({ label: k, value: k }))}
          />
        </div>
        <div className="mt-2">
          <textarea
            className="w-full min-h-[50vh] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] resize-y leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note here..."
          />
        </div>
      </div>
    </div>
  )
}

export default NotesManagerPage
