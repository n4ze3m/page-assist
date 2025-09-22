import React from 'react'
import { Button, Checkbox, Divider, Empty, Input, List, message, Space, Spin, Tag, Tooltip, Typography, Select, Pagination } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { bgRequest } from '@/services/background-proxy'
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { useTranslation } from 'react-i18next'
import { useMessageOption } from '@/hooks/useMessageOption'
import { SaveIcon, SparklesIcon, FileTextIcon, SearchIcon, PaperclipIcon } from 'lucide-react'

type MediaItem = any
type NoteItem = any

type ResultItem = {
  kind: 'media' | 'note'
  id: string | number
  title?: string
  snippet?: string
  meta?: Record<string, any>
  raw: any
}

export const ReviewPage: React.FC = () => {
  const { t } = useTranslation(['option'])
  const [query, setQuery] = React.useState<string>('')
  const [kinds, setKinds] = React.useState<{ media: boolean; notes: boolean }>({ media: true, notes: true })
  const [selected, setSelected] = React.useState<ResultItem | null>(null)
  const [analysis, setAnalysis] = React.useState<string>('')
  const [loadingAnalysis, setLoadingAnalysis] = React.useState<boolean>(false)
  const [existingAnalyses, setExistingAnalyses] = React.useState<NoteItem[]>([])
  const { selectedModel } = useMessageOption()
  const [lastPrompt, setLastPrompt] = React.useState<string | null>(null)
  const [mediaTypes, setMediaTypes] = React.useState<string[]>([])
  const [keywords, setKeywords] = React.useState<string>('')
  const keywordTokens = React.useMemo(() => keywords.split(',').map(s => s.trim()).filter(Boolean), [keywords])
  const [page, setPage] = React.useState<number>(1)
  const [pageSize, setPageSize] = React.useState<number>(10)
  const [mediaTotal, setMediaTotal] = React.useState<number>(0)

  const runSearch = async (): Promise<ResultItem[]> => {
    const results: ResultItem[] = []
    const hasQuery = query.trim().length > 0
    const hasMediaFilters = mediaTypes.length > 0 || keywordTokens.length > 0
    // Media search (POST /api/v1/media/search)
    if (kinds.media) {
      try {
        if (!hasQuery && !hasMediaFilters) {
          // Blank browse: GET listing with pagination
          const listing = await bgRequest<any>({ path: `/api/v1/media/?page=${page}&results_per_page=${pageSize}` as any, method: 'GET' as any })
          const items = Array.isArray(listing?.items) ? listing.items : []
          const pagination = listing?.pagination
          setMediaTotal(Number(pagination?.total_items || items.length || 0))
          for (const m of items) {
            const id = m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid
            results.push({ kind: 'media', id, title: m?.title || m?.filename || `Media ${id}`, snippet: m?.snippet || m?.summary || '', meta: { type: m?.type || m?.media_type, created_at: m?.created_at }, raw: m })
          }
        } else {
          // Search with optional filters and pagination
          const body: any = {
            query: hasQuery ? query : null,
            fields: ['title','content'],
            sort_by: 'relevance'
          }
          if (mediaTypes.length > 0) body.media_types = mediaTypes
          if (keywordTokens.length > 0) body.must_have = keywordTokens
          const mediaResp = await bgRequest<any>({ path: `/api/v1/media/search?page=${page}&results_per_page=${pageSize}` as any, method: 'POST' as any, headers: { 'Content-Type': 'application/json' }, body })
          const items = Array.isArray(mediaResp?.items) ? mediaResp.items : (Array.isArray(mediaResp?.results) ? mediaResp.results : [])
          const pagination = mediaResp?.pagination
          setMediaTotal(Number(pagination?.total_items || items.length || 0))
          for (const m of items) {
            const id = m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid
            results.push({ kind: 'media', id, title: m?.title || m?.filename || `Media ${id}`, snippet: m?.snippet || m?.summary || '', meta: { type: m?.type || m?.media_type, created_at: m?.created_at }, raw: m })
          }
        }
      } catch (e) {
        // ignore
      }
    }
    // Notes search (GET /api/v1/notes/search/)
    if (kinds.notes && hasQuery) {
      try {
        const cfg = await tldwClient.getConfig()
        const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
        const abs = await bgRequest<any, `${'http'|'https'}:${string}`>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(query)}`, method: 'GET' })
        if (Array.isArray(abs)) {
          for (const n of abs) {
            results.push({ kind: 'note', id: n?.id, title: n?.title || `Note ${n?.id}`, snippet: (n?.content || '').slice(0, 160), meta: { updated_at: n?.updated_at }, raw: n })
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return results
  }

  const { data: results, isFetching, refetch } = useQuery({ queryKey: ['review-search', query, kinds, mediaTypes, keywordTokens.join('|'), page, pageSize], queryFn: runSearch, enabled: false })

  // Auto-refetch when paginating in browse/search mode without changing query text
  React.useEffect(() => {
    // If user is browsing (blank query) or using filter-only search, update results on page change
    const hasQuery = query.trim().length > 0
    const hasFilters = mediaTypes.length > 0 || keywordTokens.length > 0
    if (!hasQuery || hasFilters) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const fetchSelectedDetails = React.useCallback(async (item: ResultItem) => {
    try {
      if (item.kind === 'media') {
        const detail = await bgRequest<any>({ path: `/api/v1/media/${item.id}` as any, method: 'GET' as any })
        return detail
      }
      if (item.kind === 'note') {
        // If we already have full note in raw, just return it
        return item.raw
      }
    } catch {}
    return null
  }, [])

  const contentFromDetail = (detail: any): string => {
    if (!detail || typeof detail !== 'object') return ''
    // Try common fields
    const candidates = [detail?.content, detail?.text, detail?.raw_text, detail?.summary, detail?.latest_version?.content]
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim().length > 0) return c
    }
    return ''
  }

  const loadExistingAnalyses = React.useCallback(async (item: ResultItem) => {
    try {
      if (item.kind !== 'media') { setExistingAnalyses([]); return }
      const tag = `media:${item.id}`
      const cfg = await tldwClient.getConfig()
      const base = String(cfg?.serverUrl || '').replace(/\/$/, '')
      // GET /api/v1/notes/search/?query=media:<id>
      const abs = await bgRequest<any, `${'http'|'https'}:${string}`>({ path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(tag)}`, method: 'GET' })
      if (Array.isArray(abs)) setExistingAnalyses(abs)
      else setExistingAnalyses([])
    } catch { setExistingAnalyses([]) }
  }, [])

  const runOneOff = async (mode: 'review' | 'summary') => {
    if (!selected) { message.warning('Select an item to analyze'); return }
    setLoadingAnalysis(true)
    try {
      const detail = await fetchSelectedDetails(selected)
      const content = contentFromDetail(detail)
      if (!content) {
        message.warning('No content available to analyze');
        setLoadingAnalysis(false)
        return
      }
      const prompt = mode === 'review'
        ? 'You are an expert reviewer. Provide a concise, structured review of the following content.'
        : 'Summarize the following content into key points and a brief abstract.'
      setLastPrompt(prompt)
      const body = {
        model: selectedModel || 'default',
        stream: false,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content }
        ]
      }
      const resp = await bgRequest<any>({ path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      // Try OpenAI-style shape
      const text = resp?.choices?.[0]?.message?.content || resp?.content || (typeof resp === 'string' ? resp : '')
      setAnalysis(String(text || ''))
    } catch (e: any) {
      message.error(e?.message || 'Analysis failed')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const saveAnalysis = async () => {
    if (!selected || !analysis.trim()) { message.warning('Nothing to save'); return }
    try {
      const tag = selected.kind === 'media' ? `\n\nmedia:${selected.id}` : ''
      const payload = { content: `${analysis}${tag}`, metadata: { kind: 'analysis', media_id: selected.kind === 'media' ? selected.id : undefined } }
      await bgRequest<any>({ path: '/api/v1/notes/', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
      message.success('Saved to notes')
      if (selected.kind === 'media') await loadExistingAnalyses(selected)
    } catch (e: any) {
      message.error(e?.message || 'Save failed')
    }
  }

  const saveAnalysisToMedia = async () => {
    if (!selected || selected.kind !== 'media') {
      message.warning('Select a media item first')
      return
    }
    if (!analysis.trim()) {
      message.warning('Nothing to save')
      return
    }
    try {
      await bgRequest<any>({
        path: `/api/v1/media/${selected.id}` as any,
        method: 'PUT' as any,
        headers: { 'Content-Type': 'application/json' },
        body: {
          analysis: analysis,
          // include prompt if we have it from last generation
          ...(lastPrompt ? { prompt: lastPrompt } : {})
        }
      })
      message.success('Analysis attached to media')
    } catch (e: any) {
      message.error(e?.message || 'Failed to save to media')
    }
  }

  // Client-side filtering for notes by keyword tokens (media type filtering only applies to media)
  const displayedResults = React.useMemo(() => {
    let arr = results || []
    if (mediaTypes.length > 0) {
      arr = arr.filter((r) => r.kind !== 'media' || mediaTypes.includes(String(r?.meta?.type || '').toLowerCase()))
    }
    if (keywordTokens.length > 0) {
      const toks = keywordTokens.map((k) => k.toLowerCase())
      arr = arr.filter((r) => {
        const hay = `${r.title || ''} ${r.snippet || ''} ${typeof r.raw?.content === 'string' ? r.raw.content : ''}`.toLowerCase()
        return toks.every((k) => hay.includes(k))
      })
    }
    return arr
  }, [results, mediaTypes, keywordTokens])

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-3 gap-4 mt-16">
      {/* Left column: search + results */}
      <div className="lg:col-span-1">
        <div className="p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717]">
          <div className="flex items-center gap-2">
            <Input
              allowClear
              placeholder="Search media, notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={() => refetch()}
            />
            <Button type="primary" onClick={() => { setPage(1); refetch() }} icon={<SearchIcon className="w-4 h-4" /> as any}>Search</Button>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <Checkbox checked={kinds.media} onChange={(e) => setKinds((k) => ({ ...k, media: e.target.checked }))}>Media</Checkbox>
            <Checkbox checked={kinds.notes} onChange={(e) => setKinds((k) => ({ ...k, notes: e.target.checked }))}>Notes</Checkbox>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <Select
                mode="multiple"
                allowClear
                placeholder="Media types"
                className="min-w-48 flex-1"
                value={mediaTypes}
                onChange={(vals) => { setMediaTypes(vals); setPage(1) }}
                options={[
                  { label: 'Video', value: 'video' },
                  { label: 'Audio', value: 'audio' },
                  { label: 'PDF', value: 'pdf' },
                  { label: 'Document', value: 'document' },
                  { label: 'eBook', value: 'ebook' },
                  { label: 'Web', value: 'web' },
                  { label: 'Image', value: 'image' },
                  { label: 'Other', value: 'other' }
                ]}
              />
              <Input
                allowClear
                placeholder="Keywords (comma-separated)"
                value={keywords}
                onChange={(e) => { setKeywords(e.target.value); setPage(1) }}
                onPressEnter={() => { setPage(1); refetch() }}
              />
              <Button onClick={() => { setMediaTypes([]); setKeywords(''); setPage(1) }}>Clear</Button>
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] max-h-[60vh] overflow-auto">
          {isFetching ? <div className="flex items-center justify-center py-10"><Spin /></div> : (
            <List
              size="small"
              dataSource={displayedResults}
              locale={{ emptyText: <Empty description="No results" /> }}
              renderItem={(item) => (
                <List.Item key={`${item.kind}:${item.id}`} onClick={() => { setSelected(item); setAnalysis(''); loadExistingAnalyses(item) }} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2">
                  <div className="w-full">
                    <div className="flex items-center gap-2">
                      <Tag color={item.kind === 'media' ? 'blue' : 'gold'}>{item.kind.toUpperCase()}</Tag>
                      <Typography.Text strong ellipsis className="max-w-[18rem]">{item.title || String(item.id)}</Typography.Text>
                    </div>
                    {item.snippet && <div className="text-xs text-gray-500 truncate mt-0.5">{item.snippet}</div>}
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.meta?.type ? String(item.meta.type) : ''} {item.meta?.created_at ? `· ${new Date(item.meta.created_at).toLocaleString()}` : ''}</div>
                  </div>
                </List.Item>
              )}
            />
          )}
          {kinds.media && mediaTotal > 0 && (
            <div className="mt-3 flex justify-center">
              <Pagination
                size="small"
                current={page}
                pageSize={pageSize}
                total={mediaTotal}
                showSizeChanger
                onChange={(p, ps) => { setPage(p); setPageSize(ps) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right/center: analysis panel */}
      <div className="lg:col-span-2 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] min-h-[70vh]">
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="Select an item to review and analyze" />
          </div>
        ) : (
          <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag color={selected.kind === 'media' ? 'blue' : 'gold'}>{selected.kind.toUpperCase()}</Tag>
                <Typography.Title level={5} className="!mb-0">{selected.title || String(selected.id)}</Typography.Title>
              </div>
              <Space>
                <Tooltip title="Quick Review">
                  <Button icon={<SparklesIcon className="w-4 h-4" /> as any} onClick={() => runOneOff('review')} loading={loadingAnalysis}>Review</Button>
                </Tooltip>
                <Tooltip title="Summarize">
                  <Button icon={<FileTextIcon className="w-4 h-4" /> as any} onClick={() => runOneOff('summary')} loading={loadingAnalysis}>Summarize</Button>
                </Tooltip>
                {selected?.kind === 'media' && (
                  <Tooltip title="Attach analysis to media">
                    <Button icon={<PaperclipIcon className="w-4 h-4" /> as any} onClick={saveAnalysisToMedia} disabled={!analysis.trim()}>
                      Save to Media
                    </Button>
                  </Tooltip>
                )}
                <Tooltip title="Create a note from analysis">
                  <Button type="primary" icon={<SaveIcon className="w-4 h-4" /> as any} onClick={saveAnalysis} disabled={!analysis.trim()}>
                    Save to Notes
                  </Button>
                </Tooltip>
              </Space>
            </div>
            <Divider className="!my-2" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto">
                <Typography.Text type="secondary">Analysis</Typography.Text>
                <textarea className="w-full mt-2 min-h-[12rem] h-[28vh] max-h-[40vh] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]"
                  value={analysis}
                  onChange={(e) => setAnalysis(e.target.value)}
                  placeholder="Run Review or Summarize, then edit here..." />
              </div>
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto">
                <Typography.Text type="secondary">Existing Analyses</Typography.Text>
                {existingAnalyses.length === 0 ? (
                  <div className="text-xs text-gray-500 mt-2">No saved analyses for this item yet.</div>
                ) : (
                  <List
                    size="small"
                    dataSource={existingAnalyses}
                    renderItem={(n) => (
                      <List.Item className="!px-1">
                        <div>
                          <div className="text-xs font-medium">Note #{n?.id}</div>
                          <div className="text-xs text-gray-500 whitespace-pre-wrap max-w-[36rem]">{String(n?.content || '').slice(0, 400)}</div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewPage
