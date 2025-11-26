import React from "react"
import {
  Button,
  Checkbox,
  Divider,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Select,
  Pagination,
  Radio,
  Modal,
  Dropdown
} from "antd"
import { useQuery } from "@tanstack/react-query"
import { bgRequest } from "@/services/background-proxy"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { useTranslation } from "react-i18next"
import { useMessageOption } from "@/hooks/useMessageOption"
import { useServerOnline } from "@/hooks/useServerOnline"
import {
  SaveIcon,
  SparklesIcon,
  FileTextIcon,
  SearchIcon,
  PaperclipIcon
} from "lucide-react"
import { ChevronDown, CopyIcon, SendIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Storage } from "@plasmohq/storage"
import { getAllPrompts } from "@/db/dexie/helpers"
import { useConfirmDanger } from "@/components/Common/confirm-danger"
import FeatureEmptyState from "@/components/Common/FeatureEmptyState"
import { useAntdNotification } from "@/hooks/useAntdNotification"
import { useDemoMode } from "@/context/demo-mode"
import { useAntdMessage } from "@/hooks/useAntdMessage"

type MediaItem = any
type NoteItem = any

type ResultItem = {
  kind: "media" | "note"
  id: string | number
  title?: string
  snippet?: string
  meta?: Record<string, any>
  raw: any
}

type ReviewPageProps = { allowGeneration?: boolean; forceOffline?: boolean }

