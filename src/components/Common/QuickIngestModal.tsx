import React from 'react'
import { Modal, Button, Input, Select, Space, Switch, Typography, List, Tag, message, Collapse, InputNumber, Tooltip as AntTooltip, Spin, Progress, Drawer } from 'antd'
import { useTranslation } from 'react-i18next'
import { browser } from "wxt/browser"
import { tldwClient } from '@/services/tldw/TldwApiClient'
import { HelpCircle, Headphones, Layers, Database, FileText, Film, Cookie, Info, Clock, Grid, BookText, Link2, File as FileIcon, AlertTriangle } from 'lucide-react'
import { useStorage } from '@plasmohq/storage/hook'
import { useConfirmDanger } from '@/components/Common/confirm-danger'
import { defaultEmbeddingModelForRag } from '@/services/ollama'
import { tldwModels } from '@/services/tldw'
import { useConnectionActions, useConnectionState } from '@/hooks/useConnectionState'
import { useQuickIngestStore } from "@/store/quick-ingest"

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
  autoProcessQueued?: boolean
}

const MAX_LOCAL_FILE_BYTES = 500 * 1024 * 1024 // 500MB soft cap for local file ingest
const INLINE_FILE_WARN_BYTES = 100 * 1024 * 1024 // warn/block before copying very large buffers in-memory

const isLikelyUrl = (raw: string) => {
  const val = (raw || '').trim()
  if (!val) return false
  try {
    // eslint-disable-next-line no-new
    new URL(val)
    return true
  } catch {
    return false
  }
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

export const QuickIngestModal: React.FC<Props> = ({
  open,
  onClose,
  autoProcessQueued = false
}) => {
  const { t } = useTranslation(['option', 'settings'])
  const qi = React.useCallback(
    (key: string, defaultValue: string, options?: Record<string, any>) =>
      options
        ? t(`quickIngest.${key}`, { defaultValue, ...options })
        : t(`quickIngest.${key}`, defaultValue),
    [t]
  )
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
  const [storageHintSeen, setStorageHintSeen] = useStorage<boolean>('quickIngestStorageHintSeen', false)
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
  const [runStartedAt, setRunStartedAt] = React.useState<number | null>(null)
  const [pendingUrlInput, setPendingUrlInput] = React.useState<string>('')
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null)
  const [selectedFileIndex, setSelectedFileIndex] = React.useState<number | null>(null)
  const [inspectorOpen, setInspectorOpen] = React.useState<boolean>(false)
  const [hasOpenedInspector, setHasOpenedInspector] = React.useState<boolean>(false)
  const [showInspectorIntro, setShowInspectorIntro] = React.useState<boolean>(true)
  const [inspectorIntroDismissed, setInspectorIntroDismissed] = useStorage<boolean>('quickIngestInspectorIntroDismissed', false)
  const confirmDanger = useConfirmDanger()
  const introToast = React.useRef(false)
  const { isConnected, offlineBypass } = useConnectionState()
  const { checkOnce } = useConnectionActions?.() || {}
  const ingestBlocked = !isConnected || Boolean(offlineBypass)
  const ingestBlockedPrevRef = React.useRef(ingestBlocked)
  const hadOfflineQueuedRef = React.useRef(false)
  const { setQueuedCount, clearQueued, markFailure, clearFailure } =
    useQuickIngestStore((s) => ({
      setQueuedCount: s.setQueuedCount,
      clearQueued: s.clearQueued,
      markFailure: s.markFailure,
      clearFailure: s.clearFailure
    }))
  const [lastRunError, setLastRunError] = React.useState<string | null>(null)
  const [progressTick, setProgressTick] = React.useState<number>(0)
  const advancedHydratedRef = React.useRef(false)
  const uiPrefsHydratedRef = React.useRef(false)

  const unmountedRef = React.useRef(false)

  React.useEffect(() => {
    return () => {
      unmountedRef.current = true
    }
  }, [])

  const formatBytes = React.useCallback((bytes?: number) => {
    if (!bytes || Number.isNaN(bytes)) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let v = bytes
    let u = 0
    while (v >= 1024 && u < units.length - 1) {
      v /= 1024
      u += 1
    }
    return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[u]}`
  }, [])

  const fileTypeFromName = React.useCallback((f: File): Entry['type'] => {
    const name = (f.name || '').toLowerCase()
    if (name.match(/\.(mp3|wav|flac|m4a|aac)$/)) return 'audio'
    if (name.match(/\.(mp4|mov|mkv|webm)$/)) return 'video'
    if (name.match(/\.(pdf)$/)) return 'pdf'
    if (name.match(/\.(doc|docx|txt|rtf|md|epub)$/)) return 'document'
    return 'auto'
  }, [])

  const typeIcon = React.useCallback((type: Entry['type']) => {
    const cls = 'w-4 h-4 text-gray-500'
    switch (type) {
      case 'audio':
        return <Headphones className={cls} />
      case 'video':
        return <Film className={cls} />
      case 'pdf':
      case 'document':
        return <FileText className={cls} />
      case 'html':
        return <Link2 className={cls} />
      default:
        return <FileIcon className={cls} />
    }
  }, [])

  const statusForUrlRow = React.useCallback((row: Entry) => {
    const raw = (row.url || '').trim()
    if (raw && !isLikelyUrl(raw)) {
      return { label: 'Needs review', color: 'orange', reason: 'Invalid URL format' }
    }
    const custom =
      row.type !== 'auto' ||
      (row.audio && Object.keys(row.audio).length > 0) ||
      (row.document && Object.keys(row.document).length > 0) ||
      (row.video && Object.keys(row.video).length > 0)
    return {
      label: custom ? 'Custom' : 'Default',
      color: custom ? 'blue' : 'default' as const,
      reason: custom ? 'Custom type or options' : undefined
    }
  }, [])

  const statusForFile = React.useCallback((file: File) => {
    if (file.size && file.size > MAX_LOCAL_FILE_BYTES) {
      return { label: 'Needs review', color: 'orange', reason: 'File is over 500MB' }
    }
    return { label: 'Default', color: 'default' as const }
  }, [])

  const addUrlsFromInput = React.useCallback(
    (text: string) => {
      const parts = text
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.length === 0) return
      const entries = parts.map((u) => ({
        id: crypto.randomUUID(),
        url: u,
        type: detectTypeFromUrl(u)
      }))
      setRows((prev) => [...prev, ...entries])
      setPendingUrlInput('')
      setSelectedRowId(entries[0].id)
      setSelectedFileIndex(null)
      messageApi.success(`Added ${entries.length} URL${entries.length === 1 ? '' : 's'} to the queue.`)
    },
    [messageApi]
  )

  const clearAllQueues = React.useCallback(() => {
    setRows([{ id: crypto.randomUUID(), url: '', type: 'auto' }])
    setLocalFiles([])
    setSelectedRowId(null)
    setSelectedFileIndex(null)
    setPendingUrlInput('')
  }, [])

  const pasteFromClipboard = React.useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) {
        messageApi.info('Clipboard is empty.')
        return
      }
      addUrlsFromInput(text)
    } catch {
      messageApi.error('Unable to read from clipboard. Check browser permissions.')
    }
  }, [addUrlsFromInput, messageApi])

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
  const removeRow = (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id))
    if (selectedRowId === id) {
      setSelectedRowId(null)
    }
  }
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

  const plannedCount = React.useMemo(() => {
    const valid = rows.filter((r) => r.url.trim().length > 0)
    return valid.length + localFiles.length
  }, [rows, localFiles])

  const resultById = React.useMemo(() => {
    const map = new Map<string, ResultItem>()
    for (const r of results) map.set(r.id, r)
    return map
  }, [results])

  const stagedCount = React.useMemo(() => {
    let count = 0
    const trimmedRows = rows.filter((r) => r.url.trim().length > 0)
    for (const row of trimmedRows) {
      const res = resultById.get(row.id)
      if (!res || !res.status) {
        count += 1
      }
    }
    for (const file of localFiles) {
      const match = results.find((r) => r.fileName === file.name)
      if (!match || !match.status) {
        count += 1
      }
    }
    return count
  }, [rows, localFiles, resultById, results])

  React.useEffect(() => {
    if (ingestBlocked && stagedCount > 0) {
      hadOfflineQueuedRef.current = true
    }
    if (ingestBlockedPrevRef.current && !ingestBlocked && stagedCount > 0) {
      messageApi.info(
        t(
          "quickIngest.readyToast",
          "Server back online — ready to process {{count}} queued items.",
          { count: stagedCount }
        )
      )
    }
    if (!ingestBlocked && stagedCount === 0) {
      hadOfflineQueuedRef.current = false
    }
    ingestBlockedPrevRef.current = ingestBlocked
  }, [ingestBlocked, stagedCount, messageApi, t])

  React.useEffect(() => {
    if (hadOfflineQueuedRef.current && stagedCount > 0) {
      setQueuedCount(stagedCount)
    } else {
      setQueuedCount(0)
    }
  }, [setQueuedCount, stagedCount])

  React.useEffect(() => {
    return () => {
      clearQueued()
    }
  }, [clearQueued])

  const showProcessQueuedButton =
    !ingestBlocked && stagedCount > 0 && hadOfflineQueuedRef.current

  const autoProcessedRef = React.useRef(false)

  const run = React.useCallback(async () => {
    // Reset any previous error state before a new attempt.
    setLastRunError(null)
    clearFailure()

    if (ingestBlocked) {
      messageApi.warning(
        t(
          "quickIngest.offlineQueueToast",
          "Offline mode: items are queued here until your server is back online."
        )
      )
      return
    }
    const valid = rows.filter((r) => r.url.trim().length > 0)
    if (valid.length === 0 && localFiles.length === 0) {
      messageApi.error('Please add at least one URL or file')
      return
    }
    const oversizedFiles = localFiles.filter(
      (f) => f.size && f.size > MAX_LOCAL_FILE_BYTES
    )
    if (oversizedFiles.length > 0) {
      const maxLabel = formatBytes(MAX_LOCAL_FILE_BYTES)
      const names = oversizedFiles.map((f) => f.name).slice(0, 3).join(', ')
      const suffix = oversizedFiles.length > 3 ? '…' : ''
      const msg = names
        ? `File too large: ${names}${suffix}. Each file must be smaller than ${maxLabel}.`
        : `One or more files are too large. Each file must be smaller than ${maxLabel}.`
      messageApi.error(msg)
      setLastRunError(msg)
      return
    }
    const total = valid.length + localFiles.length
    setTotalPlanned(total)
    setProcessedCount(0)
    setLiveTotalCount(total)
    setRunStartedAt(Date.now())
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
          if (f.size && f.size > INLINE_FILE_WARN_BYTES) {
            const msg = `File "${f.name}" is too large for inline transfer (over ${formatBytes(INLINE_FILE_WARN_BYTES)}). Please upload a smaller file or process directly on the server.`
            messageApi.error(msg)
            throw new Error(msg)
          }
          // Guard again at runtime; oversized files should never be read into memory.
          if (f.size && f.size > MAX_LOCAL_FILE_BYTES) {
            throw new Error(
              `File "${f.name}" is too large to ingest (over ${formatBytes(MAX_LOCAL_FILE_BYTES)}).`
            )
          }
          // Use a plain array so runtime message cloning (MV3 SW) preserves bytes
          const data = Array.from(new Uint8Array(await f.arrayBuffer()))
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

      if (unmountedRef.current) {
        return
      }

      if (!resp?.ok) {
        const msg = resp?.error || "Quick ingest failed. Check tldw server settings and try again."
        messageApi.error(msg)
        if (unmountedRef.current) {
          return
        }
        setLastRunError(msg)
        markFailure()
        setRunning(false)
        setRunStartedAt(null)
        return
      }

      const out = resp.results || []
      if (unmountedRef.current) {
        return
      }
      setResults(out)
      setRunning(false)
      setRunStartedAt(null)
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
      // Successful run (even with some item-level failures) clears the global failure flag.
      clearFailure()
      setLastRunError(null)
    } catch (e: any) {
      const msg = e?.message || "Quick ingest failed."
      messageApi.error(msg)
      if (unmountedRef.current) {
        return
      }
      setRunning(false)
      setRunStartedAt(null)
      setLastRunError(msg)
      markFailure()
    }
  }, [
    advancedValues,
    clearFailure,
    common,
    ingestBlocked,
    localFiles,
    formatBytes,
    messageApi,
    rows,
    storeRemote,
    t
  ])

  React.useEffect(() => {
    if (!open) {
      autoProcessedRef.current = false
      return
    }
    if (autoProcessedRef.current) return
    if (!showProcessQueuedButton) return
    if (running) return
    autoProcessedRef.current = true
    void run()
  }, [autoProcessQueued, open, run, running, showProcessQueuedButton])

  // Load OpenAPI schema to build advanced fields (best-effort)
  const groupForField = (name: string): string => {
    const n = name.toLowerCase()
    if (n.startsWith('transcription_') || ['diarize','vad_use','chunk_language'].includes(n)) return 'Transcription'
    if (n.startsWith('chunk_') || ['use_adaptive_chunking','enable_contextual_chunking','use_multi_level_chunking','perform_chunking','contextual_llm_model'].includes(n)) return 'Chunking'
    if (n.includes('embedding')) return 'Embeddings'
    if (n.startsWith('context_') || n === 'context_strategy') return 'Context'
    if (n.includes('summarization') || n.includes('analysis') || n === 'system_prompt' || n === 'custom_prompt') return 'Analysis/Summarization'
    if (n.includes('pdf') || n.includes('ocr')) return 'Document/PDF'
    if (n.includes('video')) return 'Video'
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

  // Load persisted advanced values on mount (once)
  React.useEffect(() => {
    if (advancedHydratedRef.current) return
    advancedHydratedRef.current = true
    if (savedAdvValues && typeof savedAdvValues === 'object') {
      setAdvancedValues((prev) => ({ ...prev, ...savedAdvValues }))
    }
  }, [savedAdvValues, advancedHydratedRef])

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

  // Restore UI prefs for Advanced section and details (once)
  React.useEffect(() => {
    if (uiPrefsHydratedRef.current) return
    uiPrefsHydratedRef.current = true
    if (uiPrefs?.advancedOpen !== undefined) setAdvancedOpen(Boolean(uiPrefs.advancedOpen))
    if (uiPrefs?.fieldDetailsOpen && typeof uiPrefs.fieldDetailsOpen === 'object') setFieldDetailsOpen(uiPrefs.fieldDetailsOpen)
  }, [uiPrefs])

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

  const openHealthDiagnostics = React.useCallback(() => {
    try {
      const hash = "#/settings/health"
      const path = window.location.pathname || ""
      if (path.includes("options.html")) {
        window.location.hash = hash
        return
      }
      try {
        const url = browser.runtime.getURL(`/options.html${hash}`)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (browser.tabs?.create) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          browser.tabs.create({ url })
        } else {
          window.open(url, "_blank")
        }
        return
      } catch {
        // fall through
      }
      window.open(`/options.html${hash}`, "_blank")
    } catch {
      // best-effort; avoid throwing from modal
    }
  }, [])

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

  const firstAudioRow = React.useMemo(
    () =>
      rows.find(
        (r) =>
          r.type === "audio" ||
          (r.type === "auto" && detectTypeFromUrl(r.url) === "audio")
      ),
    [rows]
  )

  const firstDocumentRow = React.useMemo(
    () =>
      rows.find(
        (r) =>
          r.type === "document" ||
          r.type === "pdf" ||
          (r.type === "auto" &&
            ["document", "pdf"].includes(detectTypeFromUrl(r.url)))
      ),
    [rows]
  )

  const firstVideoRow = React.useMemo(
    () =>
      rows.find(
        (r) =>
          r.type === "video" ||
          (r.type === "auto" && detectTypeFromUrl(r.url) === "video")
      ),
    [rows]
  )

  const selectedRow = React.useMemo(
    () => rows.find((r) => r.id === selectedRowId) || null,
    [rows, selectedRowId]
  )

  const selectedFile = React.useMemo(() => {
    if (selectedFileIndex == null || selectedFileIndex < 0) return null
    return localFiles[selectedFileIndex] || null
  }, [localFiles, selectedFileIndex])

  // Keep intro hidden if user dismissed previously
  React.useEffect(() => {
    if (inspectorIntroDismissed) {
      setShowInspectorIntro(false)
    }
  }, [inspectorIntroDismissed])

  // Auto-open inspector on first meaningful selection to guide users
  React.useEffect(() => {
    if ((selectedRow || selectedFile) && !hasOpenedInspector) {
      setInspectorOpen(true)
      setHasOpenedInspector(true)
    }
  }, [hasOpenedInspector, selectedFile, selectedRow])

  React.useEffect(() => {
    setSelectedFileIndex((prev) => {
      if (localFiles.length === 0) return null
      if (prev == null) return 0
      if (prev >= localFiles.length) return localFiles.length - 1
      return prev
    })

    if (selectedRowId && rows.some((r) => r.id === selectedRowId)) {
      return
    }
    if (rows.length > 0) {
      setSelectedRowId(rows[0].id)
      setSelectedFileIndex(null)
      return
    }
  }, [localFiles.length, rows, selectedRowId])

  React.useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setProgressTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const progressMeta = React.useMemo(() => {
    const total = liveTotalCount || totalPlanned || 0
    const done = processedCount || results.length || 0
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
    const elapsedMs = runStartedAt ? Date.now() - runStartedAt : 0
    const elapsedLabel =
      elapsedMs > 0
        ? `${Math.floor(elapsedMs / 60000)}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}`
        : null
    return { total, done, pct, elapsedLabel }
  }, [liveTotalCount, processedCount, progressTick, results.length, runStartedAt, totalPlanned])

  const modifiedAdvancedCount = React.useMemo(
    () => Object.keys(advancedValues || {}).length,
    [advancedValues]
  )
  const specSourceLabel = React.useMemo(() => {
    switch (specSource) {
      case 'server':
        return qi('specSourceLive', 'Live server spec')
      case 'server-cached':
        return qi('specSourceCached', 'Cached server spec')
      case 'bundled':
        return qi('specSourceBundled', 'Bundled spec')
      default:
        return qi('specSourceFallback', 'Fallback spec')
    }
  }, [qi, specSource])

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

  const handleFileDrop = React.useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault()
      ev.stopPropagation()
      const files = Array.from(ev.dataTransfer?.files || [])
      if (files.length > 0) {
        setLocalFiles((prev) => [...prev, ...files])
        setSelectedFileIndex((prev) => (prev == null ? 0 : prev))
        setSelectedRowId(null)
      }
    },
    []
  )

  const retryFailedUrls = React.useCallback(() => {
    const failedByUrl = results.filter((r) => r.status === "error" && r.url)
    const byUrl = new Map(rows.map((row) => [row.url.trim(), row]))
    const failedUrls = failedByUrl.map((r) => {
      const key = (r.url || "").trim()
      const existing = byUrl.get(key)
      if (existing) {
        return { ...existing, id: crypto.randomUUID() }
      }
      return {
        id: crypto.randomUUID(),
        url: r.url || "",
        type: "auto" as Entry["type"]
      }
    })
    if (failedUrls.length === 0) {
      messageApi.info(qi("noFailedUrlToRetry", "No failed URL items to retry."))
      return
    }
    setRows(failedUrls)
    setLocalFiles([])
    setResults([])
    setProcessedCount(0)
    setTotalPlanned(failedUrls.length)
    setLiveTotalCount(failedUrls.length)
    setRunStartedAt(null)
    messageApi.info(
      qi(
        "queuedFailedUrls",
        "Queued {{count}} failed URL(s) to retry.",
        { count: failedUrls.length }
      )
    )
  }, [messageApi, qi, results, rows])

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

  React.useEffect(() => {
    const forceIntro = () => {
      setShowInspectorIntro(true)
      setInspectorOpen(true)
      try {
        setInspectorIntroDismissed(false)
      } catch {}
    }
    window.addEventListener('tldw:quick-ingest-force-intro', forceIntro)
    return () => window.removeEventListener('tldw:quick-ingest-force-intro', forceIntro)
  }, [setInspectorIntroDismissed])

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <span>{t('quickIngest.title') || 'Quick Ingest Media'}</span>
          <Button
            size="small"
            type="text"
            icon={<HelpCircle className="w-4 h-4" />}
            aria-label={qi('openInspectorIntro', 'Open Inspector intro')}
            title={qi('openInspectorIntro', 'Open Inspector intro')}
            onClick={() => {
              setShowInspectorIntro(true)
              try { setInspectorIntroDismissed(false) } catch {}
              setInspectorOpen(true)
            }}
          />
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
      rootClassName="quick-ingest-modal"
      maskClosable={!running}
    >
      {contextHolder}
      <div className="relative">
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
        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-[#161616] dark:text-gray-200">
          <div className="font-medium mb-1">
            {qi('tipsTitle', 'Tips')}
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>
              {qi(
                'tipsHybrid',
                'Hybrid input: drop files or paste URLs (comma/newline separated) to build the queue.'
              )}
            </li>
            <li>
              {qi(
                'tipsPerType',
                'Per-type settings (Audio/PDF/Video) apply to all items of that type.'
              )}
            </li>
            <li>
              {qi(
                'tipsInspector',
                'Use the Inspector to see status, type, and quick checks before ingesting.'
              )}
            </li>
          </ul>
        </div>
        {lastRunError && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-100">
            <div className="font-medium">
              {t(
                "quickIngest.errorSummary",
                "We couldn’t process ingest items right now."
              )}
            </div>
            <div className="mt-1">
              {t(
                "quickIngest.errorHint",
                "Try again after checking your tldw server. Health & diagnostics can help troubleshoot ingest issues."
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="small"
                type="primary"
                onClick={openHealthDiagnostics}
                data-testid="quick-ingest-open-health"
              >
                {t(
                  "settings:healthSummary.diagnostics",
                  "Health & diagnostics"
                )}
              </Button>
              <Typography.Text className="text-[11px] text-red-700 dark:text-red-200">
                {lastRunError}
              </Typography.Text>
            </div>
          </div>
        )}
        {ingestBlocked && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="font-medium">
              {t("quickIngest.offlineTitle", "Server offline — staging only")}
            </div>
            <div>
              {t(
                "quickIngest.offlineDescription",
                "You can queue URLs and files here and inspect fields, but ingestion will not run until your tldw server is online. Reconnect to process pending items."
              )}
            </div>
            <button
              type="button"
              onClick={openHealthDiagnostics}
              className="mt-1 inline-flex items-center text-[11px] font-medium text-amber-900 underline underline-offset-2 dark:text-amber-100"
            >
              {t(
                "quickIngest.checkHealthLink",
                "Check server health in Health & diagnostics"
              )}
            </button>
          </div>
        )}
        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#121212]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Typography.Title level={5} className="!mb-1">
                  {t('quickIngest.sourceHeading') || 'Input'}
                </Typography.Title>
                <Typography.Text>
                  {t('quickIngest.subtitle') || 'Drop files or paste URLs; items immediately join the queue.'}
                </Typography.Text>
                <div className="text-xs text-gray-500 mt-1">
                  {qi(
                    'supportedFormats',
                    'Supported: docs, PDFs, audio, video, and web URLs.'
                  )}
                </div>
              </div>
              <Tag color="blue">
                {qi(
                  'itemsReady',
                  '{{count}} item(s) ready',
                  { count: plannedCount || 0 }
                )}
              </Tag>
            </div>
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              id="qi-file-input"
              data-testid="qi-file-input"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                if (files.length > 0) {
                  setLocalFiles((prev) => [...prev, ...files])
                  setSelectedFileIndex((prev) => (prev == null ? 0 : prev))
                  setSelectedRowId(null)
                }
                e.currentTarget.value = ''
              }}
              accept=".pdf,.txt,.rtf,.doc,.docx,.md,.epub,application/pdf,text/plain,application/rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip,audio/*,video/*"
            />
            <div
              className="mt-3 w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-center dark:border-gray-700 dark:bg-[#1a1a1a]"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={handleFileDrop}
            >
              <div className="flex flex-col gap-2 items-center justify-center">
                <Typography.Text className="text-base font-medium">
                  {qi('dragAndDrop', 'Drag and drop files')}
                </Typography.Text>
                <Typography.Text type="secondary" className="text-xs">
                  {qi('dragAndDropHint', 'Docs, PDFs, audio, and video are all welcome.')}
                </Typography.Text>
                <div className="flex items-center gap-2">
                  <Button onClick={() => document.getElementById('qi-file-input')?.click()} disabled={running}>
                    {t('quickIngest.addFiles') || 'Browse files'}
                  </Button>
                  <Button
                    onClick={pasteFromClipboard}
                    disabled={running}
                    aria-label={qi('pasteFromClipboard', 'Paste URLs from clipboard')}
                    title={qi('pasteFromClipboard', 'Paste URLs from clipboard')}
                  >
                    {qi('pasteFromClipboard', 'Paste URLs from clipboard')}
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Typography.Text strong>
                  {qi('pasteUrlsTitle', 'Paste URLs')}
                </Typography.Text>
                <Typography.Text className="text-xs text-gray-500">
                  {qi('pasteUrlsHint', 'Separate with commas or new lines')}
                </Typography.Text>
              </div>
              <label
                htmlFor="quick-ingest-url-input"
                className="text-xs font-medium text-gray-700 dark:text-gray-200"
              >
                {qi('urlsLabel', 'URLs to ingest')}
              </label>
              <Space.Compact className="w-full">
                <Input
                  id="quick-ingest-url-input"
                  placeholder={qi('urlsPlaceholder', 'https://example.com, https://...')}
                  value={pendingUrlInput}
                  onChange={(e) => setPendingUrlInput(e.target.value)}
                  onPressEnter={(e) => {
                    e.preventDefault()
                    addUrlsFromInput(pendingUrlInput)
                  }}
                  disabled={running}
                  aria-label={qi('urlsInputAria', 'Paste URLs input')}
                  title={qi('urlsInputAria', 'Paste URLs input')}
                />
                  <Button
                    type="primary"
                    onClick={() => addUrlsFromInput(pendingUrlInput)}
                    disabled={running}
                    aria-label={qi('addUrlsAria', 'Add URLs to queue')}
                    title={qi('addUrlsAria', 'Add URLs to queue')}
                  >
                    {qi('addUrls', 'Add URLs')}
                  </Button>
                </Space.Compact>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span>
                  {qi(
                    'authRequiredHint',
                    'Authentication-required pages may need cookies set in Advanced.'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-[#121212]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Typography.Title level={5} className="!mb-0">
                {qi('queueTitle', 'Queue')}
              </Typography.Title>
                <div className="flex items-center gap-2">
                <Button
                  size="small"
                  onClick={clearAllQueues}
                  disabled={running && plannedCount > 0}
                  aria-label={qi('clearAllAria', 'Clear all queued items')}
                  title={qi('clearAllAria', 'Clear all queued items')}
                >
                  {qi('clearAll', 'Clear all')}
                </Button>
                <Button
                  size="small"
                  onClick={addRow}
                  disabled={running}
                  aria-label={qi('addBlankRowAria', 'Add blank URL row')}
                  title={qi('addBlankRowAria', 'Add blank URL row')}
                >
                  {qi('addBlankRow', 'Add blank row')}
                </Button>
                  <Button
                    size="small"
                    aria-label={qi('openInspector', 'Open Inspector')}
                    title={qi('openInspector', 'Open Inspector')}
                    onClick={() => setInspectorOpen(true)}
                    disabled={!(selectedRow || selectedFile)}>
                    {qi('openInspector', 'Open Inspector')}
                  </Button>
                </div>
              </div>
            <div className="text-xs text-gray-500 mb-2">
              {qi(
                'queueDescription',
                'Staged items appear here. Click a row to open the Inspector; badges show defaults, custom edits, or items needing attention.'
              )}
            </div>
            <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
              {rows.map((row) => {
                const status = statusForUrlRow(row)
                const isSelected = selectedRowId === row.id
                const detected = row.type === 'auto' ? detectTypeFromUrl(row.url) : row.type
                const res = resultById.get(row.id)
                let runTag: React.ReactNode = null
                if (res?.status === 'ok') runTag = <Tag color="green">{qi('statusDone', 'Done')}</Tag>
                else if (res?.status === 'error') runTag = (
                  <AntTooltip title={res.error || qi('statusFailed', 'Failed')}>
                    <Tag color="red">{qi('statusFailed', 'Failed')}</Tag>
                  </AntTooltip>
                )
                else if (running) runTag = <Tag icon={<Spin size="small" />} color="blue">{qi('statusRunning', 'Running')}</Tag>
                const pendingTag =
                  ingestBlocked && !running && (!res || !res.status)
                    ? (
                      <Tag>
                        {t(
                          "quickIngest.pendingLabel",
                          "Pending — will run when connected"
                        )}
                      </Tag>
                    )
                    : null

                return (
                  <div
                    key={row.id}
                  className={`group relative rounded-md border px-3 py-2 transition hover:border-blue-400 ${isSelected ? 'border-blue-500 shadow-sm' : 'border-gray-200 dark:border-gray-700'}`}
                  onClick={() => {
                    setSelectedRowId(row.id)
                    setSelectedFileIndex(null)
                    setInspectorOpen(true)
                  }}
                >
                    <Button
                      size="small"
                      type="text"
                      className={`absolute right-2 top-2 opacity-0 transition focus:opacity-100 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''}`}
                      aria-label="Open Inspector for this item"
                      title="Open Inspector for this item"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedRowId(row.id)
                        setSelectedFileIndex(null)
                        setInspectorOpen(true)
                      }}>
                      <Info className="w-4 h-4 text-gray-500" />
                    </Button>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {typeIcon(detected)}
                        <div className="flex flex-col">
                          <Typography.Text className="text-sm font-medium">
                            {row.url ? row.url : qi('untitledUrl', 'Untitled URL')}
                          </Typography.Text>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <Tag color="geekblue">{detected.toUpperCase()}</Tag>
                            {status.reason ? <span className="text-orange-600">{status.reason}</span> : (
                              <span>{qi('defaultsApplied', 'Defaults will be applied.')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag color={status.color === 'default' ? undefined : status.color}>{status.label}</Tag>
                        {runTag}
                        {pendingTag}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      <Input
                        placeholder={qi('urlPlaceholder', 'https://...')}
                        value={row.url}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateRow(row.id, { url: e.target.value })}
                        disabled={running}
                        aria-label={qi('sourceUrlAria', 'Source URL')}
                        title={qi('sourceUrlAria', 'Source URL')}
                      />
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <Select
                          className="min-w-32"
                          value={row.type}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(v) => updateRow(row.id, { type: v as Entry['type'] })}
                          aria-label={qi('forceMediaType', 'Force media type')}
                          title={qi('forceMediaType', 'Force media type')}
                          options={[
                            { label: qi('typeAuto', 'Auto'), value: 'auto' },
                            { label: qi('typeHtml', 'HTML'), value: 'html' },
                            { label: qi('typePdf', 'PDF'), value: 'pdf' },
                            { label: qi('typeDocument', 'Document'), value: 'document' },
                            { label: qi('typeAudio', 'Audio'), value: 'audio' },
                            { label: qi('typeVideo', 'Video'), value: 'video' }
                          ]}
                          disabled={running}
                        />
                          <Button
                            size="small"
                            danger
                            onClick={(e) => { e.stopPropagation(); removeRow(row.id) }}
                            disabled={rows.length === 1 || running}
                            aria-label="Remove this row from queue"
                            title="Remove this row from queue"
                          >
                            {t('quickIngest.remove') || 'Remove'}
                          </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {localFiles.map((f, idx) => {
                const status = statusForFile(f)
                const isSelected = selectedFileIndex === idx
                const type = fileTypeFromName(f)
                const match = results.find((r) => r.fileName === f.name)
                const runStatus = match?.status
                let runTag: React.ReactNode = null
                if (runStatus === 'ok') runTag = <Tag color="green">{qi('statusDone', 'Done')}</Tag>
                else if (runStatus === 'error') {
                  runTag = (
                    <AntTooltip title={match?.error || qi('statusFailed', 'Failed')}>
                      <Tag color="red">{qi('statusFailed', 'Failed')}</Tag>
                    </AntTooltip>
                  )
                } else if (running) runTag = <Tag icon={<Spin size="small" />} color="blue">{qi('statusRunning', 'Running')}</Tag>
                const pendingTag =
                  ingestBlocked && !running && !runStatus
                    ? (
                      <Tag>
                        {t(
                          "quickIngest.pendingLabel",
                          "Pending — will run when connected"
                        )}
                      </Tag>
                    )
                    : null

                return (
                  <div
                    key={`${f.name}-${idx}`}
                  className={`group relative rounded-md border px-3 py-2 transition hover:border-blue-400 ${isSelected ? 'border-blue-500 shadow-sm' : 'border-gray-200 dark:border-gray-700'}`}
                  onClick={() => {
                    setSelectedFileIndex(idx)
                    setSelectedRowId(null)
                    setInspectorOpen(true)
                  }}
                >
                    <Button
                      size="small"
                      type="text"
                      className={`absolute right-2 top-2 opacity-0 transition focus:opacity-100 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''}`}
                      aria-label="Open Inspector for this file"
                      title="Open Inspector for this file"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFileIndex(idx)
                        setSelectedRowId(null)
                        setInspectorOpen(true)
                      }}>
                      <Info className="w-4 h-4 text-gray-500" />
                    </Button>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {typeIcon(type)}
                        <div className="flex flex-col">
                          <Typography.Text className="text-sm font-medium truncate max-w-[360px]">
                            {f.name}
                          </Typography.Text>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <Tag color="geekblue">{type.toUpperCase()}</Tag>
                            <span>{formatBytes((f as any)?.size)} {f.type ? `· ${f.type}` : ''}</span>
                            {status.reason ? <span className="text-orange-600">{status.reason}</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag color={status.color === 'default' ? undefined : status.color}>{status.label}</Tag>
                        {runTag}
                        {pendingTag}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        <Button
                          size="small"
                          danger
                          aria-label="Remove this file from queue"
                          title="Remove this file from queue"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLocalFiles((prev) => {
                              const next = prev.filter((_, i) => i !== idx)
                              if (selectedFileIndex === idx) {
                                setSelectedFileIndex(null)
                              }
                              return next
                            })
                          }}
                          disabled={running}
                        >
                          {t('quickIngest.remove') || 'Remove'}
                        </Button>
                      </div>
                    </div>
                  )
                })}

              {rows.length === 0 && localFiles.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  {qi('emptyQueue', 'No items queued yet. Drop files or add URLs to start.')}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3 space-y-3 dark:border-gray-700 dark:bg-[#121212]">
            <Typography.Title level={5} className="!mb-2">{t('quickIngest.commonOptions') || 'Ingestion options'}</Typography.Title>
            <Space wrap size="middle" align="center">
                <Space align="center">
                  <span>{qi('analysisLabel', 'Analysis')}</span>
                  <Switch
                    aria-label="Ingestion options \u2013 analysis"
                    title="Toggle analysis"
                    checked={common.perform_analysis}
                    onChange={(v) =>
                      setCommon((c) => ({ ...c, perform_analysis: v }))
                    }
                    disabled={running}
                />
              </Space>
                <Space align="center">
                  <span>{qi('chunkingLabel', 'Chunking')}</span>
                  <Switch
                    aria-label="Ingestion options \u2013 chunking"
                    title="Toggle chunking"
                    checked={common.perform_chunking}
                    onChange={(v) =>
                      setCommon((c) => ({ ...c, perform_chunking: v }))
                    }
                    disabled={running}
                />
              </Space>
                <Space align="center">
                  <span>{qi('overwriteLabel', 'Overwrite existing')}</span>
                  <Switch
                    aria-label="Ingestion options \u2013 overwrite existing"
                    title="Toggle overwrite existing"
                    checked={common.overwrite_existing}
                    onChange={(v) =>
                      setCommon((c) => ({ ...c, overwrite_existing: v }))
                    }
                    disabled={running}
                />
              </Space>
            </Space>

            {rows.some((r) => (r.type === 'audio' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'audio'))) && (
              <div className="space-y-1">
                <Typography.Title level={5} className="!mb-1">{t('quickIngest.audioOptions') || 'Audio options'}</Typography.Title>
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
                    aria-label="Audio language"
                    title="Audio language"
                  />
                    <Select
                      className="min-w-40"
                    value={firstAudioRow?.audio?.diarize ?? false}
                    onChange={(v) => setRows((rs) => rs.map((x) => {
                      const isAudio = x.type === 'audio' || (x.type === 'auto' && detectTypeFromUrl(x.url) === 'audio')
                      if (!isAudio) return x
                      return { ...x, audio: { ...(x.audio || {}), diarize: Boolean(v) } }
                    }))}
                    aria-label="Audio diarization toggle"
                    title="Audio diarization toggle"
                    options={[
                      { label: qi('audioDiarizationOff', 'Diarization: Off'), value: false },
                      { label: qi('audioDiarizationOn', 'Diarization: On'), value: true }
                    ]}
                    disabled={running}
                  />
                </Space>
                <Typography.Text type="secondary" className="text-xs">
                  {t('quickIngest.audioDiarizationHelp') || 'Turn on to separate speakers in transcripts; applies to all audio rows in this batch.'}
                </Typography.Text>
                <Typography.Text
                  className="text-[11px] text-gray-500 block"
                  title={qi('audioSettingsTitle', 'These audio settings apply to every audio item in this run.')}>
                  {qi('audioSettingsHint', 'These settings apply to every audio item in this run.')}
                </Typography.Text>
              </div>
            )}

            {rows.some((r) => (r.type === 'document' || r.type === 'pdf' || (r.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(r.url))))) && (
              <div className="space-y-1">
                <Typography.Title level={5} className="!mb-1">{t('quickIngest.documentOptions') || 'Document options'}</Typography.Title>
                  <Select
                    className="min-w-40"
                    value={firstDocumentRow?.document?.ocr ?? true}
                    onChange={(v) => setRows((rs) => rs.map((x) => {
                      const isDoc = x.type === 'document' || x.type === 'pdf' || (x.type === 'auto' && ['document', 'pdf'].includes(detectTypeFromUrl(x.url)))
                      if (!isDoc) return x
                      return { ...x, document: { ...(x.document || {}), ocr: Boolean(v) } }
                    }))}
                    aria-label="OCR toggle"
                    title="OCR toggle"
                    options={[
                      { label: qi('ocrOff', 'OCR: Off'), value: false },
                      { label: qi('ocrOn', 'OCR: On'), value: true }
                    ]}
                    disabled={running}
                  />
                <Typography.Text type="secondary" className="text-xs">
                  {t('quickIngest.ocrHelp') || 'OCR helps extract text from scanned PDFs or images; applies to all document/PDF rows.'}
                </Typography.Text>
                <Typography.Text
                  className="text-[11px] text-gray-500 block"
                  title={qi('documentSettingsTitle', 'These document settings apply to every document/PDF in this run.')}>
                  {qi('documentSettingsHint', 'Applies to all document/PDF items in this batch.')}
                </Typography.Text>
              </div>
            )}

            {rows.some((r) => (r.type === 'video' || (r.type === 'auto' && detectTypeFromUrl(r.url) === 'video'))) && (
              <div className="space-y-1">
                <Typography.Title level={5} className="!mb-1">{t('quickIngest.videoOptions') || 'Video options'}</Typography.Title>
                <Select
                  className="min-w-40"
                  value={firstVideoRow?.video?.captions ?? false}
                  onChange={(v) => setRows((rs) => rs.map((x) => {
                    const isVideo = x.type === 'video' || (x.type === 'auto' && detectTypeFromUrl(x.url) === 'video')
                    if (!isVideo) return x
                    return { ...x, video: { ...(x.video || {}), captions: Boolean(v) } }
                  }))}
                  aria-label="Captions toggle"
                  title="Captions toggle"
                  options={[
                    { label: qi('captionsOff', 'Captions: Off'), value: false },
                    { label: qi('captionsOn', 'Captions: On'), value: true }
                  ]}
                  disabled={running}
                />
                <Typography.Text type="secondary" className="text-xs">
                  {t('quickIngest.captionsHelp') || 'Include timestamps/captions for all video rows; helpful for search and summaries.'}
                </Typography.Text>
                <Typography.Text
                  className="text-[11px] text-gray-500 block"
                  title={qi('videoSettingsTitle', 'These video settings apply to every video in this run.')}>
                  {qi('videoSettingsHint', 'Applies to all video items in this batch.')}
                </Typography.Text>
              </div>
            )}

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-[#0f0f0f]">
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
                        : qi('itemsReadySr', '{{count}} item(s) ready', {
                            count: plannedCount || 0
                          })}
                    </div>
                  )
                })()}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between text-sm text-gray-700 dark:text-gray-200">
                  <div className="flex-1">
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-[#151515]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <Typography.Text strong>
                            {t(
                              'quickIngest.storageHeading',
                              'Where ingest results are stored'
                            )}
                          </Typography.Text>
                          <Space align="center" size="small">
                            <Switch
                              aria-label={
                                storeRemote
                                  ? t(
                                      'quickIngest.storeRemoteAria',
                                      'Store ingest results on your tldw server'
                                    )
                                  : t(
                                      'quickIngest.processOnlyAria',
                                      'Process ingest results locally only'
                                    )
                              }
                              title={
                                storeRemote
                                  ? t(
                                      'quickIngest.storeRemote',
                                      'Store to remote DB'
                                    )
                                  : t('quickIngest.process', 'Process locally')
                              }
                              checked={storeRemote}
                              onChange={setStoreRemote}
                              disabled={running}
                            />
                            <Typography.Text>
                              {storeRemote
                                ? (t(
                                      'quickIngest.storeRemote',
                                      'Store to remote DB'
                                    ) || 'Store to remote DB')
                                : (t(
                                      'quickIngest.process',
                                      'Process locally'
                                    ) || 'Process locally')}
                            </Typography.Text>
                          </Space>
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-start gap-2">
                            <span className="mt-[2px]">•</span>
                            <span>
                              {t(
                                'quickIngest.storageServerDescription',
                                'Stored on your tldw server (recommended for RAG and shared workspaces).'
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="mt-[2px]">•</span>
                            <span>
                              {t(
                                'quickIngest.storageLocalDescription',
                                'Kept in this browser only; no data written to your server.'
                              )}
                            </span>
                          </div>
                          {!storageHintSeen && (
                            <div className="pt-1">
                              <button
                                type="button"
                                className="text-xs underline text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                onClick={() => {
                                  try {
                                    const docsUrl =
                                      t(
                                        'quickIngest.storageDocsUrl',
                                        'https://docs.tldw.app/extension/media-ingest-storage'
                                      ) ||
                                      'https://docs.tldw.app/extension/media-ingest-storage'
                                    window.open(
                                      docsUrl,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )
                                  } catch {
                                    // ignore navigation errors
                                  } finally {
                                    try {
                                      setStorageHintSeen(true)
                                    } catch {
                                      // ignore storage errors
                                    }
                                  }
                                }}
                              >
                                {t(
                                  'quickIngest.storageDocsLink',
                                  'Learn more about ingest & storage'
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span
                    className="mt-2 text-xs text-gray-500 dark:text-gray-400 sm:mt-0"
                    title={
                      running && (liveTotalCount || totalPlanned) > 0
                        ? qi('ingestProgressTitle', 'Current ingest progress')
                        : qi('itemsReadyTitle', 'Items ready to ingest')
                    }
                  >
                    {(() => {
                      const done = processedCount || results.length
                      const total = liveTotalCount || totalPlanned
                      if (running && total > 0) {
                        return t(
                          'quickIngest.progress',
                          'Processing {{done}} / {{total}} items…',
                          {
                            done,
                            total
                          }
                        )
                      }
                      return qi('itemsReady', '{{count}} item(s) ready', {
                        count: plannedCount || 0
                      })
                    })()}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                {showProcessQueuedButton && (
                  <Button
                    onClick={run}
                    disabled={running || plannedCount === 0 || ingestBlocked}
                    aria-label={t(
                      "quickIngest.processQueuedItemsAria",
                      "Process queued Quick Ingest items"
                    )}
                    title={t(
                      "quickIngest.processQueuedItems",
                      "Process queued items"
                    )}>
                    {t(
                      "quickIngest.processQueuedItems",
                      "Process queued items"
                    )}
                  </Button>
                )}
                <Button
                  type="primary"
                  loading={running}
                  onClick={run}
                  disabled={plannedCount === 0 || running || ingestBlocked}
                  aria-label={
                    ingestBlocked
                      ? t(
                          "quickIngest.queueOnlyOfflineAria",
                          "Offline \u2014 queue items to process later"
                        )
                      : t("quickIngest.runAria", "Run quick ingest")
                  }
                  title={
                    ingestBlocked
                      ? t(
                          "quickIngest.queueOnlyOffline",
                          "Queue only \u2014 server offline"
                        )
                      : t("quickIngest.runLabel", "Run quick ingest")
                  }>
                  {ingestBlocked
                    ? t(
                        "quickIngest.queueOnlyOffline",
                        "Queue only \u2014 server offline"
                      )
                    : storeRemote
                      ? t("quickIngest.ingest", "Ingest")
                      : t("quickIngest.process", "Process")}
                </Button>
                <Button
                  onClick={onClose}
                  disabled={running}
                  aria-label={qi('closeQuickIngest', 'Close quick ingest')}
                  title={qi('closeQuickIngest', 'Close quick ingest')}>
                  {t('quickIngest.cancel') || 'Cancel'}
                </Button>
              </div>
              {ingestBlocked && (
                <div className="mt-1 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-200">
                  <span>
                    {t(
                      "quickIngest.offlineFooter",
                      "Offline mode: items are staged here and will process once your server reconnects."
                    )}
                  </span>
                  {checkOnce ? (
                    <Button
                      size="small"
                      onClick={() => {
                        try {
                          checkOnce?.()
                        } catch {
                          // ignore check errors; footer is informational
                        }
                      }}>
                      {qi('retryConnection', 'Retry connection')}
                    </Button>
                  ) : null}
                </div>
              )}
              {progressMeta.total > 0 && (
                <div className="mt-2">
                  <Progress percent={progressMeta.pct} showInfo={false} size="small" />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span>
                      {qi(
                        'processedCount',
                        '{{done}}/{{total}} processed',
                        { done: progressMeta.done, total: progressMeta.total }
                      )}
                    </span>
                    {progressMeta.elapsedLabel ? (
                      <span>
                        {qi('elapsedLabel', 'Elapsed {{time}}', {
                          time: progressMeta.elapsedLabel
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out ${inspectorOpen && (selectedRow || selectedFile) ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="absolute right-0 top-0 h-full w-40 bg-gradient-to-l from-blue-300/40 via-blue-200/20 to-transparent blur-md" />
        </div>

        <Drawer
          title={qi('inspectorTitle', 'Inspector')}
          placement="right"
          onClose={() => setInspectorOpen(false)}
          open={inspectorOpen && (!!selectedRow || !!selectedFile)}
          destroyOnClose
          width={380}
        >
          <div className="space-y-3">
            {showInspectorIntro && (
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-gray-700">
                <Typography.Text strong className="block mb-1">
                  {qi('inspectorIntroTitle', 'How to use the Inspector')}
                </Typography.Text>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>
                    {qi(
                      'inspectorIntroItem1',
                      'Click a queued item to see its detected type, status, and warnings.'
                    )}
                  </li>
                  <li>
                    {qi(
                      'inspectorIntroItem2',
                      'Use per-type controls on the main panel to set defaults; any per-row override marks it Custom.'
                    )}
                  </li>
                  <li>
                    {qi(
                      'inspectorIntroItem3',
                      'For auth-required URLs, add cookies/headers in Advanced before ingesting.'
                    )}
                  </li>
                </ul>
                <Button
                  size="small"
                  className="mt-2"
                  aria-label={qi('inspectorIntroDismiss', 'Dismiss Inspector intro and close')}
                  title={qi('inspectorIntroDismiss', 'Dismiss Inspector intro and close')}
                  onClick={() => {
                    setShowInspectorIntro(false)
                    try { setInspectorIntroDismissed(true) } catch {}
                    setInspectorOpen(false)
                    if (!introToast.current) {
                      messageApi.success(
                        qi(
                          'inspectorIntroDismissed',
                          'Intro dismissed — reset anytime in Settings > Quick Ingest (Reset Intro).'
                        )
                      )
                      introToast.current = true
                    }
                  }}>
                  {qi('gotIt', 'Got it')}
                </Button>
              </div>
            )}
            {selectedRow || selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {typeIcon(selectedRow ? (selectedRow.type === 'auto' ? detectTypeFromUrl(selectedRow.url) : selectedRow.type) : fileTypeFromName(selectedFile!))}
                  <Typography.Text strong>
                    {selectedRow ? (selectedRow.url || qi('untitledUrl', 'Untitled URL')) : selectedFile?.name}
                  </Typography.Text>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  {selectedRow ? (
                    <>
                      <Tag color={statusForUrlRow(selectedRow).color === 'default' ? undefined : statusForUrlRow(selectedRow).color}>{statusForUrlRow(selectedRow).label}</Tag>
                      <Tag color="geekblue">
                        {(selectedRow.type === 'auto' ? detectTypeFromUrl(selectedRow.url) : selectedRow.type).toUpperCase()}
                      </Tag>
                      {statusForUrlRow(selectedRow).reason ? <span className="text-orange-600">{statusForUrlRow(selectedRow).reason}</span> : (
                        <span>{qi('defaultsApplied', 'Defaults will be applied.')}</span>
                      )}
                    </>
                  ) : null}
                  {selectedFile ? (
                    <>
                      <Tag color={statusForFile(selectedFile).color === 'default' ? undefined : statusForFile(selectedFile).color}>{statusForFile(selectedFile).label}</Tag>
                      <Tag color="geekblue">{fileTypeFromName(selectedFile).toUpperCase()}</Tag>
                      <span>{formatBytes((selectedFile as any)?.size)} {selectedFile.type ? `· ${selectedFile.type}` : ''}</span>
                      {statusForFile(selectedFile).reason ? <span className="text-orange-600">{statusForFile(selectedFile).reason}</span> : null}
                    </>
                  ) : null}
                </div>
                {selectedRow ? (
                  <div className="text-xs text-gray-600">
                    {qi(
                      'inspectorRowEditHint',
                      'Editing the URL or forcing a type marks this item as Custom.'
                    )}
                  </div>
                ) : null}
                {selectedFile ? (
                  <div className="text-xs text-gray-600">
                    {qi(
                      'inspectorFileHint',
                      'File settings follow the per-type controls on the main panel.'
                    )}
                  </div>
                ) : null}
                <div className="text-xs text-gray-500">
                  {qi(
                    'inspectorAdvancedHint',
                    'Use Advanced options to set cookies/auth if required. Errors or warnings appear on each row.'
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                {qi('inspectorEmpty', 'Select a queued item to view details.')}
              </div>
            )}
          </div>
        </Drawer>

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
                <span>{qi('advancedOptionsTitle', 'Advanced options')}</span>
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
                    ? qi('specTooltipLive', 'Using live server OpenAPI spec')
                    : specSource === 'server-cached'
                      ? qi('specTooltipCached', 'Using cached server OpenAPI spec')
                      : specSource === 'bundled'
                        ? qi('specTooltipBundled', 'Using bundled spec from extension')
                        : qi('specTooltipFallback', 'No spec detected; using fallback fields')}</div>}
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
                <Button
                  size="small"
                  type="default"
                  aria-label={qi('resetInspectorIntro', 'Reset Inspector intro helper')}
                  title={qi('resetInspectorIntro', 'Reset Inspector intro helper')}
                  onClick={(e) => {
                    e.stopPropagation()
                    setInspectorIntroDismissed(false)
                    setShowInspectorIntro(true)
                    setInspectorOpen(true)
                  }}>
                  {qi('resetInspectorIntro', 'Reset Inspector Intro')}
                </Button>
                <Space size="small" align="center">
                  <span className="text-xs text-gray-500">
                    {qi('preferServerLabel', 'Prefer server')}
                  </span>
                  <Switch
                    size="small"
                    aria-label={qi('preferServerAria', 'Advanced options – prefer server OpenAPI spec')}
                    title={qi('preferServerTitle', 'Prefer server OpenAPI spec')}
                    checked={!!specPrefs?.preferServer}
                    onChange={async (v) => {
                      persistSpecPrefs({ ...(specPrefs || {}), preferServer: v })
                      await loadSpec(v, true)
                    }}
                  />
                </Space>
                <Button
                  size="small"
                  aria-label={qi('reloadSpecAria', 'Reload advanced spec from server')}
                  title={qi('reloadSpecAria', 'Reload advanced spec from server')}
                  onClick={(e) => {
                    e.stopPropagation()
                    void loadSpec(true, true)
                  }}>
                  {qi('reloadFromServer', 'Reload from server')}
                </Button>
                <span className="h-4 border-l border-gray-300 dark:border-gray-600" aria-hidden />
                <Button
                  size="small"
                  danger
                  aria-label={qi('resetAdvancedAria', 'Reset advanced options and UI state')}
                  title={qi('resetAdvancedAria', 'Reset advanced options and UI state')}
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = await confirmDanger({
                      title: qi('confirmResetTitle', 'Please confirm'),
                      content:
                        qi('confirmResetContent', 'Reset all advanced options and UI state?'),
                      okText: qi('reset', 'Reset'),
                      cancelText: qi('cancel', 'Cancel')
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
                    messageApi.success(qi('advancedReset', 'Advanced options reset'))
                  }}>
                  {qi('resetAdvanced', 'Reset Advanced')}
                </Button>
              </div>
            </div>
          ),
          children: (
        <Space direction="vertical" className="w-full">
              <div className="flex items-center gap-2">
                <Input
                  allowClear
                  placeholder={qi('searchAdvanced', 'Search advanced fields...')}
                  value={advSearch}
                  onChange={(e) => setAdvSearch(e.target.value)}
                  className="max-w-80"
                  aria-label={qi('searchAdvanced', 'Search advanced fields...')}
                  title={qi('searchAdvanced', 'Search advanced fields...')}
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
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>
                                    {isOpen
                                      ? qi('hideDetails', 'Hide details')
                                      : qi('showDetails', 'Show details')}
                                  </button>
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
                                  {qi('unset', 'Unset')}
                                </Button>
                                <Typography.Text type="secondary" className="text-[11px] text-gray-500">
                                  {boolState === 'unset'
                                    ? qi('unsetLabel', 'Currently unset (server defaults)')
                                    : boolState === 'true'
                                      ? qi('onLabel', 'On')
                                      : qi('offLabel', 'Off')}
                                </Typography.Text>
                                {f.description && (
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>
                                    {isOpen
                                      ? qi('hideDetails', 'Hide details')
                                      : qi('showDetails', 'Show details')}
                                  </button>
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
                                  <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>
                                    {isOpen
                                      ? qi('hideDetails', 'Hide details')
                                      : qi('showDetails', 'Show details')}
                                  </button>
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
                                <button className="text-xs underline text-gray-500" onClick={() => setOpen(!isOpen)}>
                                  {isOpen
                                    ? qi('hideDetails', 'Hide details')
                                    : qi('showDetails', 'Show details')}
                                </button>
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
            <div className="flex items-center justify-between">
              <Typography.Title level={5} className="!mb-0">{t('quickIngest.results') || 'Results'}</Typography.Title>
              <div className="flex items-center gap-2 text-xs">
                <Tag color="blue">
                  {qi('resultsCount', '{{count}} item(s)', { count: results.length })}
                </Tag>
                <Button
                  size="small"
                  onClick={retryFailedUrls}
                  disabled={!results.some((r) => r.status === 'error')}>
                  {qi('retryFailedUrls', 'Retry failed URLs')}
                </Button>
              </div>
            </div>
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
      </div>
    </Modal>
  )
}

export default QuickIngestModal
