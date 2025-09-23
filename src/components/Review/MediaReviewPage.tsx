import React from "react"
import { Input, Button, List, Spin, Space, Tag, Tooltip, Radio, Pagination, Empty, Select, Checkbox } from "antd"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { bgRequest } from "@/services/background-proxy"
import { useQuery } from "@tanstack/react-query"
import { tldwClient } from "@/services/tldw/TldwApiClient"

type MediaItem = {
  id: string | number
  title?: string
  snippet?: string
  type?: string
  created_at?: string
}

type MediaDetail = {
  id: string | number
  title?: string
  type?: string
  created_at?: string
  content?: string
  text?: string
  raw_text?: string
  summary?: string
  latest_version?: { content?: string }
}

const getContent = (d: MediaDetail): string => {
  if (!d) return ""
  return (
    d.content || d.text || d.raw_text || d.summary || d.latest_version?.content || ""
  )
}

export const MediaReviewPage: React.FC = () => {
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const [orientation, setOrientation] = React.useState<"vertical" | "horizontal">("vertical")
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([])
  const [details, setDetails] = React.useState<Record<string | number, MediaDetail>>({})
  const [availableTypes, setAvailableTypes] = React.useState<string[]>([])
  const [types, setTypes] = React.useState<string[]>([])
  const [keywordTokens, setKeywordTokens] = React.useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = React.useState<string[]>([])
  const [includeContent, setIncludeContent] = React.useState<boolean>(false)
  const [sidebarHidden, setSidebarHidden] = React.useState<boolean>(false)
  const [contentLoading, setContentLoading] = React.useState<boolean>(false)

  const fetchList = async (): Promise<MediaItem[]> => {
    const hasQuery = query.trim().length > 0
    if (hasQuery) {
      const body: any = { query, fields: ["title", "content"], sort_by: "relevance" }
      if (types.length > 0) body.media_types = types
      if (keywordTokens.length > 0) body.must_have = keywordTokens
      const res = await bgRequest<any>({
        path: `/api/v1/media/search?page=${page}&results_per_page=${pageSize}` as any,
        method: "POST" as any,
        headers: { "Content-Type": "application/json" },
        body
      })
      const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.results) ? res.results : [])
      const pagination = res?.pagination
      setTotal(Number(pagination?.total_items || items.length || 0))
      const mapped = items.map((m: any) => ({
        id: m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid,
        title: m?.title || m?.filename || `Media ${m?.id}`,
        snippet: m?.snippet || m?.summary || "",
        type: String(m?.type || m?.media_type || "").toLowerCase(),
        created_at: m?.created_at
      }))
      // Update available types
      const typeSet = new Set(availableTypes)
      for (const it of mapped) if (it.type) typeSet.add(it.type)
      setAvailableTypes(Array.from(typeSet))
      let filtered = mapped
      if (types.length > 0) filtered = filtered.filter((m) => m.type && types.includes(m.type))
      if (keywordTokens.length > 0) {
        const toks = keywordTokens.map((k) => k.toLowerCase())
        filtered = filtered.filter((m) => {
          const hay = `${m.title || ''} ${m.snippet || ''}`.toLowerCase()
          return toks.every((k) => hay.includes(k))
        })
      }
      if (includeContent && (keywordTokens.length > 0 || hasQuery)) {
        setContentLoading(true)
        // Fetch details to include content in filtering
        const enriched = await Promise.all(filtered.map(async (m) => {
          let d = details[m.id]
          if (!d) {
            try {
              d = await bgRequest<MediaDetail>({ path: `/api/v1/media/${m.id}` as any, method: 'GET' as any })
              setDetails((prev) => (prev[m.id] ? prev : { ...prev, [m.id]: d! }))
            } catch {}
          }
          const content = d ? (d.content || d.text || d.raw_text || d.summary || d.latest_version?.content || '') : ''
          return { m, content }
        }))
        const toks = keywordTokens.map((k) => k.toLowerCase())
        const ql = query.toLowerCase()
        filtered = enriched.filter(({ m, content }) => {
          const hay = `${m.title || ''} ${m.snippet || ''} ${content}`.toLowerCase()
          if (hasQuery && !hay.includes(ql)) return false
          if (toks.length > 0 && !toks.every((k) => hay.includes(k))) return false
          return true
        }).map(({ m }) => m)
        setContentLoading(false)
      }
      return filtered
    }
    // Browse listing when no query
    const res = await bgRequest<any>({ path: `/api/v1/media/?page=${page}&results_per_page=${pageSize}` as any, method: "GET" as any })
    const items = Array.isArray(res?.items) ? res.items : []
    const pagination = res?.pagination
    setTotal(Number(pagination?.total_items || items.length || 0))
    const mapped = items.map((m: any) => ({
      id: m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid,
      title: m?.title || m?.filename || `Media ${m?.id}`,
      snippet: m?.snippet || m?.summary || "",
      type: String(m?.type || m?.media_type || "").toLowerCase(),
      created_at: m?.created_at
    }))
    const typeSet = new Set(availableTypes)
    for (const it of mapped) if (it.type) typeSet.add(it.type)
    setAvailableTypes(Array.from(typeSet))
    let filtered = mapped
    if (types.length > 0) filtered = filtered.filter((m) => m.type && types.includes(m.type))
    if (keywordTokens.length > 0) {
      const toks = keywordTokens.map((k) => k.toLowerCase())
      filtered = filtered.filter((m) => {
        const hay = `${m.title || ''} ${m.snippet || ''}`.toLowerCase()
        return toks.every((k) => hay.includes(k))
      })
    }
    if (includeContent && (keywordTokens.length > 0 || query.trim().length > 0)) {
      setContentLoading(true)
      const enriched = await Promise.all(filtered.map(async (m) => {
        let d = details[m.id]
        if (!d) {
          try {
            d = await bgRequest<MediaDetail>({ path: `/api/v1/media/${m.id}` as any, method: 'GET' as any })
            setDetails((prev) => (prev[m.id] ? prev : { ...prev, [m.id]: d! }))
          } catch {}
        }
        const content = d ? (d.content || d.text || d.raw_text || d.summary || d.latest_version?.content || '') : ''
        return { m, content }
      }))
      const toks = keywordTokens.map((k) => k.toLowerCase())
      const ql = query.toLowerCase()
      filtered = enriched.filter(({ m, content }) => {
        const hay = `${m.title || ''} ${m.snippet || ''} ${content}`.toLowerCase()
        if (query.trim().length > 0 && !hay.includes(ql)) return false
        if (toks.length > 0 && !toks.every((k) => hay.includes(k))) return false
        return true
      }).map(({ m }) => m)
      setContentLoading(false)
    }
    return filtered
  }

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["media-review", query, page, pageSize],
    queryFn: fetchList,
    keepPreviousData: true
  })

  React.useEffect(() => {
    // auto fetch initial
    refetch()
  }, [])

  // Keyword suggestions: preload and on-demand search
  const loadKeywordSuggestions = React.useCallback(async (q?: string) => {
    try {
      const cfg = await tldwClient.getConfig()
      const base = String(cfg?.serverUrl || "").replace(/\/$/, "")
      if (q && q.trim().length > 0) {
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/keywords/search/?query=${encodeURIComponent(q)}&limit=10` as any, method: 'GET' as any })
        const arr = Array.isArray(abs) ? abs.map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || "")).filter(Boolean) : []
        setKeywordOptions(arr)
      } else {
        const abs = await bgRequest<any>({ path: `${base}/api/v1/notes/keywords/?limit=200` as any, method: 'GET' as any })
        const arr = Array.isArray(abs) ? abs.map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || "")).filter(Boolean) : []
        setKeywordOptions(arr)
      }
    } catch {}
  }, [])

  React.useEffect(() => { void loadKeywordSuggestions() }, [loadKeywordSuggestions])

  const toggleSelect = async (id: string | number) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id]
      return next
    })
    // Fetch detail lazily if not loaded
    if (!details[id]) {
      try {
        const d = await bgRequest<MediaDetail>({ path: `/api/v1/media/${id}` as any, method: 'GET' as any })
        setDetails((prev) => ({ ...prev, [id]: d }))
      } catch {}
    }
  }

  const orientationCls = orientation === 'vertical'
    ? 'flex flex-col gap-4'
    : 'flex flex-row flex-wrap gap-4'
  const cardCls = orientation === 'vertical'
    ? 'border rounded p-3 bg-gray-50 dark:bg-gray-800 w-full'
    : 'border rounded p-3 bg-gray-50 dark:bg-gray-800 w-full md:w-[48%]'

  const viewerItems = selectedIds.map((id) => details[id]).filter(Boolean)

  return (
    <div className="w-full h-[calc(100dvh-4rem)] mt-16 flex flex-col">
      <div className="shrink-0 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full">
          <Input
            placeholder="Search media (title/content)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={() => { setPage(1); refetch() }}
          />
          <Button type="primary" onClick={() => { setPage(1); refetch() }}>Search</Button>
          <Button onClick={() => { setQuery(""); setPage(1); refetch() }}>Clear</Button>
          <Select
            mode="multiple"
            allowClear
            placeholder="Types"
            className="min-w-[12rem]"
            value={types}
            onChange={(vals) => { setTypes(vals as string[]); setPage(1); refetch() }}
            options={availableTypes.map((t) => ({ label: t, value: t }))}
          />
          <Select
            mode="tags"
            allowClear
            showSearch
            placeholder="Keywords"
            className="min-w-[12rem]"
            value={keywordTokens}
            onSearch={(txt) => loadKeywordSuggestions(txt)}
            onChange={(vals) => { setKeywordTokens(vals as string[]); setPage(1); refetch() }}
            options={keywordOptions.map((k) => ({ label: k, value: k }))}
          />
          <Button onClick={() => { setTypes([]); setPage(1); refetch() }}>Reset Filters</Button>
          <Checkbox checked={includeContent} onChange={(e) => { setIncludeContent(e.target.checked); setPage(1); refetch() }}>Content {contentLoading && (<Spin size="small" className="ml-1" />)}</Checkbox>
        </div>
        <Radio.Group
          size="small"
          value={orientation}
          onChange={(e) => setOrientation(e.target.value)}
          options={[{ label: 'Vertical', value: 'vertical' }, { label: 'Horizontal', value: 'horizontal' }]}
          optionType="button"
        />
        <Tooltip title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}>
          <button
            onClick={() => setSidebarHidden((v) => !v)}
            className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
          >
            {sidebarHidden ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {sidebarHidden ? 'Show' : 'Hide'} sidebar
          </button>
        </Tooltip>
      </div>

      <div className={`flex-1 min-h-0 w-full grid gap-4 ${sidebarHidden ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {!sidebarHidden && (
        <div className="lg:col-span-1 border rounded p-2 bg-white dark:bg-[#171717] h-full overflow-auto">
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">Results</div>
          {isFetching ? (
            <div className="py-8 flex items-center justify-center"><Spin /></div>
          ) : (Array.isArray(data) && data.length > 0) ? (
            <>
              <List
                size="small"
                itemLayout="vertical"
                dataSource={data}
                renderItem={(item) => (
                  <List.Item
                    key={String(item.id)}
                    onClick={() => toggleSelect(item.id)}
                    className={`cursor-pointer ${selectedIds.includes(item.id) ? '!bg-gray-100 dark:!bg-gray-800' : ''}`}
                    actions={[
                      <Button size="small" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}>{selectedIds.includes(item.id) ? 'Remove' : 'View'}</Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={<span className="truncate inline-block max-w-full">{item.title}</span>}
                      description={
                        <Space size="small" wrap>
                          {item.type && <Tag>{item.type}</Tag>}
                          {item.created_at && <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</span>}
                        </Space>
                      }
                    />
                    {item.snippet && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{item.snippet}</div>
                    )}
                  </List.Item>
                )}
              />
              <div className="mt-2 flex justify-end">
                <Pagination size="small" current={page} pageSize={pageSize} total={total} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
              </div>
            </>
          ) : (
            <Empty description="No results" />
          )}
        </div>
        )}
        <div className={`${sidebarHidden ? 'lg:col-span-1' : 'lg:col-span-2'} border rounded p-2 bg-white dark:bg-[#171717] h-full overflow-auto`}>
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">Viewer</div>
          {viewerItems.length === 0 ? (
            <div className="text-sm text-gray-500">Select items on the left to view here.</div>
          ) : (
            <div className={orientationCls}>
              {viewerItems.map((d) => (
                <div key={String(d.id)} className={cardCls}>
                  <div className="mb-1 font-medium">{d.title || `Media ${d.id}`}</div>
                  <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
                    {d.type && <Tag>{String(d.type).toLowerCase()}</Tag>}
                    {d.created_at && <span>{new Date(d.created_at).toLocaleString()}</span>}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {getContent(d) || <span className="text-gray-500">No content available</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MediaReviewPage
