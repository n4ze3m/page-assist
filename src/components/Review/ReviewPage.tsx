import React from "react"
import {
  Button,
  Checkbox,
  Divider,
  Empty,
  Input,
  List,
  message,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Select,
  Pagination,
  Radio
} from "antd"
import { useQuery } from "@tanstack/react-query"
import { bgRequest } from "@/services/background-proxy"
import { tldwClient } from "@/services/tldw/TldwApiClient"
import { useTranslation } from "react-i18next"
import { useMessageOption } from "@/hooks/useMessageOption"
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

export const ReviewPage: React.FC = () => {
  const { t } = useTranslation(["option"])
  const [query, setQuery] = React.useState<string>("")
  const [kinds, setKinds] = React.useState<{ media: boolean; notes: boolean }>({
    media: true,
    notes: true
  })
  const [selected, setSelected] = React.useState<ResultItem | null>(null)
  const [analysis, setAnalysis] = React.useState<string>("")
  const [loadingAnalysis, setLoadingAnalysis] = React.useState<boolean>(false)
  const [existingAnalyses, setExistingAnalyses] = React.useState<NoteItem[]>([])
  const { selectedModel, messages, setMessages } = useMessageOption()
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
  const [promptsOpen, setPromptsOpen] = React.useState<boolean>(false)
  const [reviewSystemPrompt, setReviewSystemPrompt] = React.useState<string>(
    "You are an expert reviewer. Provide a concise, structured review of the following content."
  )
  const [reviewUserPrefix, setReviewUserPrefix] = React.useState<string>("")
  const [summarySystemPrompt, setSummarySystemPrompt] = React.useState<string>(
    "Summarize the following content into key points and a brief abstract."
  )
  const [summaryUserPrefix, setSummaryUserPrefix] = React.useState<string>("")
  const [page, setPage] = React.useState<number>(1)
  const [pageSize, setPageSize] = React.useState<number>(20)
  const [mediaTotal, setMediaTotal] = React.useState<number>(0)
  const [filtersOpen, setFiltersOpen] = React.useState<boolean>(true)
  const [analysisMode, setAnalysisMode] = React.useState<"review" | "summary">("review")

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
    if (!hasQuery || hasFilters) {
      refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

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
      } catch {}

      // Auto-browse: if there is no query or filters, fetch first page
      try {
        if (
          !query.trim() &&
          mediaTypes.length === 0 &&
          keywordTokens.length === 0
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

  // Persist default analysis mode
  React.useEffect(() => {
    ;(async () => {
      try {
        const storage = new Storage({ area: "local" })
        await storage.set(scopedKey("review:defaultMode"), analysisMode)
      } catch {}
    })()
    message.info(analysisMode === 'review' ? 'Using Review prompts' : 'Using Summary prompts', 1)
  }, [analysisMode, scopedKey])

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
    if (!detail || typeof detail !== "object") return ""
    // Try common fields
    const candidates = [
      detail?.content,
      detail?.text,
      detail?.raw_text,
      detail?.summary,
      detail?.latest_version?.content
    ]
    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0) return c
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
      } catch { setSelectedContent("") }
    })()
  }, [selected])

  const loadExistingAnalyses = React.useCallback(async (item: ResultItem) => {
    try {
      if (item.kind !== "media") {
        setExistingAnalyses([])
        return
      }
      const tag = `media:${item.id}`
      const cfg = await tldwClient.getConfig()
      const base = String(cfg?.serverUrl || "").replace(/\/$/, "")
      // GET /api/v1/notes/search/?query=media:<id>
      const abs = await bgRequest<any>({
        path: `${base}/api/v1/notes/search/?query=${encodeURIComponent(tag)}` as any,
        method: "GET" as any
      })
      if (Array.isArray(abs)) setExistingAnalyses(abs)
      else setExistingAnalyses([])
    } catch {
      setExistingAnalyses([])
    }
  }, [])

  const runOneOff = async (mode: "review" | "summary") => {
    if (!selected) {
      message.warning("Select an item to analyze")
      return
    }
    setLoadingAnalysis(true)
    try {
      const text = await generateAnalysis(mode)
      if (!text) {
        message.warning("No content available to analyze")
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
      message.warning("Select a media item first")
      return
    }
    setLoadingAnalysis(true)
    try {
      const text = await generateAnalysis(mode)
      if (!text) {
        message.warning("No content available to analyze")
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
        if (autoReviewOnSelect && selected) {
          const text = await generateAnalysis("review")
          if (text) setAnalysis(text)
        }
      } catch {}
    })()
  }, [autoReviewOnSelect, selected])

  // Preload keyword suggestions (top list)
  React.useEffect(() => {
    ;(async () => {
      try {
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
  }, [])

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
      message.warning("Select a media item first")
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
      message.warning("Select an item first")
      return
    }
    setLoadingAnalysis(true)
    try {
      const text = await generateAnalysis(mode)
      if (!text) {
        message.warning("No content available to analyze")
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
      message.success("Analysis saved as note")
      if (selected.kind === "media") await loadExistingAnalyses(selected)
    } catch (e: any) {
      message.error(e?.message || "Failed to analyze & save note")
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

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-3 gap-4 mt-16">
      {/* Left column: search + results */}
      <div className="lg:col-span-1 min-w-0 lg:sticky lg:top-16 lg:self-start">
        <div className="p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717]">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              allowClear
              placeholder="Search media, notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={() => refetch()}
              className="flex-1 min-w-[12rem]"
            />
            <Button
              type="primary"
              onClick={() => {
                setPage(1)
                refetch()
              }}
              icon={(<SearchIcon className="w-4 h-4" />) as any}>
              Search
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
              <span>Filters</span>
            </button>
            <Checkbox
              checked={kinds.media}
              onChange={(e) =>
                setKinds((k) => ({ ...k, media: e.target.checked }))
              }>
              Media
            </Checkbox>
            <Checkbox
              checked={kinds.notes}
              onChange={(e) =>
                setKinds((k) => ({ ...k, notes: e.target.checked }))
              }>
              Notes
            </Checkbox>
            <div className="ml-auto">
              <Radio.Group size="small" value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)}>
                <Radio.Button value="review">Use Review</Radio.Button>
                <Radio.Button value="summary">Use Summary</Radio.Button>
              </Radio.Group>
            </div>
          </div>
          <div id="review-filters" className={`mt-2 grid grid-cols-1 gap-2 overflow-hidden transition-all duration-200 ${filtersOpen ? 'max-h-[640px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                mode="tags"
                allowClear
                placeholder="Media types"
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
                placeholder="Keywords"
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
                Clear
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
                <Button
                  type="link"
                  onClick={() => {
                    setMediaTypes([])
                    setKeywordTokens([])
                    setPage(1)
                  }}>
                  Reset filters
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] max-h-[50vh] md:max-h-[60vh] lg:max-h-[calc(100dvh-18rem)] overflow-auto">
          <div className="sticky -m-3 mb-2 top-0 z-10 px-3 py-2 bg-white dark:bg-[#171717] border-b dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gray-500">Results</span>
            <span className="text-xs text-gray-400">{displayedResults.length}</span>
          </div>
          {isFetching ? (
            <div className="flex items-center justify-center py-10">
              <Spin />
            </div>
          ) : (
            <List
              size="small"
              dataSource={displayedResults}
              locale={{ emptyText: <Empty description="No results" /> }}
              renderItem={(item) => (
                <List.Item
                  key={`${item.kind}:${item.id}`}
                  onClick={() => {
                    setSelected(item)
                    setAnalysis("")
                    loadExistingAnalyses(item)
                  }}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] rounded px-2 result-fade-in">
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
                pageSizeOptions={[10, 20, 50, 100] as any}
                onChange={(p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Right/center: analysis panel */}
      <div className="lg:col-span-2 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] min-h-[70vh] min-w-0 lg:h-[calc(100dvh-8rem)] overflow-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="Select an item to review and analyze" />
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
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip title="Quick Review">
                  <Button icon={(<SparklesIcon className="w-4 h-4" />) as any} onClick={() => runOneOff("review")} loading={loadingAnalysis}>Review</Button>
                </Tooltip>
                <Tooltip title="Summarize">
                  <Button icon={(<FileTextIcon className="w-4 h-4" />) as any} onClick={() => runOneOff("summary")} loading={loadingAnalysis}>Summarize</Button>
                </Tooltip>
                {selected?.kind === "media" && (
                  <Tooltip title="Analyze & attach to media">
                    <Button onClick={() => analyzeAndSaveToMedia(analysisMode)} loading={loadingAnalysis}>{analysisMode === 'review' ? 'Review + Save' : 'Summary + Save'}</Button>
                  </Tooltip>
                )}
                <Tooltip title="Analyze & save as note">
                  <Button onClick={() => analyzeAndSaveToNote(analysisMode)} loading={loadingAnalysis}>{analysisMode === 'review' ? 'Review + Save Note' : 'Summary + Save Note'}</Button>
                </Tooltip>
                {selected?.kind === "media" && (
                  <Tooltip title="Attach analysis to media">
                    <Button icon={(<PaperclipIcon className="w-4 h-4" />) as any} onClick={saveAnalysisToMedia} disabled={!analysis.trim()}>Save to Media</Button>
                  </Tooltip>
                )}
                <Tooltip title="Create a note from analysis">
                  <Button type="primary" icon={(<SaveIcon className="w-4 h-4" />) as any} onClick={saveAnalysis} disabled={!analysis.trim()}>Save to Notes</Button>
                </Tooltip>
                <Radio.Group size="small" value={analysisMode} onChange={(e) => setAnalysisMode(e.target.value)}>
                  <Radio.Button value="review">Use Review</Radio.Button>
                  <Radio.Button value="summary">Use Summary</Radio.Button>
                </Radio.Group>
              </div>
            </div>
            <div className="flex items-center gap-3 -mt-2">
              <Checkbox
                checked={autoReviewOnSelect}
                onChange={(e) => setAutoReviewOnSelect(e.target.checked)}>
                Auto-review on select
              </Checkbox>
              <button
                className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#262626]"
                onClick={() => setPromptsOpen((v) => !v)}
                aria-expanded={promptsOpen}
                aria-controls="custom-prompts"
              >
                Customize prompts
              </button>
            </div>
            <Divider className="!my-2" />
            {/* Customize prompts section */}
            <div id="custom-prompts" className={`overflow-hidden transition-all duration-200 ${promptsOpen ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded border dark:border-gray-700 p-2">
                  <Typography.Text type="secondary">Review: System prompt</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[6rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={reviewSystemPrompt} onChange={(e) => setReviewSystemPrompt(e.target.value)} />
                  <Typography.Text type="secondary" className="block mt-2">Review: User prompt prefix</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[4rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={reviewUserPrefix} onChange={(e) => setReviewUserPrefix(e.target.value)} />
                </div>
                <div className="rounded border dark:border-gray-700 p-2">
                  <Typography.Text type="secondary">Summary: System prompt</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[6rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={summarySystemPrompt} onChange={(e) => setSummarySystemPrompt(e.target.value)} />
                  <Typography.Text type="secondary" className="block mt-2">Summary: User prompt prefix</Typography.Text>
                  <textarea className="w-full mt-2 min-h-[4rem] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717]" value={summaryUserPrefix} onChange={(e) => setSummaryUserPrefix(e.target.value)} />
                </div>
              </div>
              <div className="mt-2">
                <Button size="small" onClick={() => { setReviewSystemPrompt("You are an expert reviewer. Provide a concise, structured review of the following content."); setReviewUserPrefix(""); setSummarySystemPrompt("Summarize the following content into key points and a brief abstract."); setSummaryUserPrefix("") }}>Reset to defaults</Button>
              </div>
              <Divider className="!my-3" />
            </div>

            {/* Stack: Media Content then Analysis then Existing Analyses */}
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto min-h-[14rem] md:h-[32vh]">
                <div className="flex items-center justify-between">
                  <Typography.Text type="secondary">Media Content</Typography.Text>
                  <Tooltip title="Copy content">
                    <Button size="small" onClick={async () => { try { await navigator.clipboard.writeText(selectedContent || '') ; message.success('Content copied') } catch { message.error('Copy failed') } }} icon={(<CopyIcon className="w-4 h-4" />) as any} />
                  </Tooltip>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {selectedContent ? selectedContent : <span className="text-xs text-gray-500">No content available</span>}
                </div>
              </div>
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto min-h-[14rem] md:h-[32vh]">
                <div className="flex items-center justify-between">
                  <Typography.Text type="secondary">Analysis</Typography.Text>
                  <div className="flex items-center gap-2">
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
                <textarea
                  className="w-full mt-2 min-h-[12rem] md:h-[26vh] text-sm p-2 rounded border dark:border-gray-700 dark:bg-[#171717] resize-y"
                  value={analysis}
                  onChange={(e) => setAnalysis(e.target.value)}
                  placeholder="Run Review or Summarize, then edit here..."
                />
              </div>
              <div className="rounded border dark:border-gray-700 p-2 overflow-auto min-h-[10rem]">
                <Typography.Text type="secondary">Existing Analyses</Typography.Text>
                {existingAnalyses.length === 0 ? (
                  <div className="text-xs text-gray-500 mt-2">No saved analyses for this item yet.</div>
                ) : (
                  <List size="small" dataSource={existingAnalyses} renderItem={(n) => (
                    <List.Item className="!px-1">
                      <div>
                        <div className="text-xs font-medium">Note #{n?.id}</div>
                        <div className="text-xs text-gray-500 whitespace-pre-wrap max-w-[48rem]">{String(n?.content || "").slice(0, 800)}</div>
                      </div>
                    </List.Item>
                  )} />
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
