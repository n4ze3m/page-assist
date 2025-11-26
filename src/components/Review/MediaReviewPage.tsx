import React from "react"
import { Input, Button, Spin, Tag, Tooltip, Radio, Pagination, Empty, Select, Checkbox, Typography, Skeleton, Switch } from "antd"
import { useTranslation } from "react-i18next"
import { bgRequest } from "@/services/background-proxy"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useServerOnline } from "@/hooks/useServerOnline"
import { CopyIcon } from "lucide-react"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useAntdMessage } from "@/hooks/useAntdMessage"

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
  const firstString = (...vals: any[]): string => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim().length > 0) return v
    }
    return ""
  }
  if (typeof d === 'string') return d
  const root = firstString(d.content, d.text, (d as any).raw_text, (d as any).rawText, d.summary)
  if (root) return root
  const lv: any = (d as any).latest_version || (d as any).latestVersion
  if (lv && typeof lv === 'object') {
    const fromLatest = firstString(lv.content, lv.text, lv.raw_text, lv.rawText, lv.summary)
    if (fromLatest) return fromLatest
  }
  const data: any = (d as any).data
  if (data && typeof data === 'object') {
    const fromData = firstString(data.content, data.text, data.raw_text, data.rawText, data.summary)
    if (fromData) return fromData
  }
  return ""
}

