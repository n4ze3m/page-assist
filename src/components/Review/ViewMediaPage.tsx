import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
import { JumpToNavigator } from '@/components/Media/JumpToNavigator'
import type { MediaResultItem } from '@/components/Media/types'

const ViewMediaPage: React.FC = () => {
  const { t } = useTranslation(['review', 'common', 'settings'])
  const navigate = useNavigate()
  const isOnline = useServerOnline()
  const { capabilities, loading: capsLoading } = useServerCapabilities()
  const { demoEnabled } = useDemoMode()

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
            'This workspace depends on Media Review support in your tldw server. You can continue using chat, notes, and other tools while you upgrade to a version that includes Media.'
        })}
        examples={[
          t('review:mediaEmpty.offlineExample1', {
            defaultValue:
              'Open Diagnostics to confirm your server version and available APIs.'
          }),
          t('review:mediaEmpty.offlineExample2', {
            defaultValue: 'After upgrading, reload the extension and return to Media.'
          }),
          t('review:mediaEmpty.offlineTechnicalDetails', {
            defaultValue:
              'Technical details: this tldw server does not advertise the Media endpoints (for example, /api/v1/media and /api/v1/media/search).'
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

const extractKeywordsFromMedia = (m: any): string[] => {
  const possibleKeywordFields = [
    m?.metadata?.keywords,
    m?.keywords,
    m?.tags,
    m?.metadata?.tags,
    m?.processing?.keywords
  ]

  for (const field of possibleKeywordFields) {
    if (field && Array.isArray(field) && field.length > 0) {
      const keywords = field
        .map((k: any) => {
          if (typeof k === 'string') return k
          if (k && typeof k === 'object' && k.keyword) return k.keyword
          if (k && typeof k === 'object' && k.text) return k.text
          if (k && typeof k === 'object' && k.tag) return k.tag
          if (k && typeof k === 'object' && k.name) return k.name
          return null
        })
        .filter((k): k is string => k !== null && k.trim().length > 0)

      if (keywords.length > 0) return keywords
    }
  }
  return []
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
  const [selected, setSelected] = useState<MediaResultItem | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)
  const [mediaTotal, setMediaTotal] = useState<number>(0)
  const [notesTotal, setNotesTotal] = useState<number>(0)
  const [mediaTypes, setMediaTypes] = useState<string[]>([])
  const [availableMediaTypes, setAvailableMediaTypes] = useState<string[]>([])
  const [keywordTokens, setKeywordTokens] = useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = useState<string[]>([])
  const [selectedContent, setSelectedContent] = useState<string>('')
  const [selectedDetail, setSelectedDetail] = useState<any>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)
  const contentDivRef = React.useRef<HTMLDivElement | null>(null)

  // Measure content height whenever content changes
  useEffect(() => {
    const measureHeight = () => {
      if (contentDivRef.current) {
        const height = contentDivRef.current.scrollHeight
        setContentHeight(height)
      }
    }

    // Measure after a short delay to ensure content is rendered
    const timer = setTimeout(measureHeight, 200)

    // Set up ResizeObserver for dynamic updates
    let observer: ResizeObserver | null = null
    if (contentDivRef.current) {
      observer = new ResizeObserver(measureHeight)
      observer.observe(contentDivRef.current)
    }

    return () => {
      clearTimeout(timer)
      if (observer) observer.disconnect()
    }
    // Note: contentDivRef excluded as refs are stable
  }, [selectedContent, selected])

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    contentDivRef.current = node
    if (node) {
      // Initial measurement
      setTimeout(() => {
        const height = node.scrollHeight
        setContentHeight(height)
      }, 100)
    }
  }, [])

  const runSearch = useCallback(async (): Promise<MediaResultItem[]> => {
    const results: MediaResultItem[] = []
    const hasQuery = query.trim().length > 0
    const hasMediaFilters = mediaTypes.length > 0 || keywordTokens.length > 0

    if (kinds.media) {
      try {
        if (!hasQuery && !hasMediaFilters) {
          // Blank browse: GET listing with pagination
          const listing = await bgRequest<any>({
            path: `/api/v1/media/?page=${page}&results_per_page=${pageSize}&include_keywords=true` as any,
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
            const keywords = extractKeywordsFromMedia(m)

            results.push({
              kind: 'media',
              id,
              title: m?.title || m?.filename || `Media ${id}`,
              snippet: m?.snippet || m?.summary || '',
              keywords,
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
            path: `/api/v1/media/search?page=${page}&results_per_page=${pageSize}&include_keywords=true` as any,
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
            const keywords = extractKeywordsFromMedia(m)

            results.push({
              kind: 'media',
              id,
              title: m?.title || m?.filename || `Media ${id}`,
              snippet: m?.snippet || m?.summary || '',
              keywords,
              meta: meta,
              raw: m
            })
          }
        }
      } catch (err) {
        console.error('Media search error:', err)
      }
    }

    // Fetch notes if enabled
    if (kinds.notes) {
      try {
        // Helper to extract keywords from note
        const extractNoteKeywords = (note: any): string[] => {
          const possibleFields = [
            note?.metadata?.keywords,
            note?.keywords,
            note?.tags
          ]
          for (const field of possibleFields) {
            if (field && Array.isArray(field) && field.length > 0) {
              return field
                .map((k: any) => {
                  if (typeof k === 'string') return k
                  if (k && typeof k === 'object' && k.keyword) return k.keyword
                  if (k && typeof k === 'object' && k.text) return k.text
                  return null
                })
                .filter((k): k is string => k !== null && k.trim().length > 0)
            }
          }
          return []
        }

        if (hasQuery) {
          // Search notes with server-side pagination.
          // Prefer POST /api/v1/notes/search/ with SearchRequest so the server can
          // apply keyword filtering; fall back to GET on older servers.
          const keywordFilterActive = keywordTokens.length > 0
          let notesResp: any
          let usedKeywordServerFilter = false

          try {
            const body: any = { query }
            if (keywordFilterActive) {
              body.must_have = keywordTokens
              usedKeywordServerFilter = true
            }
            notesResp = await bgRequest<any>({
              path: `/api/v1/notes/search/?page=${page}&results_per_page=${pageSize}&include_keywords=true` as any,
              method: 'POST' as any,
              headers: { 'Content-Type': 'application/json' },
              body
            })
          } catch {
            // Fallback: legacy GET search without keyword-aware pagination
            usedKeywordServerFilter = false
            notesResp = await bgRequest<any>({
              path: `/api/v1/notes/search/?query=${encodeURIComponent(
                query
              )}&page=${page}&results_per_page=${pageSize}&include_keywords=true` as any,
              method: 'GET' as any
            })
          }

          const items = Array.isArray(notesResp) ? notesResp : (notesResp?.items || [])
          const pagination = notesResp?.pagination

          // If the API cannot filter by keywords, apply client-side filtering and
          // base the total on the filtered subset so pagination reflects what is visible.
          let filteredItems = items
          if (keywordFilterActive && !usedKeywordServerFilter) {
            filteredItems = items.filter((n: any) => {
              const noteKws = extractNoteKeywords(n)
              return keywordTokens.some((kw) =>
                noteKws.some((nkw) => nkw.toLowerCase().includes(kw.toLowerCase()))
              )
            })
          }

          if (keywordFilterActive && !usedKeywordServerFilter) {
            setNotesTotal(filteredItems.length)
          } else {
            setNotesTotal(
              Number(pagination?.total_items || items.length || 0)
            )
          }

          for (const n of filteredItems) {
            const id = n?.id ?? n?.note_id ?? n?.pk ?? n?.uuid
            results.push({
              kind: 'note',
              id,
              title: n?.title || `Note ${id}`,
              snippet: n?.content?.substring(0, 200) || '',
              keywords: extractNoteKeywords(n),
              meta: {
                type: 'note',
                source: n?.metadata?.conversation_id ? 'conversation' : null
              },
              raw: n
            })
          }
        } else {
          // Browse notes with pagination
          const notesResp = await bgRequest<any>({
            path: `/api/v1/notes/?page=${page}&results_per_page=${pageSize}` as any,
            method: 'GET' as any
          })
          const items = Array.isArray(notesResp?.items) ? notesResp.items : []
          const pagination = notesResp?.pagination
          setNotesTotal(Number(pagination?.total_items || items.length || 0))

          for (const n of items) {
            const id = n?.id ?? n?.note_id ?? n?.pk ?? n?.uuid
            results.push({
              kind: 'note',
              id,
              title: n?.title || `Note ${id}`,
              snippet: n?.content?.substring(0, 200) || '',
              keywords: extractNoteKeywords(n),
              meta: {
                type: 'note',
                source: n?.metadata?.conversation_id ? 'conversation' : null
              },
              raw: n
            })
          }
        }
      } catch (err) {
        console.error('Notes search error:', err)
      }
    }

    return results
  }, [
    query,
    kinds,
    mediaTypes,
    keywordTokens,
    page,
    pageSize,
    availableMediaTypes
  ])

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
        // Always fetch on mount - filters are guaranteed empty at this point
        await refetch()
      } catch {}
    })()
  }, []) // Intentionally empty - runs only on mount with initial (empty) filters

  // Load keyword suggestions for the filter dropdown
  const loadKeywordSuggestions = useCallback(async (searchText?: string) => {
    try {
      // Try to get keywords from media API
      const endpoint = searchText && searchText.trim().length > 0
        ? `/api/v1/media/keywords/search?query=${encodeURIComponent(searchText)}&limit=20`
        : `/api/v1/media/keywords?limit=50`

      const response = await bgRequest<any>({
        path: endpoint as any,
        method: 'GET' as any
      })

      let keywords: string[] = []
      if (Array.isArray(response)) {
        keywords = response
          .map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || x?.name || (typeof x === 'string' ? x : '')))
          .filter(Boolean)
      } else if (response?.items && Array.isArray(response.items)) {
        keywords = response.items
          .map((x: any) => String(x?.keyword || x?.keyword_text || x?.text || x?.name || (typeof x === 'string' ? x : '')))
          .filter(Boolean)
      }

      setKeywordOptions(keywords)
    } catch {
      // Fallback: collect keywords from current results
      const keywordsFromResults = new Set<string>()
      for (const result of results) {
        if (result.keywords) {
          for (const kw of result.keywords) {
            keywordsFromResults.add(kw)
          }
        }
      }
      setKeywordOptions(Array.from(keywordsFromResults))
    }
  }, [results])

  // Load initial keyword suggestions
  useEffect(() => {
    loadKeywordSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to fetch initial suggestions
  }, [])

  const fetchSelectedDetails = useCallback(async (item: MediaResultItem) => {
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
    } catch (err) {
      console.error('Error fetching media details:', err)
    }
    return null
  }, [])

  const contentFromDetail = useCallback((detail: any): string => {
    if (!detail) return ''

    const firstString = (...vals: any[]): string => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim().length > 0) return v
      }
      return ''
    }

    if (typeof detail === 'string') return detail
    if (typeof detail !== 'object') return ''

    // Check content object first (tldw API structure)
    if (detail.content && typeof detail.content === 'object') {
      const contentText = firstString(
        detail.content.text,
        detail.content.content,
        detail.content.raw_text
      )
      if (contentText) return contentText
    }

    // Try root level string fields
    const fromRoot = firstString(
      detail.text,
      detail.transcript,
      detail.raw_text,
      detail.rawText,
      detail.raw_content,
      detail.rawContent
    )
    if (fromRoot) return fromRoot

    // Try latest_version object
    const lv = detail.latest_version || detail.latestVersion
    if (lv && typeof lv === 'object') {
      const fromLatest = firstString(
        lv.content,
        lv.text,
        lv.transcript,
        lv.raw_text,
        lv.rawText
      )
      if (fromLatest) return fromLatest
    }

    // Try data object
    const data = detail.data
    if (data && typeof data === 'object') {
      const fromData = firstString(
        data.content,
        data.text,
        data.transcript,
        data.raw_text,
        data.rawText
      )
      if (fromData) return fromData
    }

    return ''
  }, [])

  // Extract keywords from media detail
  const extractKeywordsFromDetail = (detail: any): string[] => {
    return extractKeywordsFromMedia(detail)
  }

  // Track selected ID to avoid re-fetching on keyword updates
  const [lastFetchedId, setLastFetchedId] = useState<string | number | null>(null)

  // Load selected item content
  useEffect(() => {
    ;(async () => {
      try {
        if (!selected) {
          setSelectedContent('')
          setLastFetchedId(null)
          return
        }

        // Skip if we already fetched this item's details
        if (selected.id === lastFetchedId) {
          return
        }

        const detail = await fetchSelectedDetails(selected)
        const content = contentFromDetail(detail)
        setSelectedContent(String(content || ''))
        setSelectedDetail(detail)
        setLastFetchedId(selected.id)

        // Extract keywords from detail and update selected item
        const keywords = extractKeywordsFromDetail(detail)
        if (keywords.length > 0 && (!selected.keywords || selected.keywords.length === 0)) {
          setSelected({ ...selected, keywords })
        }
      } catch {
        setSelectedContent('')
        setSelectedDetail(null)
      }
    })()
  }, [selected?.id, fetchSelectedDetails, contentFromDetail])

  // Refresh media details (e.g., after generating analysis)
  const handleRefreshMedia = useCallback(async () => {
    if (!selected) return
    try {
      const detail = await fetchSelectedDetails(selected)
      const content = contentFromDetail(detail)
      setSelectedContent(String(content || ''))
      setSelectedDetail(detail)
    } catch {
      setSelectedContent('')
      setSelectedDetail(null)
    }
  }, [selected, fetchSelectedDetails, contentFromDetail])

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

  // Calculate dynamic sidebar height
  const sidebarHeight = useMemo(() => {
    const minHeight = 850 // Minimum height in pixels

    // If we have measured content height, use it
    if (contentHeight > 0 && selected) {
      // Use content height to match article length
      const dynamicHeight = Math.max(minHeight, contentHeight)
      const maxHeight = 10000 // Cap at reasonable maximum
      return Math.min(maxHeight, dynamicHeight)
    }

    // If no content selected, calculate based on results to show
    const headerHeight = 48
    const searchHeight = 90
    const filtersHeight = 120
    const paginationHeight = 70
    const itemHeight = 65
    const fixedHeight = headerHeight + searchHeight + filtersHeight + paginationHeight

    // Show at least 5 items, or all items if fewer than 10
    const itemsToShow =
      results.length <= 10 ? results.length : Math.min(5, results.length)
    const resultsHeight = itemsToShow * itemHeight
    const heightForResults = fixedHeight + resultsHeight

    return Math.max(minHeight, heightForResults)
  }, [contentHeight, selected, results])

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

  const handleCreateNoteWithContent = useCallback(async (noteContent: string, title: string) => {
    try {
      await bgRequest({
        path: '/api/v1/notes/' as any,
        method: 'POST' as any,
        headers: { 'Content-Type': 'application/json' },
        body: {
          title: title,
          content: noteContent,
          keywords: selected?.keywords || []
        }
      })
      message.success('Note created successfully')
      navigate('/notes')
    } catch (err) {
      console.error('Failed to create note:', err)
      message.error('Failed to create note')
    }
  }, [selected, message, navigate])

  const handleOpenInMultiReview = useCallback(() => {
    if (!selected) return
    try {
      localStorage.setItem('tldw:lastMediaId', String(selected.id))
    } catch {
      // ignore storage errors
    }
    navigate('/media-multi')
  }, [selected, navigate])

  const handleSendAnalysisToChat = useCallback((text: string) => {
    if (!text.trim()) {
      message.warning(t('review:reviewPage.nothingToSend', 'Nothing to send'))
      return
    }
    try {
      const payload = {
        mediaId: selected ? String(selected.id) : undefined,
        title: selected?.title || 'Analysis',
        content: `Please review this analysis and continue the discussion:\n\n${text}`
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tldw:discussMediaPrompt', JSON.stringify(payload))
        window.dispatchEvent(new CustomEvent('tldw:discuss-media', { detail: payload }))
      }
    } catch {
      // ignore storage errors
    }
    setChatMode('normal')
    setSelectedKnowledge(null as any)
    setRagMediaIds(null)
    navigate('/')
    message.success(t('review:reviewPage.sentToChat', 'Sent to chat'))
  }, [selected, setChatMode, setSelectedKnowledge, setRagMediaIds, navigate, message, t])

  return (
    <div className="flex bg-slate-50 dark:bg-[#101010]" style={{ minHeight: '100vh' }}>
      {/* Left Sidebar */}
      <div
        className={`bg-white dark:bg-[#171717] border-r border-gray-200 dark:border-gray-700 flex flex-col ${
          sidebarCollapsed ? 'w-0' : 'w-96'
        }`}
        style={{
          overflow: sidebarCollapsed ? 'hidden' : 'visible',
          height: `${sidebarHeight}px`,
          minHeight: '850px',
          transition: 'width 300ms ease-in-out, height 200ms ease-out'
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="text-gray-900 dark:text-gray-100 text-base font-semibold">
              {t('review:mediaPage.mediaInspector', { defaultValue: 'Media Inspector' })}
            </h1>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {results.length} / {
                kinds.media && kinds.notes
                  ? mediaTotal + notesTotal
                  : kinds.notes
                    ? notesTotal
                    : mediaTotal
              }
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div onKeyDown={handleKeyPress}>
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <button
            onClick={handleSearch}
            className="mt-2 w-full px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
          >
            {t('review:mediaPage.search', { defaultValue: 'Search' })}
          </button>
          {/* Jump To Navigator */}
          {results.length > 5 && (
            <div className="mt-3">
              <JumpToNavigator
                results={results.map(r => ({ id: r.id, title: r.title }))}
                selectedId={selected?.id || null}
                onSelect={(id) => {
                  const item = results.find(r => r.id === id)
                  if (item) setSelected(item)
                }}
                maxButtons={12}
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <FilterPanel
            mediaTypes={availableMediaTypes}
            selectedMediaTypes={mediaTypes}
            onMediaTypesChange={setMediaTypes}
            selectedKeywords={keywordTokens}
            onKeywordsChange={(kws) => {
              setKeywordTokens(kws)
              setPage(1)
              refetch()
            }}
            keywordOptions={keywordOptions}
            onKeywordSearch={(txt) => {
              loadKeywordSuggestions(txt)
            }}
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: '325px' }}>
          <ResultsList
            results={results}
            selectedId={selected?.id || null}
            onSelect={(id) => {
              const item = results.find((r) => r.id === id)
              if (item) setSelected(item)
            }}
            totalCount={
              kinds.media && kinds.notes
                ? mediaTotal + notesTotal
                : kinds.notes
                  ? notesTotal
                  : mediaTotal
            }
            loadedCount={results.length}
          />
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(
            (kinds.media && kinds.notes
              ? mediaTotal + notesTotal
              : kinds.notes
                ? notesTotal
                : mediaTotal) / pageSize
          )}
          onPageChange={setPage}
          totalItems={
            kinds.media && kinds.notes
              ? mediaTotal + notesTotal
              : kinds.notes
                ? notesTotal
                : mediaTotal
          }
          itemsPerPage={pageSize}
          currentItemsCount={results.length}
        />
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="relative w-6 bg-white dark:bg-[#171717] border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626] flex items-center justify-center group transition-colors"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <div className="flex items-center justify-center w-full h-full">
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          )}
        </div>
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <ContentViewer
          selectedMedia={selected}
          content={selectedContent}
          mediaDetail={selectedDetail}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          currentIndex={selectedIndex >= 0 ? selectedIndex : 0}
          totalResults={results.length}
          onChatWithMedia={handleChatWithMedia}
          onChatAboutMedia={handleChatAboutMedia}
          onRefreshMedia={handleRefreshMedia}
          onKeywordsUpdated={(mediaId, keywords) => {
            // Update the selected item with new keywords
            if (selected && selected.id === mediaId) {
              setSelected({ ...selected, keywords })
            }
            // Refresh the list to show updated keywords
            refetch()
          }}
          onCreateNoteWithContent={handleCreateNoteWithContent}
          onOpenInMultiReview={handleOpenInMultiReview}
          onSendAnalysisToChat={handleSendAnalysisToChat}
          contentRef={contentRef}
        />
      </div>
    </div>
  )
}

export default ViewMediaPage
