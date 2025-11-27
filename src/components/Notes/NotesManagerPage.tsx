import React from 'react'
import type { InputRef } from 'antd'
import { Button, Input, List, Pagination, Space, Spin, Tooltip, Typography, Select, Dropdown } from 'antd'
import { bgRequest } from '@/services/background-proxy'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useServerOnline } from '@/hooks/useServerOnline'
import { Copy as CopyIcon, Save as SaveIcon, Trash2 as TrashIcon, FileDown as FileDownIcon, Plus as PlusIcon, Search as SearchIcon } from 'lucide-react'
import { useConfirmDanger } from '@/components/Common/confirm-danger'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import FeatureEmptyState from '@/components/Common/FeatureEmptyState'
import { useDemoMode } from '@/context/demo-mode'
import { useServerCapabilities } from '@/hooks/useServerCapabilities'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { useAntdMessage } from '@/hooks/useAntdMessage'

type NoteListItem = {
  id: string | number
  title?: string
  content?: string
  updated_at?: string
}

const MAX_TITLE_LENGTH = 80
const MAX_PREVIEW_LENGTH = 100

const truncateText = (value?: string | null, max?: number) => {
  if (!value) return ""
  if (!max || value.length <= max) return value
  return `${value.slice(0, max)}...`
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
  const [saving, setSaving] = React.useState(false)
  const [keywordTokens, setKeywordTokens] = React.useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = React.useState<string[]>([])
  const [editorKeywords, setEditorKeywords] = React.useState<string[]>([])
  const [isDirty, setIsDirty] = React.useState(false)
  const isOnline = useServerOnline()
  const { demoEnabled } = useDemoMode()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const titleInputRef = React.useRef<InputRef | null>(null)
  const message = useAntdMessage()
  const confirmDanger = useConfirmDanger()

  const editorDisabled = !isOnline || (!capsLoading && capabilities && !capabilities.hasNotes)

  const fetchNotes = async (): Promise<NoteListItem[]> => {
    const q = query.trim()
    const toks = keywordTokens.map((k) => k.toLowerCase())
    // Prefer search when query or keyword filters are present
    if (q || toks.length > 0) {
      const cfg = await (async () => {
        try { return await tldwClient.getConfig() } catch { return null }
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
      const normalizedKeywords = (k || []).map((item: any) =>
        String(item?.keyword || item?.keyword_text || item?.text || item)
      ).filter((s) => s && s.trim().length > 0)
      setEditorKeywords(normalizedKeywords)
      setIsDirty(false)
    } catch {
      message.error('Failed to load note')
    } finally { setLoadingDetail(false) }
  }, [])

  const resetEditor = () => {
    setSelectedId(null)
    setTitle('')
    setContent('')
    setEditorKeywords([])
    setIsDirty(false)
  }

  const confirmDiscardIfDirty = React.useCallback(async () => {
    if (!isDirty) return true
    const ok = await confirmDanger({
      title: 'Discard changes?',
      content: 'You have unsaved changes. Discard them?',
      okText: 'Discard',
      cancelText: 'Cancel'
    })
    return ok
  }, [isDirty])

  const handleNewNote = React.useCallback(async () => {
    const ok = await confirmDiscardIfDirty()
    if (!ok) return
    resetEditor()
    setTimeout(() => {
      titleInputRef.current?.focus()
    }, 0)
  }, [confirmDiscardIfDirty])

  const handleSelectNote = React.useCallback(
    async (id: string | number) => {
      const ok = await confirmDiscardIfDirty()
      if (!ok) return
      await loadDetail(id)
    },
    [confirmDiscardIfDirty, loadDetail]
  )

  const saveNote = async () => {
    if (!content.trim() && !title.trim()) { message.warning('Nothing to save'); return }
    setSaving(true)
    try {
      if (selectedId == null) {
        const payload = { title: title || undefined, content, metadata: { keywords: editorKeywords } }
        const created = await bgRequest<any>({ path: '/api/v1/notes/' as any, method: 'POST' as any, headers: { 'Content-Type': 'application/json' }, body: payload })
        message.success('Note created')
        setIsDirty(false)
        await refetch()
        if (created?.id != null) await loadDetail(created.id)
      } else {
        const payload = { title: title || undefined, content, metadata: { keywords: editorKeywords } }
        await bgRequest<any>({ path: `/api/v1/notes/${selectedId}` as any, method: 'PUT' as any, headers: { 'Content-Type': 'application/json' }, body: payload })
        message.success('Note updated')
        setIsDirty(false)
        await refetch()
      }
    } catch (e: any) {
      message.error(e?.message || 'Save failed')
    } finally { setSaving(false) }
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
        const cfg = await tldwClient.getConfig().catch(() => null)
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
      const cfg = await tldwClient.getConfig().catch(() => null)
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
      const cfg = await tldwClient.getConfig().catch(() => null)
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

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Deep-link support: if tldw:lastNoteId is set (e.g., from omni-search),
  // automatically load that note once when the list is available.
  const [pendingNoteId, setPendingNoteId] = React.useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null
      const raw = window.localStorage.getItem("tldw:lastNoteId")
      return raw || null
    } catch {
      return null
    }
  })

  React.useEffect(() => {
    if (!isOnline) return
    if (!pendingNoteId) return
    if (!Array.isArray(data)) return
    if (selectedId != null) return

    ;(async () => {
      await handleSelectNote(pendingNoteId)
      setPendingNoteId(null)
      try {
        window.localStorage.removeItem("tldw:lastNoteId")
      } catch {
        // ignore storage errors
      }
    })()
  }, [data, handleSelectNote, isOnline, pendingNoteId, selectedId])

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 mt-16">
      {/* Left: search + list */}
      <div className="w-full lg:w-1/3 min-w-0 lg:sticky lg:top-16 lg:self-start">
        <div className="p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717]">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              placeholder={t('option:notesSearch.placeholder', {
                defaultValue: 'Search titles and contents'
              })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={() => { setPage(1); refetch() }}
              className="flex-1 min-w-[12rem]"
            />
            <Button type="primary" onClick={() => { setPage(1); refetch() }} icon={(<SearchIcon className="w-4 h-4" />) as any}>Search</Button>
            <Tooltip title={t('option:notesSearch.clearTooltip', { defaultValue: 'Clear search and filters' })}>
              <Button onClick={() => { setQuery(''); setKeywordTokens([]); setPage(1); refetch() }}>
                {t('option:notesSearch.clear', {
                  defaultValue: 'Clear'
                })}
              </Button>
            </Tooltip>
            <Tooltip
              title={t('option:notesSearch.newTooltip', {
                defaultValue: 'Create a new note'
              })}>
              <Button onClick={() => { void handleNewNote() }} icon={(<PlusIcon className="w-4 h-4" />) as any}>
                {t('option:notesSearch.new', { defaultValue: 'New note' })}
              </Button>
            </Tooltip>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Select
              mode="tags"
              allowClear
              placeholder={t('option:notesSearch.keywordsPlaceholder', {
                defaultValue: 'Filter by keyword'
              })}
              className="min-w-[12rem] flex-1"
              value={keywordTokens}
              onSearch={(txt) => { if (isOnline) void loadKeywordSuggestions(txt) }}
              onChange={(vals) => { setKeywordTokens(vals as string[]); setPage(1); refetch() }}
              options={keywordOptions.map((k) => ({ label: k, value: k }))}
            />
          </div>
        </div>
          <div className="mt-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] max-h-[50vh] md:max-h-[60vh] lg:max-h-[calc(100dvh-18rem)] overflow-auto">
          <div className="sticky -m-3 mb-2 top-0 z-10 px-3 py-2 bg-white dark:bg-[#171717] border-b dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              <span className="uppercase tracking-wide">Notes</span>
              <span className="text-gray-400 ml-1">
                {t('option:notesSearch.listCount', {
                  defaultValue: '{{count}} notes',
                  count: total
                })}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'md',
                      label: t('option:notesSearch.exportMdTooltip', {
                        defaultValue: 'Export matching notes as Markdown (.md)'
                      })
                    },
                    {
                      key: 'csv',
                      label: t('option:notesSearch.exportCsvTooltip', {
                        defaultValue: 'Export matching notes as CSV'
                      })
                    },
                    {
                      key: 'json',
                      label: t('option:notesSearch.exportJsonTooltip', {
                        defaultValue: 'Export matching notes as JSON'
                      })
                    }
                  ],
                  onClick: ({ key }) => {
                    if (key === 'md') void exportAll()
                    if (key === 'csv') void exportAllCSV()
                    if (key === 'json') void exportAllJSON()
                  }
                }}
              >
                <Button size="small">
                  {t('option:notesSearch.exportMenuTrigger', {
                    defaultValue: 'Export'
                  })}
                </Button>
              </Dropdown>
            </div>
          </div>
          {isFetching ? (
            <div className="flex items-center justify-center py-10"><Spin /></div>
          ) : !isOnline ? (
            demoEnabled ? (
              <FeatureEmptyState
                title={t('option:notesEmpty.demoTitle', {
                  defaultValue: 'Explore Notes in demo mode'
                })}
                description={t('option:notesEmpty.demoDescription', {
                  defaultValue:
                    'This demo shows how Notes can organize your insights. Connect your own server later to create and save real notes.'
                })}
                examples={[
                  t('option:notesEmpty.demoExample1', {
                    defaultValue:
                      'See how note titles, previews, and timestamps appear in this list.'
                  }),
                  t('option:notesEmpty.demoExample2', {
                    defaultValue:
                      'When you connect, you’ll be able to create notes from meetings, reviews, and more.'
                  })
                ]}
                primaryActionLabel={t('common:connectToServer', {
                  defaultValue: 'Connect to server'
                })}
                onPrimaryAction={() => navigate('/settings/tldw')}
              />
            ) : (
              <FeatureEmptyState
                title={t('option:notesEmpty.connectTitle', {
                  defaultValue: 'Connect to use Notes'
                })}
                description={t('option:notesEmpty.connectDescription', {
                  defaultValue: 'To use Notes, first connect to your tldw server.'
                })}
                examples={[
                  t('option:notesEmpty.connectExample1', {
                    defaultValue:
                      'Open Settings → tldw server to add your server URL.'
                  }),
                  t('option:notesEmpty.connectExample2', {
                    defaultValue:
                      'Use Diagnostics if your server is running but not reachable.'
                  })
                ]}
                primaryActionLabel={t('common:connectToServer', {
                  defaultValue: 'Connect to server'
                })}
                onPrimaryAction={() => navigate('/settings/tldw')}
              />
            )
          ) : (!capsLoading && capabilities && !capabilities.hasNotes) ? (
            <FeatureEmptyState
              title={t('option:notesEmpty.offlineTitle', {
                defaultValue: 'Notes API not available on this server'
              })}
              description={t('option:notesEmpty.offlineDescription', {
                defaultValue:
                  'This tldw server does not advertise the Notes endpoints (for example, /api/v1/notes/). Upgrade your server to a version that includes the Notes API to use this workspace.'
              })}
              examples={[
                t('option:notesEmpty.offlineExample1', {
                  defaultValue:
                    'Open Diagnostics to confirm your server version and available APIs.'
                }),
                t('option:notesEmpty.offlineExample2', {
                  defaultValue:
                    'After upgrading, reload the extension and return to Notes.'
                })
              ]}
              primaryActionLabel={t('settings:healthSummary.diagnostics', {
                defaultValue: 'Open Diagnostics'
              })}
              onPrimaryAction={() => navigate('/settings/health')}
            />
          ) : Array.isArray(data) && data.length > 0 ? (
            <>
                  <List
                    size="small"
                    dataSource={data}
                    renderItem={(item) => (
                      <List.Item
                        key={String(item.id)}
                        onClick={() => { void handleSelectNote(item.id) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            void handleSelectNote(item.id)
                          }
                        }}
                    role="button"
                    tabIndex={0}
                    aria-selected={selectedId === item.id}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 ${selectedId === item.id ? '!bg-gray-100 dark:!bg-gray-800' : ''}`}
                  >
                    <div className="w-full">
                      <Typography.Text strong ellipsis className="max-w-[18rem]">
                        {truncateText(item.title || `Note ${item.id}`, MAX_TITLE_LENGTH)}
                      </Typography.Text>
                      {item.content && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {truncateText(String(item.content), MAX_PREVIEW_LENGTH)}
                        </div>
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
        <div
          className="relative flex-1 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] min-h-[70vh] min-w-0 lg:h-[calc(100dvh-8rem)] overflow-auto"
          aria-disabled={editorDisabled}
        >
            <div className="flex items-center justify-between">
            <Typography.Title level={5} className="!mb-0">{selectedId == null ? 'New Note' : (title || `Note ${selectedId}`)}</Typography.Title>
            {!editorDisabled && (
              <Space>
              <Tooltip title={t('option:notesSearch.newTooltip', {
                defaultValue: 'Create a new note'
              })}>
                <Button
                  size="small"
                  onClick={() => { void handleNewNote() }}
                  icon={(<PlusIcon className="w-4 h-4" />) as any}
                >
                  {t('option:notesSearch.new', { defaultValue: 'New note' })}
                </Button>
              </Tooltip>
              <Tooltip
                title={t('option:notesSearch.toolbarCopyTooltip', {
                  defaultValue: 'Copy note content'
                })}
              >
                <Button
                  size="small"
                  onClick={copySelected}
                  icon={(<CopyIcon className="w-4 h-4" />) as any}
                  aria-label={t('option:notesSearch.toolbarCopyTooltip', {
                    defaultValue: 'Copy note content'
                  })}
                />
              </Tooltip>
              <Tooltip
                title={t('option:notesSearch.toolbarExportMdTooltip', {
                  defaultValue: 'Export note as Markdown (.md)'
                })}>
                <Button
                  size="small"
                  onClick={exportSelected}
                  icon={(<FileDownIcon className="w-4 h-4" />) as any}
                  aria-label={t('option:notesSearch.toolbarExportMdTooltip', {
                    defaultValue: 'Export note as Markdown (.md)'
                  })}
                >
                  MD
                </Button>
              </Tooltip>
              <Tooltip
                title={t('option:notesSearch.toolbarSaveTooltip', {
                  defaultValue: 'Save note'
                })}>
                <Button
                  type="primary"
                  size="small"
                  onClick={saveNote}
                  loading={saving}
                  icon={(<SaveIcon className="w-4 h-4" />) as any}
                  aria-label={t('option:notesSearch.toolbarSaveTooltip', {
                    defaultValue: 'Save note'
                  })}
                >
                  Save
                </Button>
              </Tooltip>
              <Tooltip
                title={t('option:notesSearch.toolbarDeleteTooltip', {
                  defaultValue: 'Delete note'
                })}
              >
                <Button
                  danger
                  size="small"
                  onClick={() => void deleteNote()}
                  icon={(<TrashIcon className="w-4 h-4" />) as any}
                  disabled={selectedId == null}
                  aria-label={t('option:notesSearch.toolbarDeleteTooltip', {
                    defaultValue: 'Delete note'
                  })}
                >
                  {t('common:delete', { defaultValue: 'Delete' })}
                </Button>
              </Tooltip>
            </Space>
            )}
        </div>
        <div className="mt-2">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
            disabled={editorDisabled}
            ref={titleInputRef}
            className="bg-transparent hover:bg-white focus:bg-white dark:bg-transparent dark:hover:bg-[#1f1f1f] dark:focus:bg-[#1f1f1f] transition-colors"
          />
        </div>
        <div className="mt-2">
          <Select
            mode="tags"
            allowClear
            placeholder="Keywords (tags)"
            className="min-w-[12rem] w-full"
            value={editorKeywords}
            onSearch={(txt) => { if (isOnline) void loadKeywordSuggestions(txt) }}
            onChange={(vals) => { setEditorKeywords(vals as string[]); setIsDirty(true) }}
            options={keywordOptions.map((k) => ({ label: k, value: k }))}
            disabled={editorDisabled}
          />
          <Typography.Text type="secondary" className="block text-[11px] mt-1">
            {t('option:notesSearch.tagsHelp', {
              defaultValue:
                'Keywords help you find this note using the keyword filter on the left.'
            })}
          </Typography.Text>
        </div>
        <div className="mt-2">
          <textarea
            className="w-full min-h-[50vh] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] resize-y leading-relaxed"
            value={content}
            onChange={(e) => { setContent(e.target.value); setIsDirty(true) }}
            placeholder="Write your note here..."
            readOnly={editorDisabled}
          />
        </div>
      </div>
    </div>
  )
}

export default NotesManagerPage