export const MediaReviewPage: React.FC = () => {
  const { t } = useTranslation(['review'])
  const message = useAntdMessage()
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)
  const orientationStorageKey = "media-review-orientation"
  const [orientation, setOrientation] = React.useState<"vertical" | "horizontal">(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(orientationStorageKey) : null
    return stored === "horizontal" ? "horizontal" : "vertical"
  })
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([])
  const [details, setDetails] = React.useState<Record<string | number, MediaDetail>>({})
  const [availableTypes, setAvailableTypes] = React.useState<string[]>([])
  const [types, setTypes] = React.useState<string[]>([])
  const [keywordTokens, setKeywordTokens] = React.useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = React.useState<string[]>([])
  const [includeContent, setIncludeContent] = React.useState<boolean>(false)
  const [sidebarHidden, setSidebarHidden] = React.useState<boolean>(false)
  const [contentLoading, setContentLoading] = React.useState<boolean>(false)
  const [contentExpandedIds, setContentExpandedIds] = React.useState<Set<string>>(new Set())
  const [analysisExpandedIds, setAnalysisExpandedIds] = React.useState<Set<string>>(new Set())
  const [detailLoading, setDetailLoading] = React.useState<Record<string | number, boolean>>({})
  const [openAllLimit] = React.useState<number>(30)
  const [viewMode, setViewMode] = React.useState<"spread" | "list" | "all">("spread")
  const [focusedId, setFocusedId] = React.useState<string | number | null>(null)
  const [collapseOthers, setCollapseOthers] = React.useState<boolean>(false)
  const [pendingInitialMediaId, setPendingInitialMediaId] = React.useState<string | null>(() => {
    try {
      if (typeof window === "undefined") return null
      const raw = localStorage.getItem("tldw:lastMediaId")
      return raw || null
    } catch {
      return null
    }
  })
  const isOnline = useServerOnline()

  React.useEffect(() => {
    try {
      localStorage.setItem(orientationStorageKey, orientation)
    } catch {
      // ignore persistence errors
    }
  }, [orientation])

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
          const content = d ? getContent(d) : ''
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
        const content = d ? getContent(d) : ''
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
    // React Query v5: use placeholderData helper to keep previous data
    placeholderData: keepPreviousData,
    enabled: isOnline
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

  React.useEffect(() => { if (isOnline) void loadKeywordSuggestions() }, [loadKeywordSuggestions, isOnline])

  const ensureDetail = React.useCallback(async (id: string | number) => {
    if (details[id] || detailLoading[id]) return
    setDetailLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const d = await bgRequest<MediaDetail>({ path: `/api/v1/media/${id}` as any, method: 'GET' as any })
      const base = Array.isArray(data) ? (data as MediaItem[]).find((x) => x.id === id) : undefined
      const enriched = { ...d, id, title: (d as any)?.title ?? base?.title, type: (d as any)?.type ?? base?.type, created_at: (d as any)?.created_at ?? base?.created_at } as any
      setDetails((prev) => ({ ...prev, [id]: enriched }))
    } catch {
      // ignore detail fetch errors but clear loading flag
    } finally {
      setDetailLoading((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }, [data, detailLoading, details])

  const toggleSelect = async (id: string | number) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id]
      return next
    })
    void ensureDetail(id)
  }

  React.useEffect(() => {
    if (Array.isArray(data) && data.length > 0 && selectedIds.length === 0) {
      const firstId = data[0].id
      setSelectedIds([firstId])
      setFocusedId(firstId)
      void ensureDetail(firstId)
    }
  }, [data, selectedIds.length, ensureDetail])

  React.useEffect(() => {
    selectedIds.forEach((id) => {
      void ensureDetail(id)
    })
  }, [selectedIds, ensureDetail])

  const cardCls = orientation === 'vertical'
    ? 'border dark:border-gray-700 rounded p-3 bg-white dark:bg-[#171717] w-full'
    : 'border dark:border-gray-700 rounded p-3 bg-white dark:bg-[#171717] w-full md:w-[48%]'

  const allResults: MediaItem[] = Array.isArray(data) ? data : []
  const hasResults = allResults.length > 0
  const viewerItems = selectedIds.map((id) => details[id]).filter(Boolean)
  const visibleIds = viewMode === "spread"
    ? selectedIds
    : viewMode === "list"
      ? (focusedId != null ? [focusedId] : [])
      : selectedIds
  const focusedDetail = focusedId != null ? details[focusedId] : null
  const focusIndex = focusedId != null ? allResults.findIndex((r) => r.id === focusedId) : -1
  const listParentRef = React.useRef<HTMLDivElement | null>(null)
  const viewerParentRef = React.useRef<HTMLDivElement | null>(null)
  const cardRefs = React.useRef<Record<string, HTMLElement | null>>({})

  const listVirtualizer = useVirtualizer({
    count: allResults.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 110,
    overscan: 8,
    getItemKey: (index) => String((allResults[index] as any)?.id ?? index)
  })

  const viewerVirtualizer = useVirtualizer({
    count: viewMode === "spread" ? viewerItems.length : viewMode === "list" ? (focusedDetail ? 1 : 0) : viewerItems.length,
    getScrollElement: () => viewerParentRef.current,
    estimateSize: () => 520,
    overscan: 6,
    // allow dynamic measurement for long transcripts
    measureElement: (el) => el.getBoundingClientRect().height
  })

  const openAllCurrent = React.useCallback(() => {
    if (allResults.length === 0) return
    const slice = allResults.slice(0, Math.min(allResults.length, openAllLimit))
    setSelectedIds(slice.map((m) => m.id))
    slice.forEach((m) => void ensureDetail(m.id))
    if (allResults.length > openAllLimit) {
      message.info(
        t("mediaPage.openAllCapped", {
          defaultValue: "Showing first {{count}} items to keep things smooth",
          count: openAllLimit
        })
      )
    }
  }, [allResults, ensureDetail, openAllLimit, t])

  const expandAllContent = React.useCallback(() => {
    setContentExpandedIds(new Set(visibleIds.map((id) => String(id))))
  }, [visibleIds])
  const collapseAllContent = React.useCallback(() => setContentExpandedIds(new Set()), [])
  const expandAllAnalysis = React.useCallback(() => {
    setAnalysisExpandedIds(new Set(visibleIds.map((id) => String(id))))
  }, [visibleIds])
  const collapseAllAnalysis = React.useCallback(() => setAnalysisExpandedIds(new Set()), [])

  const scrollToCard = React.useCallback(
    (id: string | number) => {
      const anchor = cardRefs.current[String(id)]
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
      if (viewMode !== "all") {
        const idx = viewerItems.findIndex((m) => m.id === id)
        if (idx >= 0) viewerVirtualizer.scrollToIndex(idx, { align: "start" })
      }
    },
    [viewMode, viewerItems, viewerVirtualizer]
  )

  React.useEffect(() => {
    if (!pendingInitialMediaId) return
    if (!Array.isArray(allResults) || allResults.length === 0) return
    const match = allResults.find((m) => String(m.id) === pendingInitialMediaId)
    if (!match) return
    setSelectedIds([match.id])
    setFocusedId(match.id)
    void ensureDetail(match.id)
    scrollToCard(match.id)
    setPendingInitialMediaId(null)
    try {
      localStorage.removeItem("tldw:lastMediaId")
    } catch {
      // ignore storage errors
    }
  }, [pendingInitialMediaId, allResults, ensureDetail, scrollToCard])

  const goRelative = React.useCallback(
    (delta: number) => {
      if (allResults.length === 0) return
      const currentIdx = focusIndex >= 0 ? focusIndex : 0
      let next = currentIdx + delta
      if (next < 0) next = 0
      if (next >= allResults.length) next = allResults.length - 1
      const nextId = allResults[next]?.id
      if (nextId != null) {
        setFocusedId(nextId)
        void ensureDetail(nextId)
      }
    },
    [allResults, ensureDetail, focusIndex]
  )

  const renderCard = (
    d: MediaDetail,
    idx: number,
    opts?: {
      virtualRow?: VirtualItem
      isAllMode?: boolean
    }
  ) => {
    if (!d) return null
    const { virtualRow, isAllMode } = opts || {}
    const key = String(d.id)
    const content = getContent(d) || ""
    const analysisText = d.summary || (d as any)?.analysis || ""
    const contentIsLong = content.length > 2000
    const analysisIsLong = analysisText.length > 1600
    const contentExpanded = contentExpandedIds.has(key)
    const analysisExpanded = analysisExpandedIds.has(key)
    const contentShown = !contentIsLong || contentExpanded ? content : `${content.slice(0, 2000)}…`
    const analysisShown = !analysisIsLong || analysisExpanded ? analysisText : `${analysisText.slice(0, 1600)}…`
    const isLoadingDetail = detailLoading[d.id]
    const rawSource = (d as any)?.source || (d as any)?.url || (d as any)?.original_url
    const source =
      rawSource && typeof rawSource === "object"
        ? (rawSource.url || rawSource.title || rawSource.href || "")
        : rawSource
    const transcriptLen = content?.length ? Math.round(content.length / 1000) : null

    const style =
      virtualRow != null
        ? {
            position: "absolute" as const,
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${virtualRow.start}px)`
          }
        : undefined

    return (
      <div
        key={key}
        ref={(el) => {
          if (virtualRow) viewerVirtualizer.measureElement(el)
          cardRefs.current[key] = el
        }}
        data-index={virtualRow?.index ?? idx}
        style={style}
        className={`${cardCls} shadow-sm`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold leading-tight flex items-center gap-2">
              <span>{d.title || `${t('mediaPage.media', 'Media')} ${d.id}`}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1 flex-wrap">
              {isAllMode && <Tag>{t("mediaPage.stackPosition", "#{{num}}", { num: idx + 1 })}</Tag>}
              {d.type && <Tag>{String(d.type).toLowerCase()}</Tag>}
              {d.created_at && <span>{new Date(d.created_at).toLocaleString()}</span>}
              {(d as any)?.duration && <span>{t("mediaPage.duration", "{{value}}", { value: (d as any).duration })}</span>}
              {source && <span className="truncate max-w-[10rem]">{String(source)}</span>}
              {transcriptLen ? <span>{t("mediaPage.transcriptLength", "{{k}}k chars", { k: transcriptLen })}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {viewMode === "spread" && (
              <Button size="small" onClick={() => toggleSelect(d.id)}>
                {t("mediaPage.remove", "Remove")}
              </Button>
            )}
            <Tooltip title={t('mediaPage.copyContent', 'Copy content')}>
              <Button
                size="small"
                onClick={async () => {
                  const full = content
                  try { await navigator.clipboard.writeText(full); message.success(t('mediaPage.contentCopied', 'Content copied')) }
                  catch { message.error(t('mediaPage.copyFailed', 'Copy failed')) }
                }}
                icon={(<CopyIcon className="w-4 h-4" />) as any}
              >
                {t("mediaPage.copyLabel", "Copy")}
              </Button>
            </Tooltip>
            <Tooltip title={t('mediaPage.copyAnalysis', 'Copy analysis')}>
              <Button
                size="small"
                onClick={async () => {
                  const full = analysisText || ""
                  try { await navigator.clipboard.writeText(full); message.success(t('mediaPage.analysisCopied', 'Analysis copied')) }
                  catch { message.error(t('mediaPage.copyFailed', 'Copy failed')) }
                }}
                icon={(<CopyIcon className="w-4 h-4" />) as any}
              >
                {t("mediaPage.shareLabel", "Share")}
              </Button>
            </Tooltip>
          </div>
        </div>

        <div className="mt-3 rounded border dark:border-gray-700 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Typography.Text type="secondary">{t('mediaPage.mediaContent', 'Media Content')}</Typography.Text>
              {isLoadingDetail && <Spin size="small" />}
            </div>
            <Button
              size="small"
              type="text"
              icon={contentExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              onClick={() => {
                setContentExpandedIds((prev) => {
                  const next = collapseOthers ? new Set<string>() : new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }}
            >
              {contentExpanded ? t('mediaPage.collapse', 'Collapse') : t('mediaPage.expand', 'Expand')}
            </Button>
          </div>
          <div className="mt-2 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300 min-h-[8rem] leading-relaxed">
            {isLoadingDetail ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : content ? (
              contentShown
            ) : (
              <span className="text-gray-500">{t('mediaPage.noContent', 'No content available')}</span>
            )}
          </div>
        </div>

        <div className="mt-3 rounded border dark:border-gray-700 p-2">
          <div className="flex items-center justify-between">
            <Typography.Text type="secondary">{t("mediaPage.analysis", "Analysis")}</Typography.Text>
            <Button
              size="small"
              type="text"
              icon={analysisExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              onClick={() => {
                setAnalysisExpandedIds((prev) => {
                  const next = collapseOthers ? new Set<string>() : new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }}
            >
              {analysisExpanded ? t('mediaPage.collapse', 'Collapse') : t('mediaPage.expand', 'Expand')}
            </Button>
          </div>
          <div className="mt-2 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {isLoadingDetail ? (
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            ) : analysisText ? (
              analysisShown
            ) : (
              <span className="text-gray-500">{t("mediaPage.noAnalysis", "No analysis available")}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[calc(100dvh-4rem)] mt-16 flex flex-col">
      <div className="shrink-0 mb-3 flex items-center justify-between gap-3">
        <div className="w-full">
          <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            {t(
              'mediaPage.modeHint',
              'Search and stack multiple media items to compare them in the viewer on the right.'
            )}
          </p>
          <div className="flex items-center gap-2 w-full">
            <Input
              placeholder={t('mediaPage.searchPlaceholder', 'Search media (title/content)')}
              aria-label={
                t(
                  'mediaPage.searchPlaceholder',
                  'Search media (title/content)'
                ) as string
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={() => { setPage(1); refetch() }}
            />
          </div>
          <div className="flex items-center gap-2 w-full mt-2">
            <Button type="primary" onClick={() => { setPage(1); refetch() }}>{t('mediaPage.search', 'Search')}</Button>
            <Button onClick={() => { setQuery(""); setPage(1); refetch() }}>{t('mediaPage.clear', 'Clear')}</Button>
            <Select
              mode="multiple"
              allowClear
              placeholder={t('mediaPage.types', 'Media types')}
              aria-label={
                t('mediaPage.types', 'Media types') as string
              }
              className="min-w-[12rem]"
              value={types}
              onChange={(vals) => { setTypes(vals as string[]); setPage(1); refetch() }}
              options={availableTypes.map((t) => ({ label: t, value: t }))}
            />
            <Select
              mode="tags"
              allowClear
              showSearch
              placeholder={t('mediaPage.keywords', 'Keywords')}
              aria-label={
                t('mediaPage.keywords', 'Keywords') as string
              }
              className="min-w-[12rem]"
              value={keywordTokens}
              onSearch={(txt) => loadKeywordSuggestions(txt)}
              onChange={(vals) => { setKeywordTokens(vals as string[]); setPage(1); refetch() }}
              options={keywordOptions.map((k) => ({ label: k, value: k }))}
            />
            <Button onClick={() => { setTypes([]); setKeywordTokens([]); setPage(1); refetch() }}>{t('mediaPage.resetFilters', 'Clear filters')}</Button>
            <Checkbox checked={includeContent} onChange={(e) => { setIncludeContent(e.target.checked); setPage(1); refetch() }}>{t('mediaPage.content', 'Content')} {contentLoading && (<Spin size="small" className="ml-1" />)}</Checkbox>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t(
              'mediaPage.filterHelp',
              'Search matches title and content; Types and Keywords further narrow the results.'
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full gap-4">
        {!sidebarHidden && (
          <div className="w-full lg:w-1/3 border rounded p-2 bg-white dark:bg-[#171717] h-full flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <div
                className="text-sm text-gray-600 dark:text-gray-300"
                role="heading"
                aria-level={2}
                data-testid="media-review-results-header"
              >
                {t("mediaPage.results", "Results")}{" "}
                {hasResults ? `(${allResults.length})` : ""}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                {hasResults && (
                  <span>
                    {t('mediaPage.resultsCount', '{{selected}} selected · {{open}} open', {
                      selected: selectedIds.length,
                      open: viewerItems.length
                    })}
                  </span>
                )}
                <span>{t("mediaPage.resultsHint", "Click to stack items into the viewer")}</span>
                {selectedIds.length > 0 && (
                  <Button
                    size="small"
                    type="link"
                    className="!px-1"
                    onClick={() => setSelectedIds([])}
                  >
                    {t('mediaPage.clearSelection', 'Deselect all')}
                  </Button>
                )}
              </div>
            </div>
            {isFetching && (
              <div
                className="mb-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800 dark:border-blue-500 dark:bg-[#102a43] dark:text-blue-100"
                role="status"
                aria-live="polite">
                {t("mediaPage.searchingBanner", "Searching media…")}
              </div>
            )}
            {isFetching && !hasResults ? (
              <div className="relative flex-1 min-h-0 overflow-auto rounded border border-dashed border-gray-200 dark:border-gray-700">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="px-3 py-2">
                      <Skeleton
                        active
                        title={{ width: "60%" }}
                        paragraph={{ rows: 2, width: ["40%", "80%"] }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : hasResults ? (
              <>
                <div ref={listParentRef} className="relative flex-1 min-h-0 overflow-auto rounded border border-dashed border-gray-200 dark:border-gray-700">
                  <div
                    style={{
                      height: `${listVirtualizer.getTotalSize()}px`,
                      position: "relative",
                      width: "100%"
                    }}
                  >
                    {listVirtualizer.getVirtualItems().map((virtualRow) => {
                      const item = allResults[virtualRow.index]
                      const isSelected = selectedIds.includes(item.id)
                      return (
                        <div
                          key={item.id}
                          data-index={virtualRow.index}
                          role="button"
                          aria-selected={isSelected}
                          tabIndex={0}
                          onClick={() => toggleSelect(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              toggleSelect(item.id)
                            }
                          }}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`
                          }}
                          className={`px-3 py-2 border-b dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{item.title}</div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                                {item.type && <Tag>{item.type}</Tag>}
                                {item.created_at && <span>{new Date(item.created_at).toLocaleString()}</span>}
                              </div>
                              {item.snippet && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {item.snippet}
                                </div>
                              )}
                            </div>
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelect(item.id)
                              }}
                            >
                              {isSelected ? t("mediaPage.remove", "Remove") : t("mediaPage.view", "View")}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{t("mediaPage.paginationHint", "Use pagination or open all visible items")}</div>
                  <Pagination size="small" current={page} pageSize={pageSize} total={total} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
                </div>
              </>
            ) : (
              <Empty description={t("mediaPage.noResults", "No results")} />
            )}
          </div>
        )}
        {/* Toggle bar between sidebar and viewer */}
        <div className="w-6 flex-shrink-0 h-full flex items-center">
          <button
            title={sidebarHidden ? t('mediaPage.showSidebar', 'Show sidebar') : t('mediaPage.hideSidebar', 'Hide sidebar')}
            aria-label={
              sidebarHidden
                ? (t('mediaPage.showSidebar', 'Show sidebar') as string)
                : (t('mediaPage.hideSidebar', 'Hide sidebar') as string)
            }
            onClick={() => setSidebarHidden((v) => !v)}
            className="h-full w-6 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300"
          >
            {sidebarHidden ? '>>' : '<<'}
          </button>
        </div>
        <div className="flex-1 border rounded p-2 bg-white dark:bg-[#171717] h-full flex flex-col min-w-0 relative">
          <div className="sticky top-0 z-20 bg-white dark:bg-[#171717] pb-2 border-b dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">{t('mediaPage.viewer', 'Viewer')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {viewMode === "spread"
                      ? t("mediaPage.viewerCount", "{{count}} open", { count: viewerItems.length })
                      : viewMode === "list"
                        ? t("mediaPage.viewerSingle", "Single item view")
                        : t("mediaPage.viewerAll", "All items (stacked)")}
                  </div>
                </div>
                <Radio.Group
                  value={viewMode}
                  onChange={(e) => {
                    const next = e.target.value as "spread" | "list" | "all"
                    setViewMode(next)
                    if (next === "list") {
                      const id = focusedId ?? selectedIds[0] ?? allResults[0]?.id
                      if (id != null) {
                        setFocusedId(id)
                        void ensureDetail(id)
                      }
                    } else if (next === "all") {
                      const ids = selectedIds.length > 0 ? selectedIds : allResults.slice(0, openAllLimit).map((m) => m.id)
                      setSelectedIds(ids)
                      ids.forEach((id) => void ensureDetail(id))
                    }
                  }}
                  optionType="button"
                  size="small"
                  options={[
                    { label: t("mediaPage.spreadMode", "Spread"), value: "spread" },
                    { label: t("mediaPage.listMode", "List"), value: "list" },
                    { label: t("mediaPage.allMode", "All"), value: "all" }
                  ]}
                />
                {viewMode === "list" && (
                  <Select
                    size="small"
                    className="min-w-[12rem]"
                    placeholder={t("mediaPage.pickItem", "Pick an item")}
                    value={focusedId ?? undefined}
                    onChange={(val) => {
                      setFocusedId(val as any)
                      void ensureDetail(val as any)
                    }}
                    options={allResults.map((m, idx) => ({
                      label: `${idx + 1}. ${m.title || `Media ${m.id}`}`,
                      value: m.id
                    }))}
                  />
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                  <span>{t("mediaPage.layoutLabel", "Layout (helps with long, stacked review)")}</span>
                  <Radio.Group
                    size="small"
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value)}
                    options={[
                      { label: t('mediaPage.vertical', 'Vertical'), value: 'vertical' },
                      { label: t('mediaPage.horizontal', 'Horizontal'), value: 'horizontal' }
                    ]}
                    optionType="button"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-300">
                  <span>{t("mediaPage.collapseOthers", "Collapse others on expand")}</span>
                  <Switch size="small" checked={collapseOthers} onChange={setCollapseOthers} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {viewMode === "spread" && (
                  <Button size="small" onClick={openAllCurrent}>
                    {t("mediaPage.openAll", "Review all on page")} ({Math.min(allResults.length, openAllLimit)})
                  </Button>
                )}
                <Button size="small" onClick={() => goRelative(-1)} disabled={focusIndex <= 0}>
                  {t("mediaPage.prevItem", "Prev item")}
                </Button>
                <Button size="small" onClick={() => goRelative(1)} disabled={focusIndex < 0 || focusIndex >= allResults.length - 1}>
                  {t("mediaPage.nextItem", "Next item")}
                </Button>
                <Button size="small" onClick={expandAllContent} type="default">
                  {t("mediaPage.expandAllContent", "Expand all content")}
                </Button>
                <Button size="small" onClick={collapseAllContent} type="text">
                  {t("mediaPage.collapseAllContent", "Collapse content")}
                </Button>
                <Button size="small" onClick={expandAllAnalysis} type="default">
                  {t("mediaPage.expandAllAnalysis", "Expand all analysis")}
                </Button>
                <Button size="small" onClick={collapseAllAnalysis} type="text">
                  {t("mediaPage.collapseAllAnalysis", "Collapse analysis")}
                </Button>
                <Tooltip
                  title={
                    t(
                      'mediaPage.viewerHelp',
                      'Keyboard: Tab into the results list, use Enter or Space to stack or unstack a media item, then use Prev/Next and layout controls to move through items in the viewer.'
                    ) as string
                  }
                >
                  <Button
                    size="small"
                    shape="circle"
                    type="text"
                    aria-label={t(
                      'mediaPage.viewerHelpLabel',
                      'Multi-Item Review keyboard shortcuts'
                    ) as string}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ?
                  </Button>
                </Tooltip>
              </div>
            </div>
            {selectedIds.length > 0 && (
              <div className="mt-2 flex items-center gap-2 overflow-x-auto text-xs text-gray-600 dark:text-gray-300">
                <span className="font-medium">{t("mediaPage.openMiniMap", "Open items")}</span>
                {selectedIds.map((id, idx) => {
                  const d = details[id]
                  return (
                    <Button
                      key={String(id)}
                      size="small"
                      type={focusedId === id ? "primary" : "default"}
                      onClick={() => {
                        setFocusedId(id)
                        scrollToCard(id)
                      }}
                    >
                      {idx + 1}. {d?.title || `${t('mediaPage.media', 'Media')} ${id}`} {d?.type ? `(${String(d.type)})` : ""}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="flex flex-1 min-h-0 gap-3">
            <div className="flex-1 flex flex-col min-h-0">
              {viewerItems.length === 0 ? (
                <div className="text-sm text-gray-500">{t('mediaPage.selectItemsHint', 'Select items on the left to view here.')}</div>
              ) : (
                <>
                  {viewMode === "spread" && (
                    <div className="sticky top-[3.5rem] z-10 bg-white dark:bg-[#171717] py-1 flex gap-2 overflow-x-auto border-b dark:border-gray-800">
                      {selectedIds.map((id, idx) => {
                        const d = details[id]
                        return (
                          <Button
                            key={String(id)}
                            size="small"
                            type="default"
                            onClick={() => scrollToCard(id)}
                          >
                            {idx + 1}. {d?.title || `${t('mediaPage.media', 'Media')} ${id}`}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                  <div
                    ref={viewMode === "all" ? undefined : viewerParentRef}
                    className={`relative flex-1 min-h-0 ${viewMode === "all" ? "overflow-visible" : "overflow-auto"}`}
                  >
                    {viewMode === "all" ? (
                      <div className="space-y-3">
                        {viewerItems.map((d, idx) => renderCard(d, idx, { isAllMode: true }))}
                      </div>
                    ) : (
                      <div
                        style={{
                          height: `${viewerVirtualizer.getTotalSize()}px`,
                          position: "relative"
                        }}
                      >
                        {viewerVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                          const d = viewMode === "spread" ? viewerItems[virtualRow.index] : viewMode === "list" ? focusedDetail : viewerItems[virtualRow.index]
                          if (!d) return null
                          return renderCard(d, virtualRow.index, { virtualRow })
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {selectedIds.length > 0 && (
              <div className="w-52 sticky top-[4.5rem] self-start max-h-[calc(100vh-8rem)] overflow-auto border-l dark:border-gray-800 pl-2">
                <div className="text-xs text-gray-500 dark:text-gray-300 mb-1">
                  {t("mediaPage.miniMapTitle", "Jump to item")}
                </div>
                <div className="space-y-1">
                  {selectedIds.map((id, idx) => {
                    const d = details[id]
                    const label = d?.title || `${t('mediaPage.media', 'Media')} ${id}`
                    const type = d?.type ? String(d.type).toLowerCase() : undefined
                    return (
                      <Button
                        key={String(id)}
                        size="small"
                        block
                        type={focusedId === id ? "primary" : "default"}
                        onClick={() => {
                          setFocusedId(id)
                          scrollToCard(id)
                        }}
                      >
                        {idx + 1}. {label} {type ? `(${type})` : ""}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaReviewPage
