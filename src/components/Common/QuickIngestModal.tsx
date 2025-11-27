import React from 'react'
import { Modal, Button, Input, Select, Space, Switch, Typography, Divider, List, Tag, message, Collapse, InputNumber, Tooltip as AntTooltip, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import { browser } from "wxt/browser"
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { HelpCircle, Headphones, Layers, Database, FileText, Film, Cookie, Info, Clock, Grid, BookText } from 'lucide-react'
import { useStorage } from '@plasmohq/storage/hook'
import { useConfirmDanger } from '@/components/Common/confirm-danger'
import { defaultEmbeddingModelForRag } from '@/services/ollama'
import { tldwModels } from '@/services/tldw'

type Entry = {
  id: string
  url: string
  type: 'auto' | 'html' | 'pdf' | 'document' | 'audio' | 'video'
  // Simple per-type options; server can ignore unknown fields
  audio?: { language?: string; diarize?: boolean }
  document?: { ocr?: boolean }
  video?: { captions?: boolean }
}

type ResultItem = { id: string; status: 'ok' | 'error'; url?: string; fileName?: string; type: string; data?: any; error?: string }

type Props = {
  open: boolean
  onClose: () => void
}

function detectTypeFromUrl(url: string): Entry['type'] {
  try {
    const u = new URL(url)
    const p = (u.pathname || '').toLowerCase()
    if (p.match(/\.(mp3|wav|flac|m4a|aac)$/)) return 'audio'
    if (p.match(/\.(mp4|mov|mkv|webm)$/)) return 'video'
    if (p.match(/\.(pdf)$/)) return 'pdf'
    if (p.match(/\.(doc|docx|txt|rtf|md)$/)) return 'document'
    return 'html'
  } catch {
    return 'auto'
  }
}

function mediaIdFromPayload(
  data: any,
  visited?: WeakSet<object>
): string | number | null {
  if (!data || typeof data !== "object") {
    return null
  }
  if (!visited) {
    visited = new WeakSet<object>()
  }

  if (visited.has(data as object)) {
    return null
  }
  visited.add(data as object)

  const direct =
    (data as any).id ??
    (data as any).media_id ??
    (data as any).pk ??
    (data as any).uuid
  if (direct !== undefined && direct !== null) {
    return direct
  }
  if ((data as any).media && typeof (data as any).media === "object") {
    return mediaIdFromPayload((data as any).media, visited)
  }
  return null
}

export const QuickIngestModal: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation(['option'])
  const [messageApi, contextHolder] = message.useMessage({
    top: 12,
    getContainer: () =>
      (document.querySelector('.quick-ingest-modal .ant-modal-content') as HTMLElement) || document.body
  })
  const [storeRemote, setStoreRemote] = React.useState<boolean>(true)
  const [rows, setRows] = React.useState<Entry[]>([
    { id: crypto.randomUUID(), url: '', type: 'auto' }
  ])
  // Common ingest options available across media types (promote booleans only; rely on Advanced for the rest)
  const [common, setCommon] = React.useState<{ perform_analysis: boolean; perform_chunking: boolean; overwrite_existing: boolean }>({
    perform_analysis: true,
    perform_chunking: true,
    overwrite_existing: false
  })
  const [running, setRunning] = React.useState<boolean>(false)
  const [results, setResults] = React.useState<ResultItem[]>([])
  const [localFiles, setLocalFiles] = React.useState<File[]>([])
  const [advancedOpen, setAdvancedOpen] = React.useState<boolean>(false)
  const [advancedValues, setAdvancedValues] = React.useState<Record<string, any>>({})
  const [advSchema, setAdvSchema] = React.useState<Array<{ name: string; type: string; enum?: any[]; description?: string; title?: string; group: string }>>([])
  const [specSource, setSpecSource] = React.useState<'server' | 'server-cached' | 'bundled' | 'none'>('none')
  const [bundledSpec, setBundledSpec] = React.useState<any | null>(null)
  const [fieldDetailsOpen, setFieldDetailsOpen] = React.useState<Record<string, boolean>>({})
  const [advSearch, setAdvSearch] = React.useState<string>('')
  const [savedAdvValues, setSavedAdvValues] = useStorage<Record<string, any>>('quickIngestAdvancedValues', {})
  const [uiPrefs, setUiPrefs] = useStorage<{ advancedOpen?: boolean; fieldDetailsOpen?: Record<string, boolean> }>('quickIngestAdvancedUI', {})
  const [specPrefs, setSpecPrefs] = useStorage<{ preferServer?: boolean; lastRemote?: { version?: string; cachedAt?: number } }>('quickIngestSpecPrefs', { preferServer: true })
  const lastRefreshedLabel = React.useMemo(() => {
    const ts = specPrefs?.lastRemote?.cachedAt
    if (!ts) return null
    const d = new Date(ts)
    return d.toLocaleString()
  }, [specPrefs])
  const SAVE_DEBOUNCE_MS = 2000
  const lastSavedAdvValuesRef = React.useRef<string | null>(null)
  const lastSavedUiPrefsRef = React.useRef<string | null>(null)
  const specPrefsCacheRef = React.useRef<string | null>(null)
  const [totalPlanned, setTotalPlanned] = React.useState<number>(0)
  const [processedCount, setProcessedCount] = React.useState<number>(0)
  const [liveTotalCount, setLiveTotalCount] = React.useState<number>(0)
  const [ragEmbeddingLabel, setRagEmbeddingLabel] = React.useState<string | null>(null)
  const confirmDanger = useConfirmDanger()

  const persistSpecPrefs = React.useCallback(
    (next: { preferServer?: boolean; lastRemote?: { version?: string; cachedAt?: number } }) => {
      const serialized = JSON.stringify(next || {})
      if (specPrefsCacheRef.current === serialized) return
      specPrefsCacheRef.current = serialized
      setSpecPrefs(next)
    },
    [setSpecPrefs]
  )

  const addRow = () => setRows((r) => [...r, { id: crypto.randomUUID(), url: '', type: 'auto' }])
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id))
  const updateRow = (id: string, patch: Partial<Entry>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  // Default OCR to on for document/PDF rows so users get best extraction without extra clicks
  React.useEffect(() => {
    let changed = false
    const next = rows.map((r) => {
      const isDocType = r.type === 'document' || r.type === 'pdf' || (r.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(r.url)))
      if (isDocType && r.document?.ocr === undefined) {
        changed = true
        return { ...r, document: { ...(r.document || {}), ocr: true } }
      }
      return r
    })
    if (changed) setRows(next)
  }, [rows])

  const bulkPaste = (text: string) => {
    const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (lines.length === 0) return
    const next: Entry[] = lines.map((u) => ({ id: crypto.randomUUID(), url: u, type: detectTypeFromUrl(u) }))
    setRows(next)
  }

  // Resolve current RAG embedding model for display in Advanced section
  React.useEffect(() => {
    ;(async () => {
      try {
        const id = await defaultEmbeddingModelForRag()
        if (!id) {
          setRagEmbeddingLabel(null)
          return
        }
        // id comes from defaultEmbeddingModelForRag as provider/model
        const parts = String(id).split('/')
        const provider = parts.length > 1 ? parts[0] : 'unknown'
        const modelName = parts.length > 1 ? parts.slice(1).join('/') : id
        const models = await tldwModels.getEmbeddingModels().catch(() => [])
        const match = models.find((m) => m.id === id || m.id === modelName)
        const providerLabel = tldwModels.getProviderDisplayName(
          match?.provider || provider
        )
        const label = `${providerLabel} / ${modelName}`
        setRagEmbeddingLabel(label)
      } catch {
        setRagEmbeddingLabel(null)
      }
    })()
  }, [])

  const run = async () => {
    const valid = rows.filter((r) => r.url.trim().length > 0)
    if (valid.length === 0 && localFiles.length === 0) {
      messageApi.error('Please add at least one URL or file')
      return
    }
    const total = valid.length + localFiles.length
    setTotalPlanned(total)
    setProcessedCount(0)
    setLiveTotalCount(total)
    setRunning(true)
    setResults([])
    try {
      // Ensure tldwConfig is hydrated for background requests
      try {
        await tldwClient.initialize()
      } catch {}

      // Prepare entries payload (URLs + simple options)
      const entries = valid.map((r) => ({
        id: r.id,
        url: r.url,
        type: r.type,
        audio: r.audio,
        document: r.document,
        video: r.video
      }))

      // Convert local files to transferable payloads (ArrayBuffer)
      const filesPayload = await Promise.all(
        localFiles.map(async (f) => {
          // Use a typed array to avoid any serialization quirks when passing to the background worker
          const data = new Uint8Array(await f.arrayBuffer())
          return {
            id: crypto.randomUUID(),
            name: f.name,
            type: f.type,
            data
          }
        })
      )

      const resp = (await browser.runtime.sendMessage({
        type: "tldw:quick-ingest-batch",
        payload: {
          entries,
          files: filesPayload,
          storeRemote,
          common,
          advancedValues
        }
      })) as { ok: boolean; error?: string; results?: ResultItem[] } | undefined

      if (!resp?.ok) {
        const msg = resp?.error || "Quick ingest failed. Check tldw server settings and try again."
        messageApi.error(msg)
        setRunning(false)
        return
      }

      const out = resp.results || []
      setResults(out)
      setRunning(false)
      if (!storeRemote && out.length > 0) {
        messageApi.info('Processing complete. You can download results as JSON.')
      }
      if (out.length > 0) {
        const successCount = out.filter((r) => r.status === 'ok').length
        const failCount = out.length - successCount
        const summary = `${successCount} succeeded · ${failCount} failed`
        if (failCount > 0) messageApi.warning(summary)
        else messageApi.success(summary)
      }
    } catch (e: any) {
      setRunning(false)
      messageApi.error(e?.message || 'Quick ingest failed.')
    }
  }

  // Load OpenAPI schema to build advanced fields (best-effort)
  const groupForField = (name: string): string => {
    const n = name.toLowerCase()
    if (n.startsWith('transcription_') || ['diarize','vad_use','timestamp_option','chunk_language'].includes(n)) return 'Transcription'
    if (n.startsWith('chunk_') || ['use_adaptive_chunking','enable_contextual_chunking','use_multi_level_chunking','perform_chunking','contextual_llm_model'].includes(n)) return 'Chunking'
    if (n.includes('embedding')) return 'Embeddings'
    if (n.startsWith('context_') || n === 'context_strategy') return 'Context'
    if (n.includes('summarization') || n.includes('analysis') || n === 'system_prompt' || n === 'custom_prompt') return 'Analysis/Summarization'
    if (n.includes('pdf') || n.includes('ocr')) return 'Document/PDF'
    if (n.includes('video') || n === 'timestamp_option') return 'Video'
    if (n.includes('cookie')) return 'Cookies/Auth'
    if (['author','title','keywords','api_name'].includes(n)) return 'Metadata'
    if (['start_time','end_time'].includes(n)) return 'Timing'
    return 'Other'
  }

  const iconForGroup = (group: string) => {
    const cls = 'w-4 h-4 mr-1 text-gray-500'
    switch (group) {
      case 'Transcription':
        return <Headphones className={cls} />
      case 'Chunking':
        return <Layers className={cls} />
      case 'Embeddings':
        return <Database className={cls} />
      case 'Context':
        return <Layers className={cls} />
      case 'Analysis/Summarization':
        return <BookText className={cls} />
      case 'Document/PDF':
        return <FileText className={cls} />
      case 'Video':
        return <Film className={cls} />
      case 'Cookies/Auth':
        return <Cookie className={cls} />
      case 'Metadata':
        return <Info className={cls} />
      case 'Timing':
        return <Clock className={cls} />
      default:
        return <Grid className={cls} />
    }
  }

  const parseSpec = (spec: any) => {
    const getByRef = (ref: string): any => {
      // Handles refs like '#/components/schemas/MediaIngestRequest'
      if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null
      const parts = ref.slice(2).split('/')
      let cur: any = spec
      for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
        else return null
      }
      return cur
    }

    const resolveRef = (schema: any): any => {
      if (!schema) return {}
      if (schema.$ref) {
        const target = getByRef(schema.$ref)
        return target ? resolveRef(target) : {}
      }
      return schema
    }

    const mergeProps = (schema: any): Record<string, any> => {
      const s = resolveRef(schema)
      let props: Record<string, any> = {}
      if (!s || typeof s !== 'object') return props
      // Merge from compositions
      for (const key of ['allOf', 'oneOf', 'anyOf'] as const) {
        if (Array.isArray((s as any)[key])) {
          for (const sub of (s as any)[key]) {
            props = { ...props, ...mergeProps(sub) }
          }
        }
      }
      if (s.properties && typeof s.properties === 'object') {
        for (const [k, v] of Object.entries<any>(s.properties)) {
          props[k] = resolveRef(v)
        }
      }
      return props
    }

    const flattenProps = (obj: Record<string, any>, parent = ''): Array<[string, any]> => {
      const out: Array<[string, any]> = []
      for (const [k, v0] of Object.entries<any>(obj || {})) {
        const v = resolveRef(v0)
        const name = parent ? `${parent}.${k}` : k
        const isObj = (v?.type === 'object' && v?.properties && typeof v.properties === 'object')
        if (isObj) {
          const child = mergeProps(v)
          out.push(...flattenProps(child, name))
        } else {
          out.push([name, v])
        }
      }
      return out
    }

    const paths = spec?.paths || {}
    const mediaAdd = paths['/api/v1/media/add'] || paths['/api/v1/media/add/']
    const content = mediaAdd?.post?.requestBody?.content || {}
    const mp = content['multipart/form-data'] || content['application/x-www-form-urlencoded'] || content['application/json'] || {}
    const rootSchema = mp?.schema || {}
    const props = mergeProps(rootSchema)
    const flat = flattenProps(props)

    const entries: Array<{ name: string; type: string; enum?: any[]; description?: string; title?: string; group: string }> = []
    // Expose all available ingestion-time options, except input list and media type selector which are handled above
    const exclude = new Set([ 'urls', 'media_type' ])
    for (const [name, def0] of flat) {
      if (exclude.has(name)) continue
      const def = resolveRef(def0)
      // Infer a reasonable type
      let type: string = 'string'
      if (def.type) type = Array.isArray(def.type) ? String(def.type[0]) : String(def.type)
      else if (def.enum) type = 'string'
      else if (def.anyOf || def.oneOf) type = 'string'
      const en = Array.isArray(def?.enum) ? def.enum : undefined
      const description = def?.description || def?.title || undefined
      entries.push({ name, type, enum: en, description, title: def?.title, group: groupForField(name) })
    }
    entries.sort((a,b) => a.name.localeCompare(b.name))
    setAdvSchema(entries)
  }

  const loadSpec = React.useCallback(async (preferServer = true, reportDiff = false) => {
    let used: 'server' | 'bundled' | 'none' = 'none'
    let remote: any | null = null
    if (preferServer) {
      try {
        const healthy = await tldwClient.healthCheck()
        if (healthy) remote = await tldwClient.getOpenAPISpec()
      } catch {}
    }
    if (remote) {
      parseSpec(remote)
      used = 'server'
      try {
        const rVer = remote?.info?.version
        const prevVersion = specPrefs?.lastRemote?.version
        const prevCachedAt = specPrefs?.lastRemote?.cachedAt
        const now = Date.now()
        const shouldReuseCachedAt =
          prevVersion && prevVersion === rVer && typeof prevCachedAt === 'number'

        // For background auto-loads (reportDiff === false), skip writing to
        // extension storage entirely to avoid hitting MAX_WRITE_OPERATIONS_PER_MINUTE.
        // We only persist when the user explicitly reloads or toggles settings.
        if (!reportDiff) {
          return
        }

        const payload = {
          ...(specPrefs || {}),
          preferServer: true,
          lastRemote: {
            version: rVer,
            cachedAt: shouldReuseCachedAt ? prevCachedAt : now
          }
        }
        // Log approximate size of what we persist for debugging quota issues
        try {
          const approxSize = JSON.stringify(payload).length
          // eslint-disable-next-line no-console
          console.info(
            "[QuickIngest] Persisting quickIngestSpecPrefs (~%d bytes)",
            approxSize
          )
        } catch {}
        persistSpecPrefs(payload)
      } catch {}
      if (reportDiff && bundledSpec) {
        // Compare fields
        const bundledPaths = bundledSpec?.paths || {}
        const bContent = (bundledPaths['/api/v1/media/add'] || bundledPaths['/api/v1/media/add/'])?.post?.requestBody?.content || {}
        const bProps = (bContent['multipart/form-data'] || bContent['application/x-www-form-urlencoded'] || {})?.schema?.properties || {}
        const rPaths = remote?.paths || {}
        const rContent = (rPaths['/api/v1/media/add'] || rPaths['/api/v1/media/add/'])?.post?.requestBody?.content || {}
        const rProps = (rContent['multipart/form-data'] || rContent['application/x-www-form-urlencoded'] || {})?.schema?.properties || {}
        const bSet = new Set(Object.keys(bProps))
        const rSet = new Set(Object.keys(rProps))
        const newFields = [...rSet].filter((k) => !bSet.has(k))
        const missingFields = [...bSet].filter((k) => !rSet.has(k))
        const bVer = bundledSpec?.info?.version
        const rVer = remote?.info?.version
        if (newFields.length || missingFields.length || (bVer && rVer && bVer !== rVer)) {
          const msgs: string[] = []
          if (bVer && rVer && bVer !== rVer) msgs.push(`Spec version differs (server: ${rVer}, bundled: ${bVer})`)
          if (newFields.length) msgs.push(`Server has new fields: ${newFields.slice(0,6).join(', ')}${newFields.length>6?'…':''}`)
          if (missingFields.length) msgs.push(`Bundled fields not on server: ${missingFields.slice(0,6).join(', ')}${missingFields.length>6?'…':''}`)
          messageApi.warning(msgs.join(' • '))
        } else {
          messageApi.success('Advanced spec reloaded from server')
        }
      }
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const localSpec = await import('../../../openapi.json')
        setBundledSpec(localSpec)
        parseSpec(localSpec)
        used = 'bundled'
      } catch {
        setAdvSchema([
          { name: 'context_window_size', type: 'integer', group: groupForField('context_window_size') },
          { name: 'generate_embeddings', type: 'boolean', group: groupForField('generate_embeddings') },
          { name: 'embedding_model', type: 'string', group: groupForField('embedding_model') },
          { name: 'embedding_provider', type: 'string', group: groupForField('embedding_provider') },
          { name: 'perform_rolling_summarization', type: 'boolean', group: groupForField('perform_rolling_summarization') },
          { name: 'perform_confabulation_check_of_analysis', type: 'boolean', group: groupForField('perform_confabulation_check_of_analysis') },
          { name: 'system_prompt', type: 'string', group: groupForField('system_prompt') },
          { name: 'custom_prompt', type: 'string', group: groupForField('custom_prompt') },
          { name: 'title', type: 'string', group: groupForField('title') }
        ])
        used = 'none'
      }
    }
    setSpecSource(used)
  }, [bundledSpec, persistSpecPrefs, specPrefs])

  React.useEffect(() => {
    specPrefsCacheRef.current = JSON.stringify(specPrefs || {})
  }, [specPrefs])

  React.useEffect(() => {
    if (!open) return
    ;(async () => {
      // Load bundled once for diffing later
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const localSpec = await import('../../../openapi.json')
        setBundledSpec(localSpec)
      } catch {}
      // Prefer server
      const prefer =
        typeof specPrefs?.preferServer === 'boolean' ? specPrefs.preferServer : true
      await loadSpec(prefer)
      if (specSource === 'none') await loadSpec(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  React.useEffect(() => {
    lastSavedAdvValuesRef.current = JSON.stringify(savedAdvValues || {})
  }, [savedAdvValues])

  React.useEffect(() => {
    lastSavedUiPrefsRef.current = JSON.stringify(uiPrefs || {})
  }, [uiPrefs])

  // Load persisted advanced values on mount
  React.useEffect(() => {
    if (savedAdvValues && typeof savedAdvValues === 'object') {
      setAdvancedValues((prev) => ({ ...prev, ...savedAdvValues }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist advanced values when they change (debounced to reduce storage writes)
  React.useEffect(() => {
    const id = setTimeout(() => {
      const serialized = JSON.stringify(advancedValues || {})
      if (lastSavedAdvValuesRef.current === serialized) return
      lastSavedAdvValuesRef.current = serialized
      try { setSavedAdvValues(advancedValues) } catch {}
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [SAVE_DEBOUNCE_MS, advancedValues, setSavedAdvValues])

  // Restore UI prefs for Advanced section and details
  React.useEffect(() => {
    if (uiPrefs?.advancedOpen !== undefined) setAdvancedOpen(Boolean(uiPrefs.advancedOpen))
    if (uiPrefs?.fieldDetailsOpen && typeof uiPrefs.fieldDetailsOpen === 'object') setFieldDetailsOpen(uiPrefs.fieldDetailsOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist UI prefs
  React.useEffect(() => {
    const id = setTimeout(() => {
      const nextPrefs = { advancedOpen, fieldDetailsOpen }
      const serialized = JSON.stringify(nextPrefs)
      if (lastSavedUiPrefsRef.current === serialized) return
      lastSavedUiPrefsRef.current = serialized
      try { setUiPrefs(nextPrefs) } catch {}
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [SAVE_DEBOUNCE_MS, advancedOpen, fieldDetailsOpen, setUiPrefs])

  const downloadJson = (item: ResultItem) => {
    const blob = new Blob([JSON.stringify(item.data ?? {}, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'processed.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const openInMediaViewer = (item: ResultItem) => {
    try {
      const id = mediaIdFromPayload(item.data)
      if (id == null) {
        return
      }
      const idStr = String(id)
      try {
        localStorage.setItem("tldw:lastMediaId", idStr)
      } catch {
        // ignore storage failures
      }
      const hash = "#/media-multi"
      const path = window.location.pathname || ""
      if (path.includes("options.html")) {
        window.location.hash = hash
      } else {
        window.open(`/options.html${hash}`, "_blank")
      }
    } catch {
      // best-effort — do not crash modal
    }
  }

  const discussInChat = (item: ResultItem) => {
    try {
      const id = mediaIdFromPayload(item.data)
      if (id == null) {
        return
      }
      const payload = {
        mediaId: String(id),
        url: item.url || (item.data && (item.data.url || item.data.source_url)) || undefined
      }
      try {
        localStorage.setItem("tldw:discussMediaPrompt", JSON.stringify(payload))
      } catch {
        // ignore localStorage failures
      }
      const hash = "#/"
      const path = window.location.pathname || ""
      if (path.includes("options.html")) {
        window.location.hash = hash
        window.dispatchEvent(
          new CustomEvent("tldw:discuss-media", { detail: payload })
        )
      } else {
        window.open(`/options.html${hash}`, "_blank")
      }
    } catch {
      // swallow errors; logging not needed here
    }
  }

  const plannedCount = React.useMemo(() => {
    const valid = rows.filter((r) => r.url.trim().length > 0)
    return valid.length + localFiles.length
  }, [rows, localFiles])

  const firstAudioRow = React.useMemo(
    () => rows.find((r) => r.type === 'audio' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'audio')),
    [rows]
  )

  const firstDocumentRow = React.useMemo(
    () => rows.find((r) => r.type === 'document' || r.type === 'pdf' || (r.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(r.url)))),
    [rows]
  )

  const firstVideoRow = React.useMemo(
    () => rows.find((r) => r.type === 'video' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'video')),
    [rows]
  )

  const resultById = React.useMemo(() => {
    const map = new Map<string, ResultItem>()
    for (const r of results) map.set(r.id, r)
    return map
  }, [results])

  const modifiedAdvancedCount = React.useMemo(
    () => Object.keys(advancedValues || {}).length,
    [advancedValues]
  )
  const specSourceLabel = React.useMemo(() => {
    switch (specSource) {
      case 'server':
        return 'Live server spec'
      case 'server-cached':
        return 'Cached server spec'
      case 'bundled':
        return 'Bundled spec'
      default:
        return 'Fallback spec'
    }
  }, [specSource])

  const setAdvancedValue = React.useCallback((name: string, value: any) => {
    setAdvancedValues((prev) => {
      const next = { ...(prev || {}) }
      if (value === undefined || value === null || value === '') {
        delete next[name]
      } else {
        next[name] = value
      }
      return next
    })
  }, [])

  // Live progress updates from background batch processor
  React.useEffect(() => {
    const handler = (message: any) => {
      if (!message || message.type !== "tldw:quick-ingest-progress") return
      const payload = message.payload || {}
      const result = payload.result as ResultItem | undefined
      if (typeof payload.processedCount === "number") {
        setProcessedCount(payload.processedCount)
      }
      if (typeof payload.totalCount === "number") {
        setLiveTotalCount(payload.totalCount)
        setTotalPlanned(payload.totalCount)
      }
      if (!result || !result.id) return

      setResults((prev) => {
        const map = new Map<string, ResultItem>()
        for (const r of prev) {
          if (r.id) map.set(r.id, r)
        }
        const existing = map.get(result.id)
        map.set(result.id, { ...(existing || {}), ...result })
        return Array.from(map.values())
      })
    }

    try {
      // @ts-ignore
      browser?.runtime?.onMessage?.addListener(handler)
    } catch {}

    return () => {
      try {
        // @ts-ignore
        browser?.runtime?.onMessage?.removeListener(handler)
      } catch {}
    }
  }, [])

  return (
    <Modal
      title={t('quickIngest.title') || 'Quick Ingest Media'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      rootClassName="quick-ingest-modal"
      maskClosable={!running}
    >
      {contextHolder}
      <Space direction="vertical" className="w-full">
        <div className="flex flex-col gap-1">
          <Typography.Text strong>{t('quickIngest.howItWorks', 'How this works')}</Typography.Text>
          <Typography.Paragraph type="secondary" className="!mb-1 text-sm text-gray-600">
            {t(
              'quickIngest.howItWorksDesc',
              'Add URLs or files, pick processing mode (store vs process-only), tweak options, then run Ingest/Process.'
            )}
          </Typography.Paragraph>
        </div>
        {/* Source URLs / files */}
        <div className="space-y-2 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div>
              <Typography.Title level={5} className="!mb-1">
                {t('quickIngest.sourceHeading') || 'Source URLs or files'}
              </Typography.Title>
              <Typography.Text>
                {t('quickIngest.subtitle') || 'Enter one or more URLs. Force type per row if needed.'}
              </Typography.Text>
              <div className="text-xs text-gray-500 mt-1">
                Choose how to process in the footer — the toggle sits next to the primary action for clarity.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tag color="blue">
                {plannedCount || 0} {plannedCount === 1 ? 'item ready' : 'items ready'}
              </Tag>
            </div>
          </div>

          <Input.TextArea
            placeholder={t('quickIngest.bulkPlaceholder') || 'Paste URLs (one per line)'}
            onPressEnter={(e) => e.stopPropagation()}
            autoSize={{ minRows: 2 }}
            onBlur={(e) => bulkPaste(e.target.value)}
            disabled={running}
          />
          <Divider plain>{t('quickIngest.or') || 'or'}</Divider>

          <Space direction="vertical" className="w-full">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <Input
                    placeholder="https://..."
                    value={row.url}
                    onChange={(e) => updateRow(row.id, { url: e.target.value })}
                    disabled={running}
                  />
                  {(() => {
                    const res = resultById.get(row.id)
                    if (!res && !running) return null
                    if (res?.status === 'ok') return <Tag color="green">Done</Tag>
                    if (res?.status === 'error') {
                      return (
                        <AntTooltip title={res.error || 'Failed'}>
                          <Tag color="red">Failed</Tag>
                        </AntTooltip>
                      )
                    }
                    return running ? <Tag icon={<Spin size="small" />} color="blue">Running</Tag> : null
                  })()}
                </div>
                <Select
                  className="min-w-32"
                  value={row.type}
                  onChange={(v) => updateRow(row.id, { type: v as Entry['type'] })}
                  options={[
                    { label: 'Auto', value: 'auto' },
                    { label: 'HTML', value: 'html' },
                    { label: 'PDF', value: 'pdf' },
                    { label: 'Document', value: 'document' },
                    { label: 'Audio', value: 'audio' },
                    { label: 'Video', value: 'video' }
                  ]}
                  disabled={running}
                />
                <Button onClick={() => removeRow(row.id)} danger disabled={rows.length === 1 || running}>
                  {t('quickIngest.remove') || 'Remove'}
                </Button>
              </div>
            ))}
            <Button onClick={addRow} disabled={running}>
              {t('quickIngest.add') || 'Add URL'}
            </Button>
          </Space>

          <Divider plain>{t('quickIngest.or') || 'or'}</Divider>
        </div>

        {/* Local file upload */}
        <Space direction="vertical" className="w-full">
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            id="qi-file-input"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) setLocalFiles((prev) => [...prev, ...files])
              e.currentTarget.value = ''
            }}
            accept=".pdf,.txt,.rtf,.doc,.docx,.md,.epub,application/pdf,text/plain,application/rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,audio/*,video/*"
          />
          <Button onClick={() => document.getElementById('qi-file-input')?.click()} disabled={running}>
            {t('quickIngest.addFiles') || 'Add Files'}
          </Button>
          {localFiles.length > 0 && (
            <List
              size="small"
              bordered
              dataSource={localFiles}
              renderItem={(f, idx) => (
                <List.Item
                  actions={[
                    <button
                    key="remove"
                    type="button"
                    onClick={() => setLocalFiles((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={running}
                    aria-disabled={running}
                    aria-label={`Remove file ${f.name}`}
                    className={`text-blue-600 hover:underline ${running ? 'pointer-events-none text-gray-400' : ''}`}>
                    {t('quickIngest.remove') || 'Remove'}
                  </button>
                ]}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{f.name}</span>
                    {(() => {
                      const match = results.find((r) => r.fileName === f.name)
                      const status = match?.status
                      if (!status && !running) return null
                      if (status === 'ok') return <Tag color="green">Done</Tag>
                      if (status === 'error') {
                        return (
                          <AntTooltip title={match?.error || 'Failed'}>
                            <Tag color="red">Failed</Tag>
                          </AntTooltip>
                        )
                      }
                      return running ? <Tag icon={<Spin size="small" />} color="blue">Running</Tag> : null
                    })()}
                  </div>
                </List.Item>
              )}
            />
          )}
        </Space>

        {/* Common ingestion options */}
        <div className="mt-3 space-y-2">
          <Typography.Title level={5}>{t('quickIngest.commonOptions') || 'Ingestion options'}</Typography.Title>
          <Space wrap size="middle" align="center">
            <Space align="center">
              <span>Analysis</span>
              <Switch
                aria-label="Ingestion options \u2013 analysis"
                checked={common.perform_analysis}
                onChange={(v) =>
                  setCommon((c) => ({ ...c, perform_analysis: v }))
                }
                disabled={running}
              />
            </Space>
            <Space align="center">
              <span>Chunking</span>
              <Switch
                aria-label="Ingestion options \u2013 chunking"
                checked={common.perform_chunking}
                onChange={(v) =>
                  setCommon((c) => ({ ...c, perform_chunking: v }))
                }
                disabled={running}
              />
            </Space>
            <Space align="center">
              <span>Overwrite existing</span>
              <Switch
                aria-label="Ingestion options \u2013 overwrite existing"
                checked={common.overwrite_existing}
                onChange={(v) =>
                  setCommon((c) => ({ ...c, overwrite_existing: v }))
                }
                disabled={running}
              />
            </Space>
          </Space>
        </div>

        {/* Per-type options: show union of all detected types */}
        {rows.some((r) => (r.type === 'audio' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'audio'))) && (
          <div className="mt-2">
            <Typography.Title level={5}>{t('quickIngest.audioOptions') || 'Audio options'}</Typography.Title>
            <Space className="w-full">
              <Input
                placeholder={t('quickIngest.audioLanguage') || 'Language (e.g., en)'}
                value={firstAudioRow?.audio?.language || ''}
                onChange={(e) => setRows((rs) => rs.map((x) => {
                  const isAudio = x.type === 'audio' || (x.type === 'auto' && detectTypeFromUrl(x.url) === 'audio')
                  if (!isAudio) return x
                  return { ...x, audio: { ...(x.audio || {}), language: e.target.value } }
                }))}
                disabled={running}
              />
              <Select
                className="min-w-40"
                value={firstAudioRow?.audio?.diarize ?? false}
                onChange={(v) => setRows((rs) => rs.map((x) => {
                  const isAudio = x.type === 'audio' || (x.type === 'auto' && detectTypeFromUrl(x.url) === 'audio')
                  if (!isAudio) return x
                  return { ...x, audio: { ...(x.audio || {}), diarize: Boolean(v) } }
                }))}
                options={[{ label: 'Diarization: Off', value: false }, { label: 'Diarization: On', value: true }]}
                disabled={running}
              />
            </Space>
            <Typography.Text type="secondary" className="text-xs">
              {t('quickIngest.audioDiarizationHelp') || 'Turn on to separate speakers in transcripts; applies to all audio rows in this batch.'}
            </Typography.Text>
          </div>
        )}

        {rows.some((r) => (r.type === 'document' || r.type === 'pdf' || (r.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(r.url))))) && (
          <div className="mt-2">
            <Typography.Title level={5}>{t('quickIngest.documentOptions') || 'Document options'}</Typography.Title>
            <Select
              className="min-w-40"
              value={firstDocumentRow?.document?.ocr ?? true}
              onChange={(v) => setRows((rs) => rs.map((x) => {
                const isDoc = x.type === 'document' || x.type === 'pdf' || (x.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(x.url)))
                if (!isDoc) return x
                return { ...x, document: { ...(x.document || {}), ocr: Boolean(v) } }
              }))}
              options={[{ label: 'OCR: Off', value: false }, { label: 'OCR: On', value: true }]}
              disabled={running}
            />
            <Typography.Text type="secondary" className="text-xs">
              {t('quickIngest.ocrHelp') || 'OCR helps extract text from scanned PDFs or images; applies to all document/PDF rows.'}
            </Typography.Text>
          </div>
        )}

        {rows.some((r) => (r.type === 'video' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'video'))) && (
          <div className="mt-2">
            <Typography.Title level={5}>{t('quickIngest.videoOptions') || 'Video options'}</Typography.Title>
            <Select
              className="min-w-40"
              value={firstVideoRow?.video?.captions ?? false}
              onChange={(v) => setRows((rs) => rs.map((x) => {
                const isVideo = x.type === 'video' || (x.type === 'auto' && detectTypeFromUrl(x.url) === 'video')
                if (!isVideo) return x
                return { ...x, video: { ...(x.video || {}), captions: Boolean(v) } }
              }))}
              options={[{ label: 'Captions: Off', value: false }, { label: 'Captions: On', value: true }]}
              disabled={running}
            />
            <Typography.Text type="secondary" className="text-xs">
              {t('quickIngest.captionsHelp') || 'Include timestamps/captions for all video rows; helpful for search and summaries.'}
            </Typography.Text>
          </div>
        )}

        <div className="sticky bottom-0 z-10 mt-3 bg-white/90 dark:bg-[#111111]/90 backdrop-blur pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            {(() => {
              const done = processedCount || results.length
              const total = liveTotalCount || totalPlanned
              return (
                <div className="sr-only" aria-live="polite" role="status">
                  {running && total > 0
                    ? t('quickIngest.progress', 'Processing {{done}} / {{total}} items…', {
                        done,
                        total
                      })
                    : `${plannedCount || 0} ${plannedCount === 1 ? 'item' : 'items'} ready`}
                </div>
              )
            })()}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-700 dark:text-gray-200">
              <div className="flex items-start gap-3">
                <Space align="center">
                  <Typography.Text strong>Processing mode</Typography.Text>
                  <Switch
                    aria-label={
                      storeRemote
                        ? "Processing mode \u2013 store to remote DB"
                        : "Processing mode \u2013 process locally"
                    }
                    checked={storeRemote}
                    onChange={setStoreRemote}
                    disabled={running}
                  />
                  <Typography.Text>
                    {storeRemote ? (t('quickIngest.storeRemote') || 'Store to remote DB') : (t('quickIngest.process') || 'Process locally')}
                  </Typography.Text>
                </Space>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(() => {
                  const done = processedCount || results.length
                  const total = liveTotalCount || totalPlanned
                  if (running && total > 0) {
                    return t('quickIngest.progress', 'Processing {{done}} / {{total}} items…', {
                      done,
                      total
                    })
                  }
                  return `${plannedCount || 0} ${plannedCount === 1 ? 'item' : 'items'} ready`
                })()}
              </span>
            </div>
            <Typography.Text type="secondary" className="text-xs">
              {storeRemote
                ? (t('quickIngest.storeRemoteHelp') || 'Uploads to your tldw server for indexing.')
                : (t('quickIngest.processOnlyHelp') || 'Process only and keep results local (download JSON).')}
            </Typography.Text>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="primary"
              loading={running}
              onClick={run}
              disabled={plannedCount === 0}
            >
              {storeRemote
                ? (t('quickIngest.ingest') || 'Ingest')
                : (t('quickIngest.process') || 'Process')}
            </Button>
            <Button onClick={onClose} disabled={running}>
              {t('quickIngest.cancel') || 'Cancel'}
            </Button>
          </div>
        </div>

        <Collapse
          className="mt-3"
          activeKey={advancedOpen ? ['adv'] : []}
          onChange={(k) =>
            setAdvancedOpen(Array.isArray(k) ? k.includes('adv') : Boolean(k))
          }
          items={[{
          key: 'adv',
          label: (
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center gap-2">
                <span>Advanced options</span>
                <Tag color="blue">{t('quickIngest.advancedSummary', '{{count}} advanced fields loaded', { count: advSchema.length })}</Tag>
                {modifiedAdvancedCount > 0 && (
                  <Tag color="gold">{t('quickIngest.modifiedCount', '{{count}} modified', { count: modifiedAdvancedCount })}</Tag>
                )}
                <Tag color="geekblue">{specSourceLabel}</Tag>
                {lastRefreshedLabel && (
                  <Typography.Text className="text-[11px] text-gray-500">
                    {t('quickIngest.advancedRefreshed', 'Refreshed {{time}}', { time: lastRefreshedLabel })}
                  </Typography.Text>
                )}
                <AntTooltip
                  title={<div className="max-w-80 text-xs">{specSource === 'server'
                    ? 'Using live server OpenAPI spec'
                    : specSource === 'server-cached'
                      ? 'Using cached server OpenAPI spec'
                      : specSource === 'bundled'
                        ? 'Using bundled spec from extension'
                        : 'No spec detected; using fallback fields'}</div>}
                >
                  <Info className="w-4 h-4 text-gray-500" />
                </AntTooltip>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 ml-auto">
                {ragEmbeddingLabel && (
                  <Typography.Text className="text-[11px] text-gray-500">
                    {t(
                      'quickIngest.ragEmbeddingHint',
                      'RAG embedding model: {{label}}',
                      { label: ragEmbeddingLabel }
                    )}
                  </Typography.Text>
                )}
                <Space size="small" align="center">
                  <span className="text-xs text-gray-500">Prefer server</span>
                  <Switch
                    size="small"
                    aria-label="Advanced options \u2013 prefer server OpenAPI spec"
                    checked={!!specPrefs?.preferServer}
                    onChange={async (v) => {
                      persistSpecPrefs({ ...(specPrefs || {}), preferServer: v })
                      await loadSpec(v, true)
                    }}
                  />
                </Space>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    void loadSpec(true, true)
                  }}>
                  Reload from server
                </Button>
                <span className="h-4 border-l border-gray-300 dark:border-gray-600" aria-hidden />
                <Button
                  size="small"
                  danger
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = await confirmDanger({
                      title: 'Please confirm',
                      content:
                        'Reset all advanced options and UI state?',
                      okText: 'Reset',
                      cancelText: 'Cancel'
                    })
                    if (!ok) return
                    setAdvancedValues({})
                    setSavedAdvValues({})
                    setFieldDetailsOpen({})
                    setUiPrefs({
                      advancedOpen: false,
                      fieldDetailsOpen: {}
                    })
                    setAdvSearch('')
                    setAdvancedOpen(false)
                    messageApi.success('Advanced options reset')
                  }}>
                  Reset Advanced
                </Button>
              </div>
            </div>
          ),
          children: (
        <Space direction="vertical" className="w-full">
              <div className="flex items-center gap-2">
                <Input
                  allowClear
                  placeholder="Search advanced fields..."
                  value={advSearch}
                  onChange={(e) => setAdvSearch(e.target.value)}
                  className="max-w-80"
                />
                {modifiedAdvancedCount > 0 && (
                  <Tag color="gold">{t('quickIngest.modifiedCount', '{{count}} modified', { count: modifiedAdvancedCount })}</Tag>
                )}
              </div>
              {advSchema.length === 0 ? (
                <Typography.Text type="secondary">{t('quickIngest.advancedEmpty', 'No advanced options detected — try reloading the spec.')}</Typography.Text>
              ) : (
                (() => {
                  const grouped: Record<string, typeof advSchema> = {}
                  const q = advSearch.trim().toLowerCase()
                  const match = (f: { name: string; title?: string; description?: string }) => {
                    if (!q) return true
                    return (
                      f.name.toLowerCase().includes(q) ||
                      (f.title || '').toLowerCase().includes(q) ||
                      (f.description || '').toLowerCase().includes(q)
                    )
                  }
                  for (const f of advSchema.filter(match)) {
                    if (!grouped[f.group]) grouped[f.group] = []
                    grouped[f.group].push(f)
                  }
                  const order = Object.keys(grouped).sort()
                  return order.map((g) => (
                    <div key={g} className="mb-2">
                      <Typography.Title level={5} className="!mb-2 flex items-center">{iconForGroup(g)}{g}</Typography.Title>
                      <Space direction="vertical" className="w-full">
                        {grouped[g].map((f) => {
                          const v = advancedValues[f.name]
                          const setV = (nv: any) => setAdvancedValue(f.name, nv)
                          const isOpen = fieldDetailsOpen[f.name]
                          const setOpen = (open: boolean) => setFieldDetailsOpen((prev) => ({ ...prev, [f.name]: open }))
                          const ariaLabel = `${g} \u2013 ${f.title || f.name}`
                          const Label = (
                            <div className="flex items-center gap-1">
                              <span className="min-w-60 text-sm">{f.title || f.name}</span>
                              {f.description ? (
                                <AntTooltip placement="right" trigger={["hover","click"]} title={<div className="max-w-96 text-xs">{f.description}</div>}>
                                  <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                                </AntTooltip>
                              ) : null}
                            </div>
                          )
                          if (f.enum && f.enum.length > 0) {
                            return (
                              <div key={f.name} className="flex items-center gap-2">
                                {Label}
                                <Select
                                  className="w-72"
                                  allowClear
                                  aria-label={ariaLabel}
                                  value={v}
                                  onChange={setV as any}
                                  options={f.enum.map((e) => ({ value: e, label: String(e) }))}
                                />
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                                )}
                              </div>
                            )
                          }
                          if (f.type === 'boolean') {
                            const boolState = v === true || v === 'true' ? 'true' : v === false || v === 'false' ? 'false' : 'unset'
                            return (
                              <div key={f.name} className="flex items-center gap-2">
                                {Label}
                                <Switch
                                  checked={boolState === 'true'}
                                  onChange={(checked) => setAdvancedValue(f.name, checked)}
                                  aria-label={ariaLabel}
                                />
                                <Button
                                  size="small"
                                  onClick={() => setAdvancedValue(f.name, undefined)}
                                  disabled={boolState === 'unset'}>
                                  Unset
                                </Button>
                                <Typography.Text type="secondary" className="text-[11px] text-gray-500">
                                  {boolState === 'unset' ? 'Currently unset (server defaults)' : boolState === 'true' ? 'On' : 'Off'}
                                </Typography.Text>
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                                )}
                              </div>
                            )
                          }
                          if (f.type === 'integer' || f.type === 'number') {
                            return (
                              <div key={f.name} className="flex items-center gap-2">
                                {Label}
                                <InputNumber
                                  className="w-40"
                                  aria-label={ariaLabel}
                                  value={v}
                                  onChange={setV as any}
                                />
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                                )}
                              </div>
                            )
                          }
                          return (
                            <div key={f.name} className="flex items-center gap-2">
                              {Label}
                              <Input
                                className="w-96"
                                aria-label={ariaLabel}
                                value={v}
                                onChange={(e) => setV(e.target.value)}
                              />
                              {f.description && (
                                <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>{isOpen ? 'Hide details' : 'Show details'}</button>
                              )}
                            </div>
                          )
                        })}
                      {/* details sections */}
                      {grouped[g].map((f) => (
                        f.description && fieldDetailsOpen[f.name] ? (
                          <div key={`${f.name}-details`} className="ml-4 mt-1 p-2 rounded bg-gray-50 dark:bg-[#262626] text-xs text-gray-600 dark:text-gray-300 max-w-[48rem]">
                            {f.description}
                          </div>
                        ) : null
                      ))}
                      </Space>
                    </div>
                  ))
                })()
              )}
            </Space>
          )
        }]} />

        {results.length > 0 && (
          <div className="mt-4">
            <Typography.Title level={5}>{t('quickIngest.results') || 'Results'}</Typography.Title>
            <List
              size="small"
              dataSource={results}
              renderItem={(item) => {
                const mediaId = item.status === "ok" && storeRemote ? mediaIdFromPayload(item.data) : null
                const hasMediaId = mediaId != null
                const actions: React.ReactNode[] = []
                if (!storeRemote && item.status === "ok") {
                  actions.push(
                    <button
                      key="dl"
                      type="button"
                      onClick={() => downloadJson(item)}
                      aria-label={`Download JSON for ${item.url || item.fileName || "item"}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t("quickIngest.downloadJson") || "Download JSON"}
                    </button>
                  )
                }
                if (hasMediaId) {
                  actions.push(
                    <button
                      key="open-media"
                      type="button"
                      onClick={() => openInMediaViewer(item)}
                      className="text-blue-600 hover:underline"
                    >
                      {t("quickIngest.openInMedia", "Open in Media viewer")}
                    </button>
                  )
                  actions.push(
                    <button
                      key="discuss-chat"
                      type="button"
                      onClick={() => discussInChat(item)}
                      className="text-blue-600 hover:underline"
                    >
                      {t("quickIngest.discussInChat", "Discuss in chat")}
                    </button>
                  )
                }
                return (
                  <List.Item actions={actions}>
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <Tag color={item.status === "ok" ? "green" : "red"}>
                          {item.status.toUpperCase()}
                        </Tag>
                        <span>{item.type.toUpperCase()}</span>
                      </div>
                      <div className="text-xs text-gray-500 break-all">
                        {item.url || item.fileName}
                      </div>
                      {hasMediaId ? (
                        <div className="text-[11px] text-gray-500">
                          {t("quickIngest.savedAsMedia", "Saved as media {{id}}", {
                            id: String(mediaId)
                          })}
                        </div>
                      ) : null}
                      {item.error ? (
                        <div className="text-xs text-red-500">{item.error}</div>
                      ) : null}
                    </div>
                  </List.Item>
                )
              }}
            />
          </div>
        )}
      </Space>
    </Modal>
  )
}

export default QuickIngestModal