export const ReviewPage: React.FC<ReviewPageProps> = ({ allowGeneration = true, forceOffline = false }) => {
  const { t } = useTranslation(["option", "review"])
  const notification = useAntdNotification()
  const message = useAntdMessage()
  const confirmDanger = useConfirmDanger()
  const isViewMediaMode = !allowGeneration
  const [query, setQuery] = React.useState<string>("")
  const [kinds, setKinds] = React.useState<{ media: boolean; notes: boolean }>(() => ({
    media: true,
    notes: allowGeneration
  }))
  const [selected, setSelected] = React.useState<ResultItem | null>(null)
  const [analysis, setAnalysis] = React.useState<string>("")
  const [loadingAnalysis, setLoadingAnalysis] = React.useState<boolean>(false)
  const [existingAnalyses, setExistingAnalyses] = React.useState<NoteItem[]>([])
  const {
    selectedModel,
    messages,
    setMessages,
    setChatMode,
    setSelectedKnowledge,
    setRagMediaIds
  } = useMessageOption()
  const navigate = useNavigate()
  const [lastPrompt, setLastPrompt] = React.useState<string | null>(null)
  const [mediaTypes, setMediaTypes] = React.useState<string[]>([])
  const [availableMediaTypes, setAvailableMediaTypes] = React.useState<
    string[]
  >([])
  const [keywordTokens, setKeywordTokens] = React.useState<string[]>([])
  const [keywordOptions, setKeywordOptions] = React.useState<string[]>([])
  const [preloadedKeywords, setPreloadedKeywords] = React.useState<string[]>([])
  const [autoReviewOnSelect, setAutoReviewOnSelect] =
    React.useState<boolean>(false)
  const [selectedContent, setSelectedContent] = React.useState<string>("")
  const [selectedDetail, setSelectedDetail] = React.useState<any>(null)
  const [debugOpen, setDebugOpen] = React.useState<boolean>(false)
  const [mediaJsonOpen, setMediaJsonOpen] = React.useState<boolean>(false)
  const [mediaExpanded, setMediaExpanded] = React.useState<boolean>(false)
  const [contentCollapsed, setContentCollapsed] = React.useState<boolean>(false)
  const [analysisCollapsed, setAnalysisCollapsed] = React.useState<boolean>(false)
  const [notesJsonOpen, setNotesJsonOpen] = React.useState<boolean>(false)
  const [selectedExistingIndex, setSelectedExistingIndex] = React.useState<number>(-1)
  const [onlyWithAnalysis, setOnlyWithAnalysis] = React.useState<boolean>(false)
  const [diffOpen, setDiffOpen] = React.useState<boolean>(false)
  const [diffLines, setDiffLines] = React.useState<Array<{ type: 'same'|'add'|'del'; text: string }>>([])
  const [expandedPrompts, setExpandedPrompts] = React.useState<Set<string>>(new Set())
  const [expandedAnalyses, setExpandedAnalyses] = React.useState<Set<string>>(new Set())
  const [diffSideBySide, setDiffSideBySide] = React.useState<boolean>(false)
  const [diffLeftText, setDiffLeftText] = React.useState<string>("")
  const [diffRightText, setDiffRightText] = React.useState<string>("")
  const [promptsOpen, setPromptsOpen] = React.useState<boolean>(false)
  const [reviewSystemPrompt, setReviewSystemPrompt] = React.useState<string>(
    "You are an expert reviewer. Provide a concise, structured review of the following content."
  )
  const [reviewUserPrefix, setReviewUserPrefix] = React.useState<string>("")
  const [summarySystemPrompt, setSummarySystemPrompt] = React.useState<string>(
    "Summarize the following content into key points and a brief abstract."
  )
  const [summaryUserPrefix, setSummaryUserPrefix] = React.useState<string>("")
  React.useEffect(() => {
    setContentCollapsed(false)
    setAnalysisCollapsed(false)
  }, [selected])
  // Quick prompt search states (dropdown editors)
  const [revQ, setRevQ] = React.useState("")
  const [revResults, setRevResults] = React.useState<Array<{ id?: string; title: string; content: string }>>([])
  const [revLoading, setRevLoading] = React.useState(false)
  const [sumQ, setSumQ] = React.useState("")
  const [sumResults, setSumResults] = React.useState<Array<{ id?: string; title: string; content: string }>>([])
  const [sumLoading, setSumLoading] = React.useState(false)
  const [revIncludeLocal, setRevIncludeLocal] = React.useState(true)
  const [revIncludeServer, setRevIncludeServer] = React.useState(true)
  const [sumIncludeLocal, setSumIncludeLocal] = React.useState(true)
  const [sumIncludeServer, setSumIncludeServer] = React.useState(true)
  const [page, setPage] = React.useState<number>(1)
  const [pageSize, setPageSize] = React.useState<number>(20)
  const [mediaTotal, setMediaTotal] = React.useState<number>(0)
  const [filtersOpen, setFiltersOpen] = React.useState<boolean>(true)
  const [analysisMode, setAnalysisMode] = React.useState<"review" | "summary">("review")
  const [sidebarHidden, setSidebarHidden] = React.useState<boolean>(false)
  const [advancedOpen, setAdvancedOpen] = React.useState<boolean>(false)
  const modeToastPrev = React.useRef<"review" | "summary" | null>(null)
  const serverOnline = useServerOnline()
  const isOnline = forceOffline ? false : serverOnline

  // Storage scoping: per server host and auth mode to avoid cross-user leakage
  const scopedKey = React.useCallback((base: string) => {
    try {
      const raw = localStorage.getItem('tldwConfig')
      if (raw) {
        const cfg = JSON.parse(raw) || {}
        const host = String(cfg?.serverUrl || '').replace(/\/+$/, '').replace(/^https?:\/\//, '')
        const user = cfg?.authMode === 'multi-user' && cfg?.accessToken ? 'user' : 'single'
        return `${base}:${host || 'nohost'}:${user}`
      }
    } catch {}
    return base
  }, [])

  // Simple markdown-normalize (straight quotes, dashes, NBSP)
  const toMarkdown = React.useCallback((text: string) => {
    return String(text || '')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u00A0/g, ' ')
  }, [])

  const runSearch = async (): Promise<ResultItem[]> => {
    const results: ResultItem[] = []
    const hasQuery = query.trim().length > 0
    const hasMediaFilters = mediaTypes.length > 0 || keywordTokens.length > 0
    // Media search (POST /api/v1/media/search)
    if (kinds.media) {
      try {
        if (!hasQuery && !hasMediaFilters) {
          // Blank browse: GET listing with pagination
          const listing = await bgRequest<any>({
            path: `/api/v1/media/?page=${page}&results_per_page=${pageSize}` as any,
            method: "GET" as any
          })
          const items = Array.isArray(listing?.items) ? listing.items : []
          const pagination = listing?.pagination
          setMediaTotal(Number(pagination?.total_items || items.length || 0))
          for (const m of items) {
            const id = m?.id ?? m?.media_id ?? m?.pk ?? m?.uuid
            const type = String(m?.type || m?.media_type || "").toLowerCase()
            if (type && !availableMediaTypes.includes(type)) {
              setAvailableMediaTypes((prev) =>
                prev.includes(type) ? prev : [...prev, type]
              )
            }
            results.push({
              kind: "media",
              id,
              title: m?.title || m?.filename || `Media ${id}`,
              snippet: m?.snippet || m?.summary || "",
              meta: {
                type,
                created_at: m?.created_at
              },
              raw: m
            })
          }
        } else {
          // Search with optional filters and pagination
          const body: any = {
            query: hasQuery ? query : null,
            fields: ["title", "content"],
            sort_by: "relevance"
          }
          if (mediaTypes.length > 0) body.media_types = mediaTypes
          if (keywordTokens.length > 0) body.must_have = keywordTokens
          const mediaResp = await bgRequest<any>({
            path: `/api/v1/media/search?page=${page}&results_per_page=${pageSize}` as any,
            method: "POST" as any,
            headers: { "Content-Type": "application/json" },
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
            const type = String(m?.type || m?.media_type || "").toLowerCase()
            if (type && !availableMediaTypes.includes(type)) {
              setAvailableMediaTypes((prev) =>
                prev.includes(type) ? prev : [...prev, type]
              )
            }
            results.push({
              kind: "media",
              id,
              title: m?.title || m?.filename || `Media ${id}`,
              snippet: m?.snippet || m?.summary || "",
              meta: {
                type,
                created_at: m?.created_at
              },
              raw: m
            })
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
        const base = String(cfg?.serverUrl || "").replace(/\/$/, "")
        const abs = await bgRequest<any>({
          path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(query)}` as any,
          method: "GET" as any
        })
        if (Array.isArray(abs)) {
          for (const n of abs) {
            results.push({
              kind: "note",
              id: n?.id,
              title: n?.title || `Note ${n?.id}`,
              snippet: (n?.content || "").slice(0, 160),
              meta: { updated_at: n?.updated_at },
              raw: n
            })
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return results
  }

  const {
    data: results,
    isFetching,
    refetch
  } = useQuery({
    queryKey: [
      "review-search",
      query,
      kinds,
      mediaTypes,
      keywordTokens.join("|"),
      page,
      pageSize
    ],
    queryFn: runSearch,
    enabled: false
  })

  // Auto-refetch when paginating in browse/search mode without changing query text
  React.useEffect(() => {
    // If user is browsing (blank query) or using filter-only search, update results on page change
    const hasQuery = query.trim().length > 0
    const hasFilters = mediaTypes.length > 0 || keywordTokens.length > 0
    if (isOnline && (!hasQuery || hasFilters)) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, isOnline])

  // Initial load: populate media types (cached) and auto-browse first page
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: "local" })
        const cacheKey = "reviewMediaTypesCache"
        const cached = (await storage.get(cacheKey).catch(() => null)) as {
          types?: string[]
          cachedAt?: number
        } | null
        const now = Date.now()
        const ttlMs = 24 * 60 * 60 * 1000 // 24h
        if (
          cached?.types &&
          Array.isArray(cached.types) &&
          typeof cached.cachedAt === "number" &&
          now - cached.cachedAt < ttlMs
        ) {
          setAvailableMediaTypes(
            Array.from(new Set<string>(cached.types)) as string[]
          )
        }

        if (isOnline) {
          // Sample first up-to-3 pages to enrich types list
          const first = await bgRequest<any>({
            path: `/api/v1/media/?page=1&results_per_page=50` as any,
            method: "GET" as any
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
                    method: "GET" as any
                  })
            )
          )
          const typeSet = new Set<string>()
          for (const listing of listings) {
            const items = Array.isArray(listing?.items) ? listing.items : []
            for (const m of items) {
              const t = String(m?.type || m?.media_type || "")
                .toLowerCase()
                .trim()
              if (t) typeSet.add(t)
            }
          }
          const newTypes = Array.from(typeSet)
          if (newTypes.length) {
            setAvailableMediaTypes(
              (prev) =>
                Array.from(new Set<string>([...prev, ...newTypes])) as string[]
            )
            await storage.set(cacheKey, { types: newTypes, cachedAt: now })
          }
        }
      } catch {}

      // Auto-browse: if there is no query or filters, fetch first page
      try {
        if (
          !query.trim() &&
          mediaTypes.length === 0 &&
          keywordTokens.length === 0 && isOnline
        ) {
          await refetch()
        }
      } catch {}
    })()
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load custom prompts from storage
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: 'local' })
        const data = (await storage.get(scopedKey('review:prompts')).catch(() => null)) as any
        if (data && typeof data === 'object') {
          if (typeof data.reviewSystemPrompt === 'string') setReviewSystemPrompt(data.reviewSystemPrompt)
          if (typeof data.reviewUserPrefix === 'string') setReviewUserPrefix(data.reviewUserPrefix)
          if (typeof data.summarySystemPrompt === 'string') setSummarySystemPrompt(data.summarySystemPrompt)
          if (typeof data.summaryUserPrefix === 'string') setSummaryUserPrefix(data.summaryUserPrefix)
        }
      } catch {}
    })()
  }, [scopedKey])

  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: 'local' })
        await storage.set(scopedKey('review:prompts'), {
          reviewSystemPrompt,
          reviewUserPrefix,
          summarySystemPrompt,
          summaryUserPrefix
        })
      } catch {}
    })()
  }, [reviewSystemPrompt, reviewUserPrefix, summarySystemPrompt, summaryUserPrefix, scopedKey])

  const hasSelectedMedia = selected?.kind === "media"
  const hasSelectedVersion =
    hasSelectedMedia &&
    selectedExistingIndex >= 0 &&
    selectedExistingIndex < existingAnalyses.length
  const canCreateVersion =
    hasSelectedMedia && !!selectedContent?.trim() && !!analysis.trim()

  // Persist auto-review toggle in storage (load)
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: "local" })
        const saved = (await storage.get(scopedKey("review:autoReviewOnSelect")).catch(() => null)) as any
        if (typeof saved === "boolean") setAutoReviewOnSelect(saved)
        const savedPromptsOpen = (await storage.get(scopedKey('review:promptsOpen')).catch(() => null)) as any
        if (typeof savedPromptsOpen === 'boolean') setPromptsOpen(savedPromptsOpen)
        const savedFiltersOpen = (await storage.get(scopedKey('review:filtersOpen')).catch(() => null)) as any
        if (typeof savedFiltersOpen === 'boolean') setFiltersOpen(savedFiltersOpen)
        const savedMode = (await storage.get(scopedKey('review:defaultMode')).catch(() => null)) as any
        if (savedMode === 'review' || savedMode === 'summary') setAnalysisMode(savedMode)
      } catch {}
    })()
  }, [scopedKey])

  // Persist auto-review toggle in storage (save)
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: "local" })
        await storage.set(scopedKey("review:autoReviewOnSelect"), autoReviewOnSelect)
      } catch {}
    })()
  }, [autoReviewOnSelect, scopedKey])

  // Persist filters open/closed
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: "local" })
        await storage.set(scopedKey("review:filtersOpen"), filtersOpen)
      } catch {}
    })()
  }, [filtersOpen, scopedKey])

  // Persist default analysis mode (Review workspace only)
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: "local" })
        await storage.set(scopedKey("review:defaultMode"), analysisMode)
      } catch {}
    })()
    if (!allowGeneration) return
    const prev = modeToastPrev.current
    if (prev && prev !== analysisMode) {
      message.info(
        analysisMode === 'review'
          ? t('review:reviewPage.usingReviewPrompts', 'Using Review prompts')
          : t('review:reviewPage.usingSummaryPrompts', 'Using Summary prompts'),
        1
      )
    }
    modeToastPrev.current = analysisMode
  }, [analysisMode, scopedKey, allowGeneration])

  const loadKeywordSuggestions = React.useCallback(
    async (text: string) => {
      const q = String(text || "").trim()
      if (!q) {
        setKeywordOptions(preloadedKeywords)
        return
      }
      try {
        const cfg = await tldwClient.getConfig()
        const base = String(cfg?.serverUrl || "").replace(/\/$/, "")
        const abs = await bgRequest<any>({
          path: `${base}/api/v1/notes/keywords/search/?query=${encodeURIComponent(q)}&limit=10` as any,
          method: "GET" as any
        })
        const serverOpts: string[] = Array.isArray(abs)
          ? abs
              .map((k: any) =>
                String(k?.keyword_text || k?.keyword || k?.text || "")
              )
              .filter(Boolean)
          : []
        const preloadMatches = preloadedKeywords.filter((k) =>
          k.toLowerCase().includes(q.toLowerCase())
        )
        const merged = Array.from(
          new Set<string>([...serverOpts, ...preloadMatches])
        ) as string[]
        setKeywordOptions(merged)
      } catch {
        const preloadMatches = preloadedKeywords.filter((k) =>
          k.toLowerCase().includes(q.toLowerCase())
        )
        setKeywordOptions(preloadMatches)
      }
    },
    [preloadedKeywords]
  )

  // Generate analysis text and return it (shared by actions)
  const generateAnalysis = async (
    mode: "review" | "summary"
  ): Promise<string | null> => {
    if (!selected) return null
    const detail = await fetchSelectedDetails(selected)
    const content = contentFromDetail(detail)
    if (!content) return null
    const system = mode === "review" ? reviewSystemPrompt : summarySystemPrompt
    const userPrefix = mode === "review" ? reviewUserPrefix : summaryUserPrefix
    setLastPrompt(system)
    const body = {
      model: selectedModel || "default",
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${userPrefix ? userPrefix + "\n\n" : ""}${content}` }
      ]
    }
    const resp = await bgRequest<any>({
      path: "/api/v1/chat/completions",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    })
    const text =
      resp?.choices?.[0]?.message?.content ||
      resp?.content ||
      (typeof resp === "string" ? resp : "")
    return String(text || "")
  }

  const fetchSelectedDetails = React.useCallback(async (item: ResultItem) => {
    try {
      if (item.kind === "media") {
        const detail = await bgRequest<any>({
          path: `/api/v1/media/${item.id}` as any,
          method: "GET" as any
        })
        return detail
      }
      if (item.kind === "note") {
        // If we already have full note in raw, just return it
        return item.raw
      }
    } catch {}
    return null
  }, [])

  const contentFromDetail = (detail: any): string => {
    if (!detail) return ""
    // Helper: return first non-empty string from provided values
    const firstString = (...vals: any[]): string => {
      for (const v of vals) {
        if (typeof v === 'string' && v.trim().length > 0) return v
      }
      return ""
    }
    if (typeof detail === 'string') return detail
    if (typeof detail !== 'object') return ""

    // Common fields on root and nested structures
    const fromRoot = firstString(detail.content, detail.text, detail.raw_text, detail.rawText, detail.summary)
    if (fromRoot) return fromRoot

    const lv = detail.latest_version || detail.latestVersion
    if (lv && typeof lv === 'object') {
      const fromLatest = firstString(lv.content, lv.text, lv.raw_text, lv.rawText, lv.summary)
      if (fromLatest) return fromLatest
    }

    const data = detail.data
    if (data && typeof data === 'object') {
      const fromData = firstString(data.content, data.text, data.raw_text, data.rawText, data.summary)
      if (fromData) return fromData
    }

    // As a last resort, try common nested objects directly
    for (const key of ['content', 'text', 'raw_text', 'rawText', 'summary']) {
      const v = (detail as any)[key]
      if (v && typeof v === 'object') {
        const nested = firstString(v.content, v.text, v.raw_text, v.rawText, v.summary)
        if (nested) return nested
      }
    }

    return ""
  }

  // Load selected item content for display
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!selected) { setSelectedContent(""); return }
        const detail = await fetchSelectedDetails(selected)
        const content = contentFromDetail(detail)
        setSelectedContent(String(content || ""))
        setSelectedDetail(detail)
        setMediaExpanded(false)
      } catch { setSelectedContent(""); setSelectedDetail(null) }
    })()
  }, [selected])

  const loadExistingAnalyses = React.useCallback(async (item: ResultItem) => {
    try {
      if (item.kind !== 'media') { setExistingAnalyses([]); setSelectedExistingIndex(-1); return }
      // Fetch media versions (holds prompt/analysis per version)
      const versions = await bgRequest<any[]>({ path: `/api/v1/media/${item.id}/versions?include_content=false&limit=50&page=1` as any, method: 'GET' as any })
      const arr = Array.isArray(versions) ? versions : []
      setExistingAnalyses(arr)
      // Restore previously selected version index if present
      try {
        const storage = new Storage({ area: 'local' })
        const idx = await storage.get(scopedKey(`review:selectedVersion:${item.id}`)).catch(() => null) as any
        const sel = typeof idx === 'number' && idx >= 0 && idx < arr.length ? idx : (arr.length > 0 ? 0 : -1)
        setSelectedExistingIndex(sel)
      } catch { setSelectedExistingIndex(arr.length > 0 ? 0 : -1) }
    } catch {
      setExistingAnalyses([])
      setSelectedExistingIndex(-1)
    }
  }, [])

  // Persist selected version index per media
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!selected || selected.kind !== 'media') return
        const storage = new Storage({ area: 'local' })
        await storage.set(scopedKey(`review:selectedVersion:${selected.id}`), selectedExistingIndex)
      } catch {}
    })()
  }, [selectedExistingIndex, selected, scopedKey])

  // Load/save the "only with analysis" toggle per media
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!selected || selected.kind !== 'media') return
        const storage = new Storage({ area: 'local' })
        const saved = await storage.get(scopedKey(`review:withAnalysisOnly:${selected.id}`)).catch(() => null) as any
        if (typeof saved === 'boolean') setOnlyWithAnalysis(saved)
      } catch {}
    })()
  }, [selected, scopedKey])

  React.useEffect(() => {
    ;(async () => {
      try {
        if (!selected || selected.kind !== 'media') return
        const storage = new Storage({ area: 'local' })
        await storage.set(scopedKey(`review:withAnalysisOnly:${selected.id}`), onlyWithAnalysis)
      } catch {}
    })()
  }, [onlyWithAnalysis, selected, scopedKey])

  // Helpers to read version analysis/timestamp/label
  const getVersionAnalysis = (v: any): string => String(v?.analysis_content || v?.analysis || '')
  const getVersionPrompt = (v: any): string => String(v?.prompt || '')
  const getVersionNumber = (v: any): number | undefined => (typeof v?.version_number === 'number' ? v.version_number : (typeof v?.version === 'number' ? v.version : undefined))
  const getVersionTimestamp = (v: any): string => String(v?.created_at || v?.updated_at || v?.timestamp || '')

  // Visible versions given filter
  const displayedVersionIndices = React.useMemo(() => {
    return (existingAnalyses || []).map((v, i) => ({ v, i })).filter(({ v }) => !onlyWithAnalysis || getVersionAnalysis(v).trim().length > 0).map(({ i }) => i)
  }, [existingAnalyses, onlyWithAnalysis])

  const displayedVersions = React.useMemo(() => displayedVersionIndices.map((i) => existingAnalyses[i]), [displayedVersionIndices, existingAnalyses])

  const selectedDisplayPos = React.useMemo(() => (selectedExistingIndex >= 0 ? displayedVersionIndices.indexOf(selectedExistingIndex) : -1), [displayedVersionIndices, selectedExistingIndex])

  const goPrev = () => {
    if (displayedVersionIndices.length === 0) return
    const pos = selectedDisplayPos >= 0 ? selectedDisplayPos : 0
    const newPos = pos <= 0 ? displayedVersionIndices.length - 1 : pos - 1
    setSelectedExistingIndex(displayedVersionIndices[newPos])
  }
  const goNext = () => {
    if (displayedVersionIndices.length === 0) return
    const pos = selectedDisplayPos >= 0 ? selectedDisplayPos : 0
    const newPos = (pos + 1) % displayedVersionIndices.length
    setSelectedExistingIndex(displayedVersionIndices[newPos])
  }

  const goPrevItem = () => {
    if (selectedResultIndex <= 0) return
    const next = displayedResults[selectedResultIndex - 1]
    if (next) {
      setSelected(next)
      setAnalysis("")
      loadExistingAnalyses(next)
    }
  }

  const goNextItem = () => {
    if (selectedResultIndex < 0 || selectedResultIndex >= displayedResults.length - 1) return
    const next = displayedResults[selectedResultIndex + 1]
    if (next) {
      setSelected(next)
      setAnalysis("")
      loadExistingAnalyses(next)
    }
  }

  // Current (active) version number badge
  const currentVersionNumber = React.useMemo(() => {
    const fromDetail = (typeof (selectedDetail?.version) === 'number') ? selectedDetail.version : (typeof (selectedDetail?.latest_version?.version_number) === 'number' ? selectedDetail.latest_version.version_number : undefined)
    if (typeof fromDetail === 'number') return fromDetail
    // Fallback: max version number
    let max = -Infinity
    for (const v of existingAnalyses || []) {
      const n = getVersionNumber(v)
      if (typeof n === 'number' && n > max) max = n
    }
    return isFinite(max) ? max : undefined
  }, [selectedDetail, existingAnalyses])

  // Fetch specific version with content when needed (clone)
  const fetchVersionWithContent = React.useCallback(async (mediaId: string | number, versionNumber: number) => {
    try {
      const data = await bgRequest<any>({ path: `/api/v1/media/${mediaId}/versions/${versionNumber}?include_content=true` as any, method: 'GET' as any })
      return data
    } catch { return null }
  }, [])

  // Simple line diff for modal
  const computeDiff = (oldStr: string, newStr: string) => {
    const a = String(oldStr || '').split('\n')
    const b = String(newStr || '').split('\n')
    const n = a.length, m = b.length
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    const out: Array<{ type: 'same'|'add'|'del'; text: string }> = []
    let i = 0, j = 0
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push({ type: 'same', text: a[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', text: a[i] }); i++; }
      else { out.push({ type: 'add', text: b[j] }); j++; }
    }
    while (i < n) { out.push({ type: 'del', text: a[i++] }) }
    while (j < m) { out.push({ type: 'add', text: b[j++] }) }
    return out
  }

  // Persist expanded prompts per media
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!selected || selected.kind !== 'media') { setExpandedPrompts(new Set()); return }
        const storage = new Storage({ area: 'local' })
        const saved = await storage.get(scopedKey(`review:expandedPrompts:${selected.id}`)).catch(() => null) as any
        if (Array.isArray(saved)) setExpandedPrompts(new Set(saved.map(String)))
      } catch {}
    })()
  }, [selected, scopedKey])

  React.useEffect(() => {
    ;(async () => {
      try {
        if (!selected || selected.kind !== 'media') return
        const storage = new Storage({ area: 'local' })
        await storage.set(scopedKey(`review:expandedPrompts:${selected.id}`), Array.from(expandedPrompts))
      } catch {}
    })()
  }, [expandedPrompts, selected, scopedKey])

  const runOneOff = async (mode: "review" | "summary") => {
    if (!selected) {
      message.warning(t('review:reviewPage.selectItemFirst', 'Select an item first'))
      return
    }
    setLoadingAnalysis(true)
    try {
      const text = await generateAnalysis(mode)
      if (!text) {
        message.warning(t('review:reviewPage.analyze.none', 'No content available to analyze'))
        setLoadingAnalysis(false)
        return
      }
      setAnalysis(String(text || ""))
    } catch (e: any) {
      message.error(e?.message || "Analysis failed")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // One-click analyze + save to media
  const analyzeAndSaveToMedia = async (
    mode: "review" | "summary" = "review"
  ) => {
    if (!selected || selected.kind !== "media") {
      message.warning(t('review:reviewPage.selectMediaFirst', 'Select a media item first'))
      return
    }
    setLoadingAnalysis(true)
    try {
      const text = await generateAnalysis(mode)
      if (!text) {
        message.warning(t('review:reviewPage.analyze.none', 'No content available to analyze'))
        setLoadingAnalysis(false)
        return
      }
      setAnalysis(text)
      await bgRequest<any>({
        path: `/api/v1/media/${selected.id}` as any,
        method: "PUT" as any,
        headers: { "Content-Type": "application/json" },
        body: { analysis: text, ...(lastPrompt ? { prompt: lastPrompt } : {}) }
      })
      message.success("Analysis attached to media")
      await loadExistingAnalyses(selected)
    } catch (e: any) {
      message.error(e?.message || "Failed to analyze & save")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // Auto-review on select
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!allowGeneration) return
        if (autoReviewOnSelect && selected) {
          const text = await generateAnalysis("review")
          if (text) setAnalysis(text)
        }
      } catch {}
    })()
  }, [autoReviewOnSelect, selected, allowGeneration])

  // Preload keyword suggestions (top list)
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!isOnline) return
        const cfg = await tldwClient.getConfig()
        const base = String(cfg?.serverUrl || "").replace(/\/$/, "")
        const abs = await bgRequest<any>({
          path: `${base}/api/v1/notes/keywords/?limit=200` as any,
          method: "GET" as any
        })
        const arr: string[] = Array.isArray(abs)
          ? abs
              .map((k: any) =>
                String(k?.keyword || k?.keyword_text || k?.text || "")
              )
              .filter(Boolean)
          : []
        const uniq = Array.from(new Set<string>(arr)) as string[]
        setPreloadedKeywords(uniq)
        if (uniq.length) setKeywordOptions(uniq)
      } catch {}
    })()
  }, [isOnline])

  const saveAnalysis = async () => {
    if (!selected || !analysis.trim()) {
      message.warning("Nothing to save")
      return
    }
    try {
      const tag = selected.kind === "media" ? `\n\nmedia:${selected.id}` : ""
      const payload = {
        content: `${analysis}${tag}`,
        metadata: {
          kind: "analysis",
          media_id: selected.kind === "media" ? selected.id : undefined
        }
      }
      await bgRequest<any>({
        path: "/api/v1/notes/",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      })
      message.success("Saved to notes")
      if (selected.kind === "media") await loadExistingAnalyses(selected)
    } catch (e: any) {
      message.error(e?.message || "Save failed")
    }
  }

  const saveAnalysisToMedia = async () => {
    if (!selected || selected.kind !== "media") {
      message.warning(t('review:reviewPage.selectMediaFirst', 'Select a media item first'))
      return
    }
    if (!analysis.trim()) {
      message.warning("Nothing to save")
      return
    }
    try {
      await bgRequest<any>({
        path: `/api/v1/media/${selected.id}` as any,
        method: "PUT" as any,
        headers: { "Content-Type": "application/json" },
        body: {
          analysis: analysis,
          // include prompt if we have it from last generation
          ...(lastPrompt ? { prompt: lastPrompt } : {})
        }
      })
      message.success("Analysis attached to media")
    } catch (e: any) {
      message.error(e?.message || "Failed to save to media")
    }
  }

  // One-click analyze + save as note
  const analyzeAndSaveToNote = async (
    mode: "review" | "summary" = "review"
  ) => {
    if (!selected) {
      message.warning(t('review:reviewPage.selectItemFirst', 'Select an item first'))
      return
    }
    setLoadingAnalysis(true)
    try {
      const text = await generateAnalysis(mode)
      if (!text) {
        message.warning(t('review:reviewPage.analyze.none', 'No content available to analyze'))
        setLoadingAnalysis(false)
        return
      }
      setAnalysis(text)
      const tag = selected.kind === "media" ? `\n\nmedia:${selected.id}` : ""
      const payload = {
        content: `${text}${tag}`,
        metadata: {
          kind: "analysis",
          media_id: selected.kind === "media" ? selected.id : undefined
        }
      }
      await bgRequest<any>({
        path: "/api/v1/notes/",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      })
      message.success(t('review:reviewPage.analyze.saved', 'Analysis saved as note'))
      if (selected.kind === "media") await loadExistingAnalyses(selected)
    } catch (e: any) {
      message.error(e?.message || t('review:reviewPage.analyze.failed', 'Failed to analyze & save note'))
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // Client-side filtering for notes by keyword tokens (media type filtering only applies to media)
  const displayedResults = React.useMemo(() => {
    let arr = results || []
    if (mediaTypes.length > 0) {
      arr = arr.filter(
        (r) =>
          r.kind !== "media" ||
          mediaTypes.includes(String(r?.meta?.type || "").toLowerCase())
      )
    }
    if (keywordTokens.length > 0) {
      const toks = keywordTokens.map((k) => k.toLowerCase())
      arr = arr.filter((r) => {
        const hay =
          `${r.title || ""} ${r.snippet || ""} ${typeof r.raw?.content === "string" ? r.raw.content : ""}`.toLowerCase()
        return toks.every((k) => hay.includes(k))
      })
    }
    return arr
  }, [results, mediaTypes, keywordTokens])
  const selectedResultIndex = React.useMemo(() => {
    if (!selected) return -1
    return displayedResults.findIndex((r) => r.id === selected.id && r.kind === selected.kind)
  }, [displayedResults, selected])

  // If the currently selected item drops out of the visible results (after filters/search),
  // clear the selection to avoid confusing "stale" details.
  React.useEffect(() => {
    if (!selected) return
    const stillVisible = displayedResults.some(
      (r) => r.id === selected.id && r.kind === selected.kind
    )
    if (!stillVisible) {
      setSelected(null)
      setAnalysis("")
    }
  }, [displayedResults, selected])

  const { demoEnabled } = useDemoMode()
  const [previewExpanded, setPreviewExpanded] = React.useState<{ content: boolean; analysis: boolean }>({ content: false, analysis: false })
  const previewCards = React.useMemo(() => ([
    { title: 'Sample media item 1', meta: 'Video · 12:34', status: 'Ready' },
    { title: 'Sample media item 2', meta: 'Audio · 08:12', status: 'Processing' },
    { title: 'Sample media item 3', meta: 'PDF · 4 pages', status: 'Ready' }
  ]), [])

  if (!isOnline) {
    const baseEmpty = demoEnabled ? (
      <FeatureEmptyState
        title={
          isViewMediaMode
            ? t('review:mediaEmpty.demoTitle', {
              defaultValue: 'Explore Media in demo mode'
            })
            : t('review:empty.demoTitle', {
              defaultValue: 'Explore Review in demo mode'
            })
        }
        description={
          isViewMediaMode
            ? t('review:mediaEmpty.demoDescription', {
              defaultValue:
                'This demo shows how tldw Assistant can display and inspect processed media. Connect your own server later to browse your own recordings and documents.'
            })
            : t('review:empty.demoDescription', {
              defaultValue:
                'This demo shows how tldw Assistant can turn media and notes into structured reviews. Connect your own server later to analyze your own content.'
            })
        }
        examples={
          isViewMediaMode
            ? [
                t('review:mediaEmpty.demoExample1', {
                  defaultValue:
                    'See how processed media items appear in the Media viewer.'
                }),
                t('review:mediaEmpty.demoExample2', {
                  defaultValue:
                    'When you connect, you’ll be able to browse and inspect media ingested from your own recordings and files.'
                })
              ]
            : [
                t('review:empty.demoExample1', {
                  defaultValue:
                    'See how selected media and notes appear in the review workspace.'
                }),
                t('review:empty.demoExample2', {
                  defaultValue:
                    'When you connect, you’ll be able to generate summaries and action items from your own recordings and notes.'
                })
              ]
        }
        primaryActionLabel={t('common:connectToServer', {
          defaultValue: 'Connect to server'
        })}
        onPrimaryAction={() => navigate('/settings/tldw')}
        secondaryActionLabel={t('option:header.quickIngest', 'Quick ingest')}
        onSecondaryAction={() =>
          window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest"))
        }
        secondaryDisabled={!isOnline}
      />
    ) : (
      <FeatureEmptyState
        title={
          isViewMediaMode
            ? t('review:mediaEmpty.connectTitle', {
              defaultValue: 'Connect to use Media'
            })
            : t('review:empty.connectTitle', {
              defaultValue: 'Connect to use Review'
            })
        }
        description={
          isViewMediaMode
            ? t('review:mediaEmpty.connectDescription', {
              defaultValue:
                'To view processed media, first connect to your tldw server so recordings and documents can be listed here.'
            })
            : t('review:empty.connectDescription', {
              defaultValue:
                'To review media and notes, first connect to your tldw server.'
            })
        }
        examples={
          isViewMediaMode
            ? [
                t('review:mediaEmpty.connectExample1', {
                  defaultValue:
                    'Open Settings → tldw server to add your server URL.'
                }),
                t('review:mediaEmpty.connectExample2', {
                  defaultValue:
                    'Once connected, use Quick ingest in the header to add media from your recordings and files.'
                })
              ]
            : [
                t('review:empty.connectExample1', {
                  defaultValue:
                    'Open Settings → tldw server to add your server URL.'
                }),
                t('review:empty.connectExample2', {
                  defaultValue:
                    'Once connected, browse media and notes, then generate structured reviews and summaries.'
                })
              ]
        }
        primaryActionLabel={t('common:connectToServer', {
          defaultValue: 'Connect to server'
        })}
        onPrimaryAction={() => navigate('/settings/tldw')}
        secondaryActionLabel={t('option:header.quickIngest', 'Quick ingest')}
        onSecondaryAction={() =>
          window.dispatchEvent(new CustomEvent("tldw:open-quick-ingest"))
        }
        secondaryDisabled={!isOnline}
      />
    )

    const previewToolbar = (
      <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white/80 p-2 dark:border-gray-700 dark:bg-[#111111]/80 backdrop-blur">
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          {t('review:preview.bulkHint', 'Preview: scroll multiple items with collapsible Content & Analysis')}
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button size="small" onClick={() => setPreviewExpanded({ content: true, analysis: true })}>
            {t('review:preview.expandAll', 'Expand all')}
          </Button>
          <Button size="small" onClick={() => setPreviewExpanded({ content: false, analysis: false })}>
            {t('review:preview.collapseAll', 'Collapse all')}
          </Button>
        </div>
      </div>
    )

    const previewCardsUi = (
      <div className="space-y-3">
        {previewCards.map((c, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{c.title}</span>
                <span className="text-[11px] text-gray-500">{c.meta}</span>
              </div>
              <Tag color={c.status === 'Processing' ? 'orange' : 'green'}>{c.status}</Tag>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Content / Transcript</span>
                  <Button size="small" type="link" onClick={() => setPreviewExpanded((v) => ({ ...v, content: !v.content }))}>
                    {previewExpanded.content ? t('review:preview.hide', 'Hide') : t('review:preview.show', 'Show')}
                  </Button>
                </div>
                {previewExpanded.content && (
                  <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                )}
              </div>
              <div className="px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">Analysis / Summary</span>
                  <Button size="small" type="link" onClick={() => setPreviewExpanded((v) => ({ ...v, analysis: !v.analysis }))}>
                    {previewExpanded.analysis ? t('review:preview.hide', 'Hide') : t('review:preview.show', 'Show')}
                  </Button>
                </div>
                {previewExpanded.analysis && (
                  <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )

    return (
      <div className="mt-4 space-y-4">
        {demoEnabled && (
          <div className="mb-2 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
            {t('review:reviewPage.demoMode', 'Demo mode')}
          </div>
        )}
        {baseEmpty}
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-[#171717] p-3">
          {previewToolbar}
          {previewCardsUi}
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="w-full h-full flex gap-4 mt-16">
      {/* Left column: search + results */}
      {!sidebarHidden && (
      <div className="w-full lg:w-1/3 min-w-0 lg:sticky lg:top-16 lg:self-start">
        <div className="p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717]">
          {isViewMediaMode && (
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {t(
                'review:reviewPage.mediaModeHint',
                'Search and inspect one media item at a time. Select a result to view its content and analyses on the right.'
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              allowClear
              disabled={!isOnline}
              placeholder={
                isViewMediaMode
                  ? t('review:reviewPage.mediaOnlySearchPlaceholder', 'Search media (title/content)')
                  : t('review:reviewPage.searchPlaceholder', 'Search media, notes...')
              }
              aria-label={
                isViewMediaMode
                  ? (t(
                      'review:reviewPage.mediaOnlySearchPlaceholder',
                      'Search media (title/content)'
                    ) as string)
                  : (t(
                      'review:reviewPage.searchPlaceholder',
                      'Search media, notes...'
                    ) as string)
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={() => refetch()}
              className="flex-1 min-w-[12rem]"
            />
          </div>
          {!isOnline && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t(
                'review:reviewPage.offlineHint',
                'Connect to your tldw server in Settings to send messages and view media. Then you can search media from this page.'
              )}
            </p>
          )}
          <div className="mt-2">
            <Button
              type="primary"
              disabled={!isOnline}
              onClick={() => {
                setPage(1)
                refetch()
              }}
              icon={(<SearchIcon className="w-4 h-4" />) as any}>
              {t('review:reviewPage.search', 'Search')}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 justify-between">
            <button
              className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
              aria-expanded={filtersOpen}
              aria-controls="review-filters"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? '' : '-rotate-90'}`} />
              <span>{t('review:reviewPage.filters', 'Filters')}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">
                {t('review:reviewPage.resultTypes', 'Result types')}
              </span>
              <Checkbox
                checked={kinds.media}
                onChange={(e) =>
                  setKinds((k) => ({ ...k, media: e.target.checked }))
                }>
                {t('review:reviewPage.media', 'Media')}
              </Checkbox>
              <Checkbox
                checked={kinds.notes}
                onChange={(e) =>
                  setKinds((k) => ({ ...k, notes: e.target.checked }))
                }>
                {t('review:reviewPage.notes', 'Notes')}
              </Checkbox>
            </div>
            <div className="ml-auto">
              {allowGeneration && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">
                    {t('review:reviewPage.generationMode', 'Generation mode')}
                  </span>
                  <Radio.Group size="small" value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)}>
                    <Radio.Button value="review">{t('review:reviewPage.useReview', 'Use Review')}</Radio.Button>
                    <Radio.Button value="summary">{t('review:reviewPage.useSummary', 'Use Summary')}</Radio.Button>
                  </Radio.Group>
                </div>
              )}
            </div>
          </div>
          <div id="review-filters" className={`mt-2 grid grid-cols-1 gap-2 overflow-hidden transition-all duration-200 ${filtersOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                mode="tags"
                allowClear
                placeholder={t('review:reviewPage.mediaTypes', 'Media types')}
                aria-label={
                  t('review:reviewPage.mediaTypes', 'Media types') as string
                }
                className="min-w-[12rem] flex-1"
                value={mediaTypes}
                onChange={(vals) => {
                  setMediaTypes(vals as string[])
                  setPage(1)
                }}
                options={availableMediaTypes.map((t) => ({
                  label: t.charAt(0).toUpperCase() + t.slice(1),
                  value: t
                }))}
              />
              <Select
                mode="tags"
                allowClear
                placeholder={t('review:reviewPage.keywords', 'Keywords')}
                aria-label={
                  t('review:reviewPage.keywords', 'Keywords') as string
                }
                className="min-w-[12rem] flex-1"
                value={keywordTokens}
                onSearch={(txt) => loadKeywordSuggestions(txt)}
                onChange={(vals) => {
                  setKeywordTokens(vals as string[])
                  setPage(1)
                }}
                options={keywordOptions.map((k) => ({ label: k, value: k }))}
              />
              <Button
                onClick={() => {
                  setMediaTypes([])
                  setKeywordTokens([])
                  setPage(1)
                }}>
                {t('review:reviewPage.clear', 'Clear filters')}
              </Button>
            </div>
            {(mediaTypes.length > 0 || keywordTokens.length > 0) && (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {mediaTypes.map((mt) => (
                  <Tag
                    key={`mt:${mt}`}
                    className="chip-fade-in transition-all duration-200"
                    closable
                    onClose={() =>
                      setMediaTypes((prev) => prev.filter((t) => t !== mt))
                    }>
                    {mt}
                  </Tag>
                ))}
                {keywordTokens.map((k) => (
                  <Tag
                    key={`kw:${k}`}
                    color="gold"
                    className="chip-fade-in transition-all duration-200"
                    closable
                    onClose={() =>
                      setKeywordTokens((prev) => prev.filter((t) => t !== k))
                    }>
                    {k}
                  </Tag>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t(
              'review:mediaPage.filterHelp',
              'Search matches title and content; Media types and Keywords further narrow the results.'
            )}
          </p>
        </div>
        <div className="mt-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] max-h-[50vh] md:max-h-[60vh] lg:max-h-[calc(100dvh-18rem)] overflow-auto">
          <div
            className="sticky -m-3 mb-2 top-0 z-10 px-3 py-2 bg-white dark:bg-[#171717] border-b dark:border-gray-700 flex items-center justify-between"
            role="heading"
            aria-level={2}
            aria-label={`${t('review:reviewPage.results', 'Results')} (${displayedResults.length} items)`}
            data-testid="review-results-header">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-500">{t('review:reviewPage.results', 'Results')}</span>
              <span className="text-[11px] text-gray-400">
                {t('review:reviewPage.loadedOf', '{{count}} loaded', { count: displayedResults.length })}{mediaTotal ? ` · ${mediaTotal} total` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {`${displayedResults.length} item${displayedResults.length === 1 ? '' : 's'}`}
              </span>
              <Tooltip
                title={
                  t(
                    'review:reviewPage.resultsHelp',
                    'Keyboard: Tab into the results list, use Enter or Space to select the focused row, then use the Prev/Next buttons in the analysis toolbar to move between items.'
                  ) as string
                }
              >
                <Button
                  size="small"
                  shape="circle"
                  type="text"
                  aria-label={t(
                    'review:reviewPage.resultsHelpLabel',
                    'Review results keyboard shortcuts'
                  ) as string}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ?
                </Button>
              </Tooltip>
            </div>
          </div>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            {t(
              'review:reviewPage.resultsHint',
              'Click a result to load its content and analyses on the right.'
            )}
          </p>
          {isFetching ? (
            <div
              className="flex flex-col items-center justify-center py-10"
              role="status"
              aria-live="polite"
            >
              <Spin />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('review:mediaPage.searchingBanner', 'Searching media…')}
              </div>
            </div>
          ) : (
            <List
              size="small"
              dataSource={displayedResults}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      isViewMediaMode
                        ? t('review:mediaPage.noResults', 'No media found. Use Quick ingest in the header to add media from your recordings and files.')
                        : t('review:reviewPage.noResults', 'No results')
                    }
                  />
                )
              }}
              renderItem={(item) => {
                const isSelected =
                  !!selected &&
                  selected.id === item.id &&
                  selected.kind === item.kind
                return (
                  <List.Item
                    key={`${item.kind}:${item.id}`}
                    onClick={() => {
                      setSelected(item)
                      setAnalysis("")
                      loadExistingAnalyses(item)
                    }}
                    role="button"
                    tabIndex={0}
                    aria-selected={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(item)
                        setAnalysis("")
                        loadExistingAnalyses(item)
                      }
                    }}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 result-fade-in border-l-2 ${
                      isSelected
                        ? 'border-l-blue-500 !bg-gray-100 dark:!bg-gray-800'
                        : 'border-l-transparent'
                    }`}>
                    <div className="w-full">
                      <div className="flex items-center gap-2">
                        <Tag color={item.kind === "media" ? "blue" : "gold"}>
                          {item.kind.toUpperCase()}
                        </Tag>
                        <Typography.Text
                          strong
                          ellipsis
                          className="max-w-[18rem]">
                          {item.title || String(item.id)}
                        </Typography.Text>
                        {isSelected && (
                          <Tag color="green" className="text-[10px]">
                            {t('review:reviewPage.selectedBadge', 'Selected')}
                          </Tag>
                        )}
                      </div>
                      {item.snippet && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {item.snippet}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {item.meta?.type ? String(item.meta.type) : ""}{" "}
                        {item.meta?.created_at
                          ? `· ${new Date(item.meta.created_at).toLocaleString()}`
                          : ""}
                      </div>
                    </div>
                  </List.Item>
                )
              }}
            />
          )}
          {kinds.media && mediaTotal > 0 && (
            <div className="mt-3 flex flex-col items-center gap-1">
              <Pagination
                size="small"
                current={page}
                pageSize={pageSize}
                total={mediaTotal}
                showSizeChanger
                pageSizeOptions={[10, 20, 50, 100] as any}
                onChange={(p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                }}
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t(
                  'review:reviewPage.paginationHint',
                  'Use filters or pagination to refine the results if many items are loaded.'
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      )}
      {/* Vertical toggle bar */}
      <div className="w-6 flex-shrink-0 h-full flex items-center">
        {/*
          Align with Multi-Item Review: state-aware accessible label.
        */}
        {(() => {
          const sidebarLabel = sidebarHidden
            ? t('review:reviewPage.showSidebar', 'Show results sidebar')
            : t('review:reviewPage.hideSidebar', 'Hide results sidebar')
          return (
        <button
          title={sidebarLabel}
          aria-label={sidebarLabel}
          onClick={() => setSidebarHidden((v) => !v)}
          className="h-full w-6 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300"
        >
          <span className="sr-only">
            {sidebarLabel}
          </span>
          <span aria-hidden="true">
            {sidebarHidden ? '>>' : '<<'}
          </span>
        </button>
          )
        })()}
      </div>

      {/* Right/center: analysis panel */}
      <div className="flex-1 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] min-h-[70vh] min-w-0 lg:h-[calc(100dvh-8rem)] overflow-auto">
        <div className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white/80 p-2 dark:border-gray-700 dark:bg-[#111111]/80 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-semibold uppercase">
              {t('review:reviewPage.bulkToolbar', 'Review controls')}
            </span>
            <span className="text-gray-500">
              {t('review:reviewPage.loadedCount', '{{count}} loaded', { count: displayedResults.length })}
              {mediaTotal > 0 ? ` / ${mediaTotal}` : ""}
            </span>
          </div>
          {isViewMediaMode && selected && selected.kind === 'media' && (
            <Button
              size="small"
              type="link"
              onClick={() => {
                try {
                  localStorage.setItem('tldw:lastMediaId', String(selected.id))
                } catch {}
                navigate('/media-multi')
              }}
            >
              {t('review:reviewPage.openInMulti', 'Open in Multi-Item Review')}
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-gray-500">
                {t('review:reviewPage.viewLabel', 'Content view')}
              </span>
              <Button
                size="small"
                onClick={() => {
                  setContentCollapsed(false)
                  setAnalysisCollapsed(false)
                }}
              >
                {t('review:reviewPage.expandAllContent', 'Show full')}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setContentCollapsed(true)
                  setAnalysisCollapsed(true)
                }}
              >
                {t('review:reviewPage.collapseAllContent', 'Show shorter')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[11px] text-gray-500">
                {t('review:reviewPage.navigateLabel', 'Items')}
              </span>
              <Button
                size="small"
                onClick={goPrevItem}
                disabled={selectedResultIndex <= 0}
              >
                {t('review:reviewPage.prevItem', 'Previous')}
              </Button>
              <Button
                size="small"
                onClick={goNextItem}
                disabled={
                  selectedResultIndex < 0 ||
                  selectedResultIndex >= displayedResults.length - 1
                }
              >
                {t('review:reviewPage.nextItem', 'Next')}
              </Button>
            </div>
          </div>
          {displayedResults.length > 5 && (
            <div className="w-full flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-gray-500">{t('review:reviewPage.jumpTo', 'Jump to')}</span>
              <div className="flex flex-wrap gap-1">
                {displayedResults.slice(0, 12).map((r) => (
                  <Button
                    key={`${r.kind}:${r.id}`}
                    size="small"
                    type={selected?.id === r.id ? 'primary' : 'default'}
                    onClick={() => {
                      setSelected(r)
                      setAnalysis("")
                      loadExistingAnalyses(r)
                    }}>
                    {String(r.title || r.id).slice(0, 24)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <Empty
              description={
                allowGeneration
                  ? t('review:reviewPage.selectItemEmpty', 'Select an item to review and analyze')
                  : t('review:reviewPage.selectMediaEmpty', 'Select a media item to view analyses')
              }
            />
          </div>
        ) : (
            <div className="flex flex-col gap-3 h-full min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag color={selected.kind === "media" ? "blue" : "gold"}>
                  {selected.kind.toUpperCase()}
                </Tag>
                <div className="truncate max-w-[min(70vw,48rem)]">
                  <Typography.Title level={5} className="!mb-0 truncate">
                    {selected.title || String(selected.id)}
                  </Typography.Title>
                </div>
                {selected?.kind === 'media' && currentVersionNumber && (
                  <Tag color="green">Current v{currentVersionNumber}</Tag>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-500">
                  {t(
                    "review:reviewPage.askAssistantLabel",
                    "Ask the assistant"
                  )}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selected?.kind === "media" && (
                    <>
                      <Tooltip
                        title={
                          t(
                            "review:reviewPage.chatWithMediaHint",
                            "Open Chat and prefill the composer with this media’s content."
                          ) as string
                        }
                      >
                        <Button
                          icon={(<SendIcon className="w-4 h-4" />) as any}
                          onClick={() => {
                            const title = selected.title || String(selected.id)
                            const content =
                              selectedContent ||
                              contentFromDetail(selectedDetail) ||
                              ""
                            try {
                              const payload = {
                                mediaId: String(selected.id),
                                title,
                                content
                              }
                              if (typeof window !== "undefined") {
                                window.localStorage.setItem(
                                  "tldw:discussMediaPrompt",
                                  JSON.stringify(payload)
                                )
                                try {
                                  window.dispatchEvent(
                                    new CustomEvent("tldw:discuss-media", {
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
                            setChatMode("normal")
                            setSelectedKnowledge(null as any)
                            setRagMediaIds(null)
                            navigate("/")
                            message.success(
                              t(
                                "review:reviewPage.chatPrepared",
                                "Prepared chat with this media in the composer."
                              )
                            )
                          }}
                        >
                          {t(
                            "review:reviewPage.chatWithMedia",
                            "Chat with this media"
                          )}
                        </Button>
                      </Tooltip>
                      <Tooltip
                        title={
                          t(
                            "review:reviewPage.chatAboutMediaHint",
                            "Open RAG chat scoped to this media only."
                          ) as string
                        }
                      >
                        <Button
                          onClick={() => {
                            const idNum = Number(selected.id)
                            if (!Number.isFinite(idNum)) {
                              message.warning(
                                t(
                                  "review:reviewPage.chatAboutMediaInvalidId",
                                  "This media item does not have a numeric id yet."
                                )
                              )
                              return
                            }
                            setSelectedKnowledge(null as any)
                            setRagMediaIds([idNum])
                            setChatMode("rag")
                            navigate("/")
                            try {
                              if (typeof window !== "undefined") {
                                window.dispatchEvent(
                                  new CustomEvent("tldw:focus-composer")
                                )
                              }
                            } catch {
                              // ignore
                            }
                            message.success(
                              t(
                                "review:reviewPage.chatAboutMediaRagSent",
                                "Opened media-scoped RAG chat."
                              )
                            )
                          }}
                        >
                          {t(
                            "review:reviewPage.chatAboutMedia",
                            "Chat about this media"
                          )}
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  {allowGeneration && (
                      <>
                        <Tooltip
                          title={
                            t(
                              "review:reviewPage.reviewHint",
                              "Ask the assistant to review this item."
                            ) as string
                          }
                        >
                          <Button
                            icon={(<SparklesIcon className="w-4 h-4" />) as any}
                            onClick={() => runOneOff("review")}
                            loading={loadingAnalysis}
                          >
                            {t("review:reviewPage.review", "Get review")}
                          </Button>
                        </Tooltip>
                        <Tooltip
                          title={
                            t(
                              "review:reviewPage.summaryHint",
                              "Ask for a shorter summary."
                            ) as string
                          }
                        >
                          <Button
                            icon={(<FileTextIcon className="w-4 h-4" />) as any}
                            onClick={() => runOneOff("summary")}
                            loading={loadingAnalysis}
                          >
                            {t("review:reviewPage.summary", "Get summary")}
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-500">
                    {t(
                      "review:reviewPage.saveResultsLabel",
                      "Save results"
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {allowGeneration && selected?.kind === "media" && (
                      <>
                        <Tooltip
                          title={
                            t(
                              "review:reviewPage.attachGeneratedHint",
                              "Run the assistant and attach the result to this media item."
                            ) as string
                          }
                        >
                          <Button
                            onClick={() => analyzeAndSaveToMedia(analysisMode)}
                            loading={loadingAnalysis}
                          >
                            {analysisMode === "review"
                              ? t(
                                  "review:reviewPage.attachReview",
                                  "Attach review to media"
                                )
                              : t(
                                  "review:reviewPage.attachSummary",
                                  "Attach summary to media"
                                )}
                          </Button>
                        </Tooltip>
                        <Tooltip
                          title={
                            t(
                              "review:reviewPage.saveGeneratedNoteHint",
                              "Run the assistant and save the result as a note."
                            ) as string
                          }
                        >
                          <Button
                            onClick={() => analyzeAndSaveToNote(analysisMode)}
                            loading={loadingAnalysis}
                          >
                            {analysisMode === "review"
                              ? t(
                                  "review:reviewPage.saveReviewNote",
                                  "Save review as note"
                                )
                              : t(
                                  "review:reviewPage.saveSummaryNote",
                                  "Save summary as note"
                                )}
                          </Button>
                        </Tooltip>
                      </>
                    )}
                    {selected?.kind === "media" && (
                      <Tooltip
                        title={
                          t(
                            "review:reviewPage.saveToMediaHint",
                            "Attach the current text in the editor to this media item."
                          ) as string
                        }
                      >
                        <Button
                          icon={(<PaperclipIcon className="w-4 h-4" />) as any}
                          onClick={saveAnalysisToMedia}
                          disabled={!analysis.trim()}
                        >
                          {t(
                            "review:reviewPage.saveToMedia",
                            "Attach current text to media"
                          )}
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip
                      title={t(
                        "review:reviewPage.saveAnalysisHint",
                        "Create a note from the current analysis."
                      ) as string}
                    >
                      <Button
                        icon={(<SaveIcon className="w-4 h-4" />) as any}
                        onClick={saveAnalysis}
                        disabled={!analysis.trim()}
                      >
                        {t(
                          "review:reviewPage.saveAnalysis",
                          "Save to notes"
                        )}
                      </Button>
                    </Tooltip>
                    {hasSelectedMedia && (
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: "saveNewVersion",
                              disabled: !canCreateVersion,
                              label: t(
                                "review:reviewPage.moreSaveNewVersion",
                                "Save as new version"
                              )
                            },
                            {
                              key: "duplicateVersion",
                              disabled: !hasSelectedVersion,
                              label: t(
                                "review:reviewPage.moreDuplicateVersion",
                                "Duplicate version"
                              )
                            },
                            {
                              key: "restoreVersion",
                              disabled: !hasSelectedVersion,
                              label: t(
                                "review:reviewPage.moreRestoreVersion",
                                "Restore selected version"
                              )
                            }
                          ],
                          onClick: async ({ key }) => {
                            if (!selected || selected.kind !== "media") {
                              return
                            }
                            if (key === "saveNewVersion") {
                              if (!selectedContent?.trim()) {
                                message.warning("No media content available")
                                return
                              }
                              if (!analysis.trim()) {
                                message.warning("Analysis is empty")
                                return
                              }
                              const sys =
                                analysisMode === "review"
                                  ? reviewSystemPrompt
                                  : summarySystemPrompt
                              const prompt = lastPrompt || sys
                              try {
                                await bgRequest<any>({
                                  path: `/api/v1/media/${selected.id}/versions` as any,
                                  method: "POST" as any,
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: {
                                    content: selectedContent,
                                    prompt,
                                    analysis_content: analysis
                                  }
                                })
                                message.success("Created new version")
                                await loadExistingAnalyses(selected)
                              } catch (e: any) {
                                message.error(
                                  e?.message || "Create version failed"
                                )
                              }
                            } else if (key === "duplicateVersion") {
                              if (
                                selectedExistingIndex < 0 ||
                                selectedExistingIndex >= existingAnalyses.length
                              ) {
                                message.warning("Select a version first")
                                return
                              }
                              const v =
                                existingAnalyses[selectedExistingIndex]
                              const vv = getVersionNumber(v)
                              if (!vv) {
                                message.warning("No version number")
                                return
                              }
                              try {
                                const detail = await fetchVersionWithContent(
                                  selected.id,
                                  vv
                                )
                                const content = String(
                                  detail?.content || detail?.text || ""
                                )
                                const prompt = getVersionPrompt(v) || ""
                                const analysisText = getVersionAnalysis(v)
                                if (!content) {
                                  message.warning(
                                    "Selected version has no content"
                                  )
                                  return
                                }
                                await bgRequest<any>({
                                  path: `/api/v1/media/${selected.id}/versions` as any,
                                  method: "POST" as any,
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: {
                                    content,
                                    prompt,
                                    analysis_content: analysisText
                                  }
                                })
                                message.success("Cloned version created")
                                await loadExistingAnalyses(selected)
                              } catch (e: any) {
                                message.error(
                                  e?.message || "Clone failed"
                                )
                              }
                            } else if (key === "restoreVersion") {
                              if (
                                selectedExistingIndex < 0 ||
                                selectedExistingIndex >= existingAnalyses.length
                              ) {
                                message.warning("Select a version first")
                                return
                              }
                              const v =
                                existingAnalyses[selectedExistingIndex]
                              const vv = getVersionNumber(v)
                              if (!vv) {
                                message.warning("No version number")
                                return
                              }
                              const ok = await confirmDanger({
                                title: "Please confirm",
                                content:
                                  "Restore this version as current?",
                                okText: "Restore",
                                cancelText: "Cancel"
                              })
                              if (!ok) return
                              try {
                                await bgRequest<any>({
                                  path: `/api/v1/media/${selected.id}/versions/rollback` as any,
                                  method: "POST" as any,
                                  headers: {
                                    "Content-Type": "application/json"
                                  },
                                  body: { version_number: vv }
                                })
                                message.success("Version restored")
                                await loadExistingAnalyses(selected)
                              } catch (e: any) {
                                message.error(
                                  e?.message || "Restore failed"
                                )
                              }
                            }
                          }
                        }}
                      >
                        <Button>
                          {t(
                            "review:reviewPage.moreActions",
                            "More actions"
                          )}
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </Dropdown>
                    )}
                  </div>
                </div>
                {allowGeneration && (
                  <Radio.Group
                    size="small"
                    value={analysisMode}
                    onChange={(e) => setAnalysisMode(e.target.value)}
                  >
                    <Radio.Button value="review">
                      {t(
                        "review:reviewPage.modeReview",
                        "Use review"
                      )}
                    </Radio.Button>
                    <Radio.Button value="summary">
                      {t(
                        "review:reviewPage.modeSummary",
                        "Use summary"
                      )}
                    </Radio.Button>
                  </Radio.Group>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 -mt-2">
              {allowGeneration && (
                <>
                  <Checkbox
                    checked={autoReviewOnSelect}
                    onChange={(e) => setAutoReviewOnSelect(e.target.checked)}>
                    {t('review:reviewPage.autoReviewLabel', 'Automatically generate a review when you select an item')}
                  </Checkbox>
                  <button
                    className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
                    onClick={() => setPromptsOpen((v) => !v)}
                    aria-expanded={promptsOpen}
                    aria-controls="custom-prompts"
                  >
                    {t('review:reviewPage.customizePrompts', 'Customize prompts')}
                  </button>
                </>
              )}
              {/* Quick dropdown editors for prompts */}
              <Dropdown
                trigger={["click"]}
                placement="bottomLeft"
                dropdownRender={() => (
                  <div className="p-2 w-[420px] bg-white dark:bg-[#171717] border dark:border-gray-700 rounded shadow">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-500">{t('review:reviewPage.searchPrompts', 'Search prompts')}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={revIncludeLocal} onChange={(e) => setRevIncludeLocal(e.target.checked)} /> {t('review:reviewPage.includeLocal', 'Local')}</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={revIncludeServer} onChange={(e) => setRevIncludeServer(e.target.checked)} /> {t('review:reviewPage.includeServer', 'Server')}</label>
                      </div>
                    </div>
                    <Input.Search
                      value={revQ}
                      onChange={(e) => setRevQ(e.target.value)}
                      onSearch={async (q) => {
                        if (!q.trim()) { setRevResults([]); return }
                        setRevLoading(true)
                        try {
                          let merged: Array<{ id?: string; title: string; content: string }> = []
                          if (revIncludeLocal) {
                            const locals = await getAllPrompts()
                            const fl = (locals || []).filter((p) => (p.title?.toLowerCase().includes(q.toLowerCase()) || p.content?.toLowerCase().includes(q.toLowerCase()))).map((p) => ({ id: p.id, title: p.title, content: p.content }))
                            merged = merged.concat(fl)
                          }
                          if (revIncludeServer) {
                            await tldwClient.initialize().catch(() => null)
                            const res = await tldwClient.searchPrompts(q).catch(() => [])
                            const list: any[] = Array.isArray(res) ? res : (res?.results || res?.prompts || [])
                            merged = merged.concat(list.map((x) => ({ id: x.id, title: String(x.title || x.name || 'Untitled'), content: String(x.content || x.prompt || '') })))
                          }
                          // dedupe by title+first64
                          const seen = new Set<string>()
                          const unique = merged.filter((p) => { const k = `${p.title}:${p.content.slice(0,64)}`; if (seen.has(k)) return false; seen.add(k); return true })
                          setRevResults(unique.slice(0, 50))
                        } finally { setRevLoading(false) }
                      }}
                      loading={revLoading}
                      placeholder={t('review:reviewPage.searchPrompts', 'Search prompts') as string}
                      allowClear
                    />
                    {revResults.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-auto rounded border dark:border-gray-700">
                        <List
                          size="small"
                          dataSource={revResults}
                          renderItem={(it) => (
                            <List.Item className="!px-2 !py-1 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onMouseDown={(e) => e.preventDefault()} onClick={() => { setReviewSystemPrompt(it.content); setRevResults([]); }}>
                              <div className="truncate text-sm">{it.title}</div>
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">{t('review:reviewPage.presets', 'Presets')}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="small" onClick={() => setReviewSystemPrompt("You are an expert reviewer. Provide a concise, structured review with strengths, weaknesses, and actionable recommendations.")}>{t('review:reviewPage.presetsCritical', 'Critical')}</Button>
                        <Button size="small" onClick={() => setReviewSystemPrompt("Act as a QA auditor. Identify issues, ambiguities, and missing information. Provide numbered findings and suggested fixes.")}>{t('review:reviewPage.presetsQaAudit', 'QA Audit')}</Button>
                        <Button size="small" onClick={() => setReviewSystemPrompt("Provide a bullet-point review focusing on clarity, completeness, and relevance. Include a brief overall assessment at the end.")}>{t('review:reviewPage.presetsBulletReview', 'Bullet Review')}</Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{t('review:reviewPage.reviewSystemPrompt', 'Review: System prompt')}</div>
                    <textarea
                      className="w-full text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] mt-1"
                      rows={4}
                      value={reviewSystemPrompt}
                      onChange={(e) => setReviewSystemPrompt(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-2 mb-1">{t('review:reviewPage.reviewUserPrefix', 'Review: User prompt prefix')}</div>
                    <textarea
                      className="w-full text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]"
                      rows={3}
                      value={reviewUserPrefix}
                      onChange={(e) => setReviewUserPrefix(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="small" onClick={async () => { try { const storage = new Storage({ area: 'local' }); await storage.set(scopedKey('review:prompts'), { reviewSystemPrompt, reviewUserPrefix, summarySystemPrompt, summaryUserPrefix }); message.success(t('review:reviewPage.saveAsDefault', 'Saved as default')); } catch {} }}>{t('review:reviewPage.saveAsDefault', 'Save as default')}</Button>
                    </div>
                  </div>
                )}
              >
                <button className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]" aria-haspopup="true">
                  {t('review:reviewPage.reviewPrompt', 'Review prompt')}
                </button>
              </Dropdown>
              <Dropdown
                trigger={["click"]}
                placement="bottomLeft"
                dropdownRender={() => (
                  <div className="p-2 w-[420px] bg-white dark:bg-[#171717] border dark:border-gray-700 rounded shadow">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-500">{t('review:reviewPage.searchPrompts', 'Search prompts')}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={sumIncludeLocal} onChange={(e) => setSumIncludeLocal(e.target.checked)} /> {t('review:reviewPage.includeLocal', 'Local')}</label>
                        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={sumIncludeServer} onChange={(e) => setSumIncludeServer(e.target.checked)} /> {t('review:reviewPage.includeServer', 'Server')}</label>
                      </div>
                    </div>
                    <Input.Search
                      value={sumQ}
                      onChange={(e) => setSumQ(e.target.value)}
                      onSearch={async (q) => {
                        if (!q.trim()) { setSumResults([]); return }
                        setSumLoading(true)
                        try {
                          let merged: Array<{ id?: string; title: string; content: string }> = []
                          if (sumIncludeLocal) {
                            const locals = await getAllPrompts()
                            const fl = (locals || []).filter((p) => (p.title?.toLowerCase().includes(q.toLowerCase()) || p.content?.toLowerCase().includes(q.toLowerCase()))).map((p) => ({ id: p.id, title: p.title, content: p.content }))
                            merged = merged.concat(fl)
                          }
                          if (sumIncludeServer) {
                            await tldwClient.initialize().catch(() => null)
                            const res = await tldwClient.searchPrompts(q).catch(() => [])
                            const list: any[] = Array.isArray(res) ? res : (res?.results || res?.prompts || [])
                            merged = merged.concat(list.map((x) => ({ id: x.id, title: String(x.title || x.name || 'Untitled'), content: String(x.content || x.prompt || '') })))
                          }
                          const seen = new Set<string>()
                          const unique = merged.filter((p) => { const k = `${p.title}:${p.content.slice(0,64)}`; if (seen.has(k)) return false; seen.add(k); return true })
                          setSumResults(unique.slice(0, 50))
                        } finally { setSumLoading(false) }
                      }}
                      loading={sumLoading}
                      placeholder={t('review:reviewPage.searchPrompts', 'Search prompts') as string}
                      allowClear
                    />
                    {sumResults.length > 0 && (
                      <div className="mt-2 max-h-40 overflow-auto rounded border dark:border-gray-700">
                        <List
                          size="small"
                          dataSource={sumResults}
                          renderItem={(it) => (
                            <List.Item className="!px-2 !py-1 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onMouseDown={(e) => e.preventDefault()} onClick={() => { setSummarySystemPrompt(it.content); setSumResults([]); }}>
                              <div className="truncate text-sm">{it.title}</div>
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">{t('review:reviewPage.presets', 'Presets')}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="small" onClick={() => setSummarySystemPrompt("Summarize into key points and an executive abstract. Keep it concise and actionable.")}>{t('review:reviewPage.presetsExecutive', 'Executive')}</Button>
                        <Button size="small" onClick={() => setSummarySystemPrompt("Write a detailed summary with sections: Overview, Key Points, and Takeaways. Keep neutral tone.")}>{t('review:reviewPage.presetsDetailed', 'Detailed')}</Button>
                        <Button size="small" onClick={() => setSummarySystemPrompt("Create a short bullet-point summary capturing the core ideas and any decisions.")}>{t('review:reviewPage.presetsBullets', 'Bullets')}</Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{t('review:reviewPage.summarySystemPrompt', 'Summary: System prompt')}</div>
                    <textarea
                      className="w-full text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] mt-1"
                      rows={4}
                      value={summarySystemPrompt}
                      onChange={(e) => setSummarySystemPrompt(e.target.value)}
                    />
                    <div className="text-xs text-gray-500 mt-2 mb-1">{t('review:reviewPage.summaryUserPrefix', 'Summary: User prompt prefix')}</div>
                    <textarea
                      className="w-full text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]"
                      rows={3}
                      value={summaryUserPrefix}
                      onChange={(e) => setSummaryUserPrefix(e.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="small" onClick={async () => { try { const storage = new Storage({ area: 'local' }); await storage.set(scopedKey('review:prompts'), { reviewSystemPrompt, reviewUserPrefix, summarySystemPrompt, summaryUserPrefix }); message.success(t('review:reviewPage.saveAsDefault', 'Saved as default')); } catch {} }}>{t('review:reviewPage.saveAsDefault', 'Save as default')}</Button>
                    </div>
                  </div>
                )}
              >
                <button className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]" aria-haspopup="true">
                  {t('review:reviewPage.summaryPrompt', 'Summary prompt')}
                </button>
              </Dropdown>
              <button
                className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
                onClick={() => setDebugOpen((v) => !v)}
                aria-expanded={debugOpen}
                aria-controls="debug-json"
              >
                {t('review:reviewPage.showRawJson', 'Developer tools: show raw JSON')}
              </button>
              <button
                className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
                aria-controls="debug-json custom-prompts"
              >
                {t('review:reviewPage.advancedTools', 'Advanced tools')}
              </button>
            </div>
            {advancedOpen && (
            <>
            <Divider className="!my-2" />
            <div id="debug-json" className={`overflow-hidden transition-all duration-200 ${debugOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="rounded border dark:border-gray-700 p-2 bg-gray-50 dark:bg-[#111] text-xs">
                <pre className="whitespace-pre-wrap break-all">{selectedDetail ? JSON.stringify(selectedDetail, null, 2) : t('review:reviewPage.noDetailLoaded', 'No detail loaded')}</pre>
              </div>
              <Divider className="!my-3" />
            </div>
            {/* Customize prompts section */}
            {allowGeneration && (
            <div id="custom-prompts" className={`overflow-hidden transition-all duration-200 ${promptsOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded border dark:border-gray-700 p-2">
                  <Typography.Text type="secondary">{t('review:reviewPage.reviewSystemPrompt', 'Review: System prompt')}</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[6rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={reviewSystemPrompt} onChange={(e) => setReviewSystemPrompt(e.target.value)} />
                  <Typography.Text type="secondary" className="block mt-2">{t('review:reviewPage.reviewUserPrefix', 'Review: User prompt prefix')}</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[4rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={reviewUserPrefix} onChange={(e) => setReviewUserPrefix(e.target.value)} />
                </div>
                <div className="rounded border dark:border-gray-700 p-2">
                  <Typography.Text type="secondary">{t('review:reviewPage.summarySystemPrompt', 'Summary: System prompt')}</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[6rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={summarySystemPrompt} onChange={(e) => setSummarySystemPrompt(e.target.value)} />
                  <Typography.Text type="secondary" className="block mt-2">{t('review:reviewPage.summaryUserPrefix', 'Summary: User prompt prefix')}</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[4rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={summaryUserPrefix} onChange={(e) => setSummaryUserPrefix(e.target.value)} />
                </div>
              </div>
              <div className="mt-2">
                <Button size="small" onClick={() => { setReviewSystemPrompt("You are an expert reviewer. Provide a concise, structured review of the following content."); setReviewUserPrefix(""); setSummarySystemPrompt("Summarize the following content into key points and a brief abstract."); setSummaryUserPrefix("") }}>{t('review:reviewPage.resetToDefaults', 'Reset to defaults')}</Button>
              </div>
              <Divider className="!my-3" />
            </div>
            )}
            </>
            )}

            {/* Stack: Media Content then Analysis then Existing Analyses */}
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto min-h-[14rem] md:h-[32vh]">
                <div className="flex items-center justify-between">
                  <Typography.Text type="secondary">Media Content</Typography.Text>
                  <div className="flex items-center gap-2">
                    <Button size="small" type="link" onClick={() => setContentCollapsed((v) => !v)}>
                      {contentCollapsed ? t('review:reviewPage.expandContent', 'Expand') : t('review:reviewPage.collapseContent', 'Collapse')}
                    </Button>
                    <Tooltip title="Copy content">
                      <Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(selectedContent || '') ; message.success('Content copied') } catch { message.error('Copy failed') } }} icon={(<CopyIcon className="w-4 h-4" />) as any} />
                    </Tooltip>
                    <Button size="small" onClick={() => setMediaJsonOpen(v => !v)}>{mediaJsonOpen ? 'Hide raw' : 'Show raw'}</Button>
                  </div>
                </div>
                <div className="mt-2 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
                  {selectedContent ? (
                    contentCollapsed
                      ? <span className="text-xs text-gray-500">{selectedContent.slice(0, 160)}{selectedContent.length > 160 ? '…' : ''}</span>
                      : (
                        <>
                          {mediaExpanded || selectedContent.length <= 2500
                            ? selectedContent
                            : (selectedContent.slice(0, 2500) + '…')}
                          {selectedContent.length > 2500 && (
                            <button
                              className="ml-2 underline text-xs"
                              onClick={() => setMediaExpanded((v) => !v)}
                            >
                              {mediaExpanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </>
                      )
                  ) : (
                    <span className="text-xs text-gray-500">No content available</span>
                  )}
                </div>
                {mediaJsonOpen && (
                  <div className="mt-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-xs p-2 overflow-auto max-h-40">
                <pre className="whitespace-pre-wrap break-all">{selectedDetail ? JSON.stringify(selectedDetail, null, 2) : t('review:reviewPage.noDetailLoaded', 'No detail loaded')}</pre>
                  </div>
                )}
              </div>
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto min-h-[14rem] md:h-[32vh] bg-gray-50 dark:bg-[#121212]">
                <div className="flex items-center justify-between">
                  <Typography.Text type="secondary">Analysis</Typography.Text>
                  <div className="flex items-center gap-2">
                    <Button size="small" type="link" onClick={() => setAnalysisCollapsed((v) => !v)}>
                      {analysisCollapsed ? t('review:reviewPage.expandAnalysis', 'Expand') : t('review:reviewPage.collapseAnalysis', 'Collapse')}
                    </Button>
                    <Tooltip title="Copy analysis">
                      <Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(analysis || '') ; message.success('Analysis copied') } catch { message.error('Copy failed') } }} icon={(<CopyIcon className="w-4 h-4" />) as any} />
                    </Tooltip>
                    <Tooltip title="Send analysis to chat">
                      <Button size="small" onClick={async () => {
                        if (!analysis.trim()) { message.warning('Nothing to send'); return }
                        try {
                          const payload = `Please review this analysis and continue the discussion:\n\n${analysis}`
                          setMessages([...(messages || []), { isBot: false, name: 'You', message: payload, sources: [] }])
                          navigate('/')
                          message.success('Sent to chat')
                        } catch { message.error('Failed to send') }
                      }} icon={(<SendIcon className="w-4 h-4" />) as any} />
                    </Tooltip>
                  </div>
                </div>
                {analysisCollapsed ? (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {analysis ? `${analysis.slice(0, 200)}${analysis.length > 200 ? '…' : ''}` : t('review:reviewPage.noAnalysis', 'No analysis yet')}
                  </div>
                ) : (
                  <textarea
                    className="w-full mt-2 min-h-[12rem] md:h-[26vh] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] resize-y leading-relaxed"
                    value={analysis}
                    onChange={(e) => setAnalysis(e.target.value)}
                    placeholder="Run Review or Summarize, then edit here..."
                  />
                )}
              </div>
              {/* Header above container */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Typography.Text type="secondary">Existing Analyses</Typography.Text>
                  <Checkbox checked={onlyWithAnalysis} onChange={(e) => setOnlyWithAnalysis(e.target.checked)} className="text-xs">Only with analysis</Checkbox>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip title="Copy all as plain text">
                    <Button size="small" onClick={async () => { const text = (existingAnalyses || []).map((n, idx) => `Note ${n?.id ?? idx+1}\n\n${String(n?.content || '')}`).join("\n\n---\n\n"); try { await navigator.clipboard.writeText(text); message.success('Copied all notes') } catch { message.error('Copy failed') } }}>Copy All</Button>
                  </Tooltip>
                  <Tooltip title="Copy all as Markdown">
                    <Button size="small" onClick={async () => { const md = (existingAnalyses || []).map((n, idx) => `### Note ${n?.id ?? idx+1}\n\n${toMarkdown(String(n?.content || ''))}`).join("\n\n---\n\n"); try { await navigator.clipboard.writeText(md); message.success('Copied all notes as Markdown') } catch { message.error('Copy failed') } }}>Copy MD</Button>
                  </Tooltip>
                </div>
              </div>
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto min-h-[10rem]">
                {displayedVersionIndices.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-gray-500">{selectedDisplayPos >= 0 ? `${selectedDisplayPos + 1}/${displayedVersionIndices.length}` : `0/${displayedVersionIndices.length}`}</span>
                    <Button size="small" onClick={goPrev}>Prev</Button>
                    <Button size="small" onClick={goNext}>Next</Button>
                    <Tooltip title="Load selected analysis into editor">
                      <Button size="small" disabled={selectedExistingIndex < 0 || selectedExistingIndex >= existingAnalyses.length} onClick={() => { const v = existingAnalyses[selectedExistingIndex]; const text = getVersionAnalysis(v); if (text) setAnalysis(text) }}>Load</Button>
                    </Tooltip>
                    <Dropdown
                      trigger={["click"]}
                      placement="bottomLeft"
                      dropdownRender={() => (
                        <div className="p-2 w-[260px] bg-white dark:bg-[#171717] border dark:border-gray-700 rounded shadow">
                          <div className="text-xs text-gray-500 mb-2">More actions</div>
                          <div className="flex flex-col gap-1">
                            <Button
                              size="small"
                              onClick={() => {
                                if (selectedExistingIndex < 0 || selectedExistingIndex >= existingAnalyses.length) { message.warning('Select a version first'); return }
                                const v = existingAnalyses[selectedExistingIndex]
                                const p = getVersionPrompt(v)
                                if (!p) { message.warning('No prompt found'); return }
                                if (analysisMode === 'review') setReviewSystemPrompt(p); else setSummarySystemPrompt(p)
                              }}
                            >
                              Load version prompt into editor
                            </Button>
                            <Button
                              size="small"
                              onClick={async () => {
                                if (selectedExistingIndex < 0 || selectedExistingIndex >= existingAnalyses.length) { message.warning('Select a version first'); return }
                                const v = existingAnalyses[selectedExistingIndex]
                                const p = getVersionPrompt(v)
                                if (!p) { message.warning('No prompt found'); return }
                                try { await navigator.clipboard.writeText(p); message.success('Prompt copied') } catch { message.error('Copy failed') }
                              }}
                            >
                              Copy selected version prompt
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                if (selectedExistingIndex < 0 || selectedExistingIndex >= existingAnalyses.length) { message.warning('Select a version first'); return }
                                const v = existingAnalyses[selectedExistingIndex]
                                const base = getVersionAnalysis(v)
                                const diff = computeDiff(base, analysis || '')
                                setDiffLines(diff)
                                setDiffLeftText(base)
                                setDiffRightText(analysis || '')
                                setDiffOpen(true)
                              }}
                            >
                              Diff selected vs current
                            </Button>
                            <Button
                              danger
                              size="small"
                              onClick={async () => {
                                try {
                                  if (selectedExistingIndex < 0 || selectedExistingIndex >= existingAnalyses.length) { message.warning('Select a version first'); return }
                                  const v = existingAnalyses[selectedExistingIndex]
                                  const vv = getVersionNumber(v)
                                  if (!vv) { message.warning('No version number'); return }
                                  await bgRequest<any>({ path: `/api/v1/media/${selected?.id}/versions/${vv}` as any, method: 'DELETE' as any })
                                  notification.open({
                                    message: 'Version deleted',
                                    description: `Deleted version v${vv}.`,
                                    btn: (
                                      <Button
                                        type="link"
                                        size="small"
                                        onClick={async () => {
                                          try {
                                            await bgRequest<any>({ path: `/api/v1/media/${selected?.id}/versions/rollback` as any, method: 'POST' as any, headers: { 'Content-Type': 'application/json' }, body: { version_number: vv } })
                                            message.success('Undo: rolled back to deleted version')
                                            if (selected) await loadExistingAnalyses(selected)
                                          } catch (e: any) {
                                            message.error(e?.message || 'Undo failed')
                                          }
                                        }}
                                      >
                                        Undo
                                      </Button>
                                    ),
                                    duration: 4
                                  })
                                  if (selected) await loadExistingAnalyses(selected)
                                } catch (e: any) {
                                  message.error(e?.message || 'Delete failed')
                                }
                              }}
                            >
                              Delete selected version
                            </Button>
                          </div>
                        </div>
                      )}
                    >
                      <Button size="small">
                        {t('review:reviewPage.moreActions', 'More')}
                      </Button>
                    </Dropdown>
                  </div>
                ) : null}
                <Button size="small" onClick={() => setNotesJsonOpen(v => !v)}>{notesJsonOpen ? 'Hide raw' : 'Show raw'}</Button>
              </div>
                {displayedVersionIndices.length === 0 ? (
                  <div className="text-xs text-gray-500 mt-2">No saved analyses for this item yet.</div>
                ) : (
                  <List size="small" dataSource={displayedVersionIndices.map(i=>existingAnalyses[i])} renderItem={(n, i) => (
                    <List.Item className={`!px-1 flex items-start justify-between gap-2 ${displayedVersionIndices[i] === selectedExistingIndex ? 'bg-gray-50 dark:bg-[#262626] rounded' : ''}`} onClick={() => setSelectedExistingIndex(displayedVersionIndices[i])}>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">v{getVersionNumber(n) || (i+1)} {getVersionTimestamp(n) ? `· ${getVersionTimestamp(n)}` : ''} {currentVersionNumber && getVersionNumber(n) === currentVersionNumber ? (<Tag color="green">Current</Tag>) : null}</div>
                        <div className="text-xs text-gray-500 whitespace-pre-wrap max-w-[48rem]">
                          {(() => {
                            const key = String(getVersionNumber(n) ?? displayedVersionIndices[i])
                            const a = getVersionAnalysis(n) || ''
                            const isLong = a.length > 2500
                            const expanded = expandedAnalyses.has(key)
                            const shown = expanded || !isLong ? a : (a.slice(0, 2500) + '…')
                            return (
                              <>
                                {shown}
                                {isLong && (
                                  <button
                                    className="ml-2 underline text-[10px]"
                                    onClick={(e) => { e.stopPropagation(); setExpandedAnalyses(prev => { const ns = new Set(prev); if (ns.has(key)) ns.delete(key); else ns.add(key); return ns }) }}
                                  >
                                    {expanded ? 'Show less' : 'Show more'}
                                  </button>
                                )}
                              </>
                            )
                          })()}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          <span className="opacity-70">Prompt:</span>{' '}
                          {(() => { const key = String(getVersionNumber(n) ?? displayedVersionIndices[i]); const expanded = expandedPrompts.has(key); const p = getVersionPrompt(n); const shown = expanded ? p : (p ? (p.length > 140 ? p.slice(0,140) + '…' : p) : '—'); return (
                            <>
                              <span className="whitespace-pre-wrap">{shown || '—'}</span>
                              {p && (
                                <button className="ml-2 underline" onClick={(e) => { e.stopPropagation(); setExpandedPrompts(prev => { const ns = new Set(prev); if (ns.has(key)) ns.delete(key); else ns.add(key); return ns }) }}>{expanded ? 'Hide' : 'Show'}</button>
                              )}
                            </>
                          ) })()}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Tooltip title="Copy analysis (plain)">
                          <Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(getVersionAnalysis(n)); message.success('Analysis copied') } catch { message.error('Copy failed') } }}>Copy</Button>
                        </Tooltip>
                        <Tooltip title="Copy as Markdown">
                          <Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(toMarkdown(getVersionAnalysis(n))); message.success('Copied analysis as Markdown') } catch { message.error('Copy failed') } }}>MD</Button>
                        </Tooltip>
                        <Tooltip title="Copy prompt">
                          <Button size="small" className="ml-1" onClick={async () => { try { await navigator.clipboard.writeText(getVersionPrompt(n)); message.success('Prompt copied') } catch { message.error('Copy failed') } }}>Prompt</Button>
                        </Tooltip>
                      </div>
                    </List.Item>
                  )} />
                )}
                {notesJsonOpen && (
                  <div className="mt-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-xs p-2 overflow-auto max-h-48">
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(existingAnalyses || [], null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
        )}
      </div>
    </div>
  
  <Modal
    key="diff-modal"
    open={diffOpen}
    onCancel={() => setDiffOpen(false)}
    footer={[
      <Button key="toggle" onClick={() => setDiffSideBySide(v => !v)}>{diffSideBySide ? 'Unified' : 'Side by side'}</Button>,
      <Button key="copy" onClick={async () => { try { const txt = diffLines.map(l => (l.type==='add'?'+ ':l.type==='del'?'- ':'  ')+l.text).join('\n'); await navigator.clipboard.writeText(txt); message.success('Diff copied') } catch { message.error('Copy failed') } }}>Copy diff</Button>,
      <Button key="close" type="primary" onClick={() => setDiffOpen(false)}>Close</Button>
    ]}
    title="Diff: selected vs current"
    width={980}
  >
    {diffSideBySide ? (
      <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto text-xs font-mono">
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Selected version</div>
          <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-[#111] p-2 rounded border dark:border-gray-700">{diffLeftText}</pre>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Current editor</div>
          <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-[#111] p-2 rounded border dark:border-gray-700">{diffRightText}</pre>
        </div>
      </div>
    ) : (
      <div className="max-h-[60vh] overflow-auto text-xs font-mono">
        {diffLines.length === 0 ? (
          <div className="text-gray-500">No differences</div>
        ) : (
          <pre className="whitespace-pre-wrap">
            {diffLines.map((l, idx) => (
              <div key={idx} className={l.type==='add' ? 'bg-green-200/40 dark:bg-green-900/30' : l.type==='del' ? 'bg-red-200/40 dark:bg-red-900/30' : ''}>
                <span className="select-none mr-2 opacity-70">{l.type==='add'?'+':l.type==='del'?'-':' '}</span>{l.text}
              </div>
            ))}
          </pre>
        )}
      </div>
    )}
  </Modal>
  </>
  )
}

export default ReviewPage
