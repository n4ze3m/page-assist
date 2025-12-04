import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Storage } from '@plasmohq/storage'
import { bgRequest } from '@/services/background-proxy'
import { useServerOnline } from '@/hooks/useServerOnline'
import { useServerCapabilities } from '@/hooks/useServerCapabilities'
import { useDemoMode } from '@/context/demo-mode'
import { useMessageOption } from '@/hooks/useMessageOption'
import { useAntdMessage } from '@/hooks/useAntdMessage'
import FeatureEmptyState from '@/components/Common/FeatureEmptyState'
import { SearchBar } from '@/components/Media/SearchBar'
import { FilterPanel } from '@/components/Media/FilterPanel'
import { ResultsList } from '@/components/Media/ResultsList'
import { ContentViewer } from '@/components/Media/ContentViewer'
import { Pagination } from '@/components/Media/Pagination'

type ResultItem = {
  kind: 'media' | 'note'
  id: string | number
  title?: string
  snippet?: string
  meta?: Record<string, any>
  raw: any
}

const ViewMediaPage: React.FC = () => {
  const { t } = useTranslation(['review', 'common', 'settings'])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const { demoEnabled } = useDemoMode()

  // State
  const [query, setQuery] = useState<string>('')
  const [kinds, setKinds] = useState<{ media: boolean; notes: boolean }>({
    media: true,
    notes: false
  })
  const [selected, setSelected] = useState<ResultItem | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)
  const [mediaTotal, setMediaTotal] = useState<number>(0)
  const [mediaTypes, setMediaTypes] = useState<string[]>([])
  const [availableMediaTypes, setAvailableMediaTypes] = useState<string[]>([])
  const [keywordTokens, setKeywordTokens] = useState<string[]>([])
  const [selectedContent, setSelectedContent] = useState<string>('')
  const [selectedDetail, setSelectedDetail] = useState<any>(null)

  // Check media support
  const mediaUnsupported = !capsLoading && capabilities && !capabilities.hasMedia

  if (!isOnline && demoEnabled) {
    return (
      <div className="flex h-full items-center justify-center">
        <FeatureEmptyState
          title={t('review:mediaEmpty.offlineTitle', {
            defaultValue: 'Media API not available offline'
          })}
          description={t('review:mediaEmpty.offlineDescription', {
            defaultValue:
              'This feature requires connection to the tldw server. Please check your server connection.'
          })}
          examples={[]}
        />
      </div>
    )
  }

  if (!isOnline) {
    return (
      <div className="flex h-full items-center justify-center">
        <FeatureEmptyState
          title={t('review:mediaEmpty.offlineTitle', {
            defaultValue: 'Server offline'
          })}
          description={t('review:mediaEmpty.offlineDescription', {
            defaultValue: 'Please check your server connection.'
          })}
          examples={[]}
        />
      </div>
    )
  }

  if (isOnline && mediaUnsupported) {
    return (
      <FeatureEmptyState
        title={
          <span className="inline-flex items-center gap-2">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              {t('review:mediaEmpty.featureUnavailableBadge', {
                defaultValue: 'Feature unavailable'
              })}
            </span>
            <span>
              {t('review:mediaEmpty.offlineTitle', {
                defaultValue: 'Media API not available on this server'
              })}
            </span>
          </span>
        }
        description={t('review:mediaEmpty.offlineDescription', {
          defaultValue:
            'This tldw server does not advertise the Media endpoints (for example, /api/v1/media and /api/v1/media/search). Upgrade your server to a version that includes Media to use this workspace.'
        })}
        examples={[
          t('review:mediaEmpty.offlineExample1', {
            defaultValue:
              'Open Diagnostics to confirm your server version and available APIs.'
          }),
          t('review:mediaEmpty.offlineExample2', {
            defaultValue: 'After upgrading, reload the extension and return to Media.'
          })
        ]}
        primaryActionLabel={t('settings:healthSummary.diagnostics', {
          defaultValue: 'Open Diagnostics'
        })}
        onPrimaryAction={() => navigate('/settings/health')}
      />
    )
  }

  return <MediaPageContent />
}

const MediaPageContent: React.FC = () => {
  const { t } = useTranslation(['review', 'common'])
  const navigate = useNavigate()
  const message = useAntdMessage()
  const {
    setChatMode,
    setSelectedKnowledge,
    setRagMediaIds
  } = useMessageOption()

  const [query, setQuery] = useState<string>('')
  const [kinds, setKinds] = useState<{ media: boolean; notes: boolean }>({
    media: true,
    notes: false
  })
  const [selected, setSelected] = useState<ResultItem | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)
  const [mediaTotal, setMediaTotal] = useState<number>(0)
  const [mediaTypes, setMediaTypes] = useState<string[]>([])
  const [availableMediaTypes, setAvailableMediaTypes] = useState<string[]>([])
  const [keywordTokens, setKeywordTokens] = useState<string[]>([])
  const [selectedContent, setSelectedContent] = useState<string>('')
  const [selectedDetail, setSelectedDetail] = useState<any>(null)

  const deriveMediaMeta = (m: any): {
    type: string
    created_at?: string
    status?: any
    source?: string | null
    duration?: number | null
  } => {
    const rawType = m?.type ?? m?.media_type ?? ''
    const type = typeof rawType === 'string' ? rawType.toLowerCase().trim() : ''
    const status =
      m?.status ??
      m?.ingest_status ??
      m?.ingestStatus ??
      m?.processing_state ??
      m?.processingStatus

    let source: string | null = null
    const rawSource =
      (m?.source as string | null | undefined) ??
      (m?.origin as string | null | undefined) ??
      (m?.provider as string | null | undefined)
    if (typeof rawSource === 'string' && rawSource.trim().length > 0) {
      source = rawSource.trim()
    } else if (m?.url) {
      try {
        const u = new URL(String(m.url))
        const host = u.hostname.replace(/^www\./i, '')
        if (/youtube\.com|youtu\.be/i.test(host)) {
          source = 'YouTube'
        } else if (/vimeo\.com/i.test(host)) {
          source = 'Vimeo'
        } else if (/soundcloud\.com/i.test(host)) {
          source = 'SoundCloud'
        } else {
          source = host
        }
      } catch {
        // ignore URL parse errors
      }
    }

    let duration: number | null = null
    const rawDuration =
      (m?.duration as number | string | null | undefined) ??
      (m?.media_duration as number | string | null | undefined) ??
      (m?.length_seconds as number | string | null | undefined) ??
      (m?.duration_seconds as number | string | null | undefined)
    if (typeof rawDuration === 'number') {
      duration = rawDuration
    } else if (typeof rawDuration === 'string') {
      const n = Number(rawDuration)
      if (!Number.isNaN(n)) {
        duration = n
      }
    }

    return {
      type,
      created_at: m?.created_at,
      status,
      source,
      duration
    }
  }

  const runSearch = async (): Promise<ResultItem[]> => {
    const results: ResultItem[] = []
    const hasQuery = query.trim().length > 0
    const hasMediaFilters = mediaTypes.length > 0 || keywordTokens.length > 0

    if (kinds.media) {
      try {
        if (!hasQuery && !hasMediaFilters) {
          // Blank browse: GET listing with pagination
          const listing = await bgRequest<any>({
            path: `/api/v1/media/?page=${page}&results_per_page=${pageSize}` as any,
            method: 'GET' as any
          })
          const items = Array.isArray(listing?.items) ? listing.items : []
          const pagination = listing?.pagination
          setMediaTotal(Number(pagination?.total_items || items.length || 0))
          for (const m of items) {
            const id = m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid
            const meta = deriveMediaMeta(m)
            const type = meta.type
            if (type && !availableMediaTypes.includes(type)) {
              setAvailableMediaTypes((prev) =>
                prev.includes(type) ? prev : [...prev, type]
              )
            }
            results.push({
              kind: 'media',
              id,
              title: m?.title || m?.filename || `Media ${id}`,
              snippet: m?.snippet || m?.summary || '',
              meta: meta,
              raw: m
            })
          }
        } else {
          // Search with optional filters and pagination
          const body: any = {
            query: hasQuery ? query : null,
            fields: ['title', 'content'],
            sort_by: 'relevance'
          }
          if (mediaTypes.length > 0) body.media_types = mediaTypes
          if (keywordTokens.length > 0) body.must_have = keywordTokens
          const mediaResp = await bgRequest<any>({
            path: `/api/v1/media/search?page=${page}&results_per_page=${pageSize}` as any,
            method: 'POST' as any,
            headers: { 'Content-Type': 'application/json' },
            body
          })
          const items = Array.isArray(mediaResp?.items)
            ? mediaResp.items
            : Array.isArray(mediaResp?.results)
              ? mediaResp.results
              : []
          const pagination = mediaResp?.pagination
          setMediaTotal(Number(pagination?.total_items || items.length || 0))
          for (const m of items) {
            const id = m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid
            const meta = deriveMediaMeta(m)
            const type = meta.type
            if (type && !availableMediaTypes.includes(type)) {
              setAvailableMediaTypes((prev) =>
                prev.includes(type) ? prev : [...prev, type]
              )
            }
            results.push({
              kind: 'media',
              id,
              title: m?.title || m?.filename || `Media ${id}`,
              snippet: m?.snippet || m?.summary || '',
              meta: meta,
              raw: m
            })
          }
        }
      } catch (err) {
        console.error('Media search error:', err)
      }
    }

    return results
  }

  const { data: results = [], refetch } = useQuery({
    queryKey: [
      'media-search',
      query,
      kinds,
      mediaTypes,
      keywordTokens.join('|'),
      page,
      pageSize
    ],
    queryFn: runSearch,
    enabled: false
  })

  // Auto-refetch when paginating
  useEffect(() => {
    refetch()
  }, [page, pageSize, refetch])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [mediaTypes, keywordTokens])

  // Initial load: populate media types and auto-browse first page
  useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: 'local' })
        const cacheKey = 'reviewMediaTypesCache'
        const cached = (await storage.get(cacheKey).catch(() => null)) as {
          types?: string[]
          cachedAt?: number
        } | null
        const now = Date.now()
        const ttlMs = 24 * 60 * 60 * 1000 // 24h
        if (
          cached?.types &&
          Array.isArray(cached.types) &&
          typeof cached.cachedAt === 'number' &&
          now - cached.cachedAt < ttlMs
        ) {
          setAvailableMediaTypes(
            Array.from(new Set<string>(cached.types)) as string[]
          )
        }

        // Sample first up-to-3 pages to enrich types list
        const first = await bgRequest<any>({
          path: `/api/v1/media/?page=1&results_per_page=50` as any,
          method: 'GET' as any
        })
        const totalPages = Math.max(
          1,
          Number(first?.pagination?.total_pages || 1)
        )
        const pagesToFetch = [1, 2, 3].filter((p) => p <= totalPages)
        const listings = await Promise.all(
          pagesToFetch.map((p) =>
            p === 1
              ? Promise.resolve(first)
              : bgRequest<any>({
                  path: `/api/v1/media/?page=${p}&results_per_page=50` as any,
                  method: 'GET' as any
                })
          )
        )
        const typeSet = new Set<string>()
        for (const listing of listings) {
          const items = Array.isArray(listing?.items) ? listing.items : []
          for (const m of items) {
            const t = deriveMediaMeta(m).type
            if (t) typeSet.add(t)
          }
        }
        const newTypes = Array.from(typeSet)
        if (newTypes.length) {
          setAvailableMediaTypes((prev) =>
            Array.from(new Set<string>([...prev, ...newTypes])) as string[]
          )
          await storage.set(cacheKey, { types: newTypes, cachedAt: now })
        }
      } catch {}

      // Auto-browse: if there is no query or filters, fetch first page
      try {
        if (!query.trim() && mediaTypes.length === 0 && keywordTokens.length === 0) {
          await refetch()
        }
      } catch {}
    })()
  }, [])

  const fetchSelectedDetails = useCallback(async (item: ResultItem) => {
    try {
      if (item.kind === 'media') {
        const detail = await bgRequest<any>({
          path: `/api/v1/media/${item.id}` as any,
          method: 'GET' as any
        })
        return detail
      }
      if (item.kind === 'note') {
        return item.raw
      }
    } catch {}
    return null
  }, [])

  const contentFromDetail = (detail: any): string => {
    if (!detail) return ''
    const firstString = (...vals: any[]): string => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim().length > 0) return v
      }
      return ''
    }
    if (typeof detail === 'string') return detail
    if (typeof detail !== 'object') return ''

    const fromRoot = firstString(
      detail.content,
      detail.text,
      detail.raw_text,
      detail.rawText,
      detail.summary
    )
    if (fromRoot) return fromRoot

    const lv = detail.latest_version || detail.latestVersion
    if (lv && typeof lv === 'object') {
      const fromLatest = firstString(
        lv.content,
        lv.text,
        lv.raw_text,
        lv.rawText,
        lv.summary
      )
      if (fromLatest) return fromLatest
    }

    const data = detail.data
    if (data && typeof data === 'object') {
      const fromData = firstString(
        data.content,
        data.text,
        data.raw_text,
        data.rawText,
        data.summary
      )
      if (fromData) return fromData
    }

    return ''
  }

  // Load selected item content
  useEffect(() => {
    ;(async () => {
      try {
        if (!selected) {
          setSelectedContent('')
          return
        }
        const detail = await fetchSelectedDetails(selected)
        const content = contentFromDetail(detail)
        setSelectedContent(String(content || ''))
        setSelectedDetail(detail)
      } catch {
        setSelectedContent('')
        setSelectedDetail(null)
      }
    })()
  }, [selected, fetchSelectedDetails])

  const handleSearch = () => {
    setPage(1)
    refetch()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const selectedIndex = results.findIndex((r) => r.id === selected?.id)
  const hasPrevious = selectedIndex > 0
  const hasNext = selectedIndex >= 0 && selectedIndex < results.length - 1

  const handlePrevious = () => {
    if (hasPrevious) {
      setSelected(results[selectedIndex - 1])
    }
  }

  const handleNext = () => {
    if (hasNext) {
      setSelected(results[selectedIndex + 1])
    }
  }

  const handleChatWithMedia = useCallback(() => {
    if (!selected) return

    const title = selected.title || String(selected.id)
    const content = selectedContent || ''

    try {
      const payload = {
        mediaId: String(selected.id),
        title,
        content
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'tldw:discussMediaPrompt',
          JSON.stringify(payload)
        )
        try {
          window.dispatchEvent(
            new CustomEvent('tldw:discuss-media', {
              detail: payload
            })
          )
        } catch {
          // ignore event errors
        }
      }
    } catch {
      // ignore storage errors
    }
    setChatMode('normal')
    setSelectedKnowledge(null as any)
    setRagMediaIds(null)
    navigate('/')
    message.success(
      t(
        'review:reviewPage.chatPrepared',
        'Prepared chat with this media in the composer.'
      )
    )
  }, [selected, selectedContent, setChatMode, setSelectedKnowledge, setRagMediaIds, navigate, message, t])

  const handleChatAboutMedia = useCallback(() => {
    if (!selected) return

    const idNum = Number(selected.id)
    if (!Number.isFinite(idNum)) {
      message.warning(
        t(
          'review:reviewPage.chatAboutMediaInvalidId',
          'This media item does not have a numeric id yet.'
        )
      )
      return
    }
    setSelectedKnowledge(null as any)
    setRagMediaIds([idNum])
    setChatMode('rag')
    navigate('/')
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tldw:focus-composer'))
      }
    } catch {
      // ignore
    }
    message.success(
      t(
        'review:reviewPage.chatAboutMediaRagSent',
        'Opened media-scoped RAG chat.'
      )
    )
  }, [selected, setSelectedKnowledge, setRagMediaIds, setChatMode, navigate, message, t])

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left Sidebar */}
      <div
        className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-0' : 'w-96'
        }`}
        style={{ overflow: sidebarCollapsed ? 'hidden' : 'visible' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200">
          <h1 className="text-slate-900 text-base font-semibold">
            Media Inspector
          </h1>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div onKeyPress={handleKeyPress}>
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <button
            onClick={handleSearch}
            className="mt-2 w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-slate-200">
          <FilterPanel
            activeFilters={kinds}
            onFilterChange={setKinds}
            mediaTypes={availableMediaTypes}
            selectedMediaTypes={mediaTypes}
            onMediaTypesChange={setMediaTypes}
            keywords={[]}
            selectedKeywords={keywordTokens}
            onKeywordsChange={setKeywordTokens}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          <ResultsList
            results={results}
            selectedId={selected?.id || null}
            onSelect={(id) => {
              const item = results.find((r) => r.id === id)
              if (item) setSelected(item)
            }}
            totalCount={mediaTotal}
            loadedCount={results.length}
          />
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(mediaTotal / pageSize)}
          onPageChange={setPage}
          totalItems={mediaTotal}
          itemsPerPage={pageSize}
          currentItemsCount={results.length}
        />
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="relative w-6 bg-white border-r border-slate-200 hover:bg-slate-50 flex items-center justify-center group transition-colors"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <div className="flex items-center justify-center w-full h-full">
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          )}
        </div>
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <ContentViewer
          selectedMedia={selected}
          content={selectedContent}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          currentIndex={selectedIndex >= 0 ? selectedIndex : 0}
          totalResults={results.length}
          onChatWithMedia={handleChatWithMedia}
          onChatAboutMedia={handleChatAboutMedia}
        />
      </div>
    </div>
  )
}

export default ViewMediaPage
