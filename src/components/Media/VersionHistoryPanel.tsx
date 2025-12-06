import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  History,
  Copy,
  FileText,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Loader2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dropdown, message, Checkbox } from 'antd'
import type { MenuProps } from 'antd'
import { bgRequest } from '@/services/background-proxy'
import { useConfirmDanger } from '@/components/Common/confirm-danger'

interface VersionHistoryPanelProps {
  mediaId: string | number
  onVersionLoad?: (content: string, analysis: string, prompt: string, versionNumber: number) => void
  onRefresh?: () => void
  onShowDiff?: (leftText: string, rightText: string, leftLabel: string, rightLabel: string) => void
  currentVersionNumber?: number
  defaultExpanded?: boolean
}

interface Version {
  version_number?: number
  version?: number
  analysis_content?: string
  analysis?: string
  prompt?: string
  content?: string
  created_at?: string
  updated_at?: string
  timestamp?: string
}

export function VersionHistoryPanel({
  mediaId,
  onVersionLoad,
  onRefresh,
  onShowDiff,
  currentVersionNumber,
  defaultExpanded = false
}: VersionHistoryPanelProps) {
  const { t } = useTranslation(['review'])
  const confirmDanger = useConfirmDanger()

  const [expanded, setExpanded] = useState(defaultExpanded)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [onlyWithAnalysis, setOnlyWithAnalysis] = useState(false)
  const [page, setPage] = useState(1)
  const selectedIndexRef = useRef(selectedIndex)
  const pageSize = 10

  // Helper functions
  const getVersionNumber = (v: Version): number | undefined =>
    typeof v?.version_number === 'number' ? v.version_number :
    (typeof v?.version === 'number' ? v.version : undefined)

  const getVersionAnalysis = (v: Version): string =>
    String(v?.analysis_content || v?.analysis || '')

  const getVersionPrompt = (v: Version): string =>
    String(v?.prompt || '')

  const getVersionTimestamp = (v: Version): string =>
    String(v?.created_at || v?.updated_at || v?.timestamp || '')

  const formatTimestamp = (ts: string): string => {
    if (!ts) return ''
    try {
      const d = new Date(ts)
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ts
    }
  }

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  // Load versions
  const loadVersions = useCallback(async () => {
    if (!mediaId) return
    setLoading(true)
    try {
      const data = await bgRequest<any>({
        path: `/api/v1/media/${mediaId}/versions?include_content=false&limit=50&page=1` as any,
        method: 'GET' as any
      })
      const arr = Array.isArray(data) ? data : (data?.items || [])
      setVersions(arr)
      if (arr.length > 0 && selectedIndexRef.current < 0) {
        setSelectedIndex(0)
      }
    } catch (err) {
      console.error('Failed to load versions:', err)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [mediaId])

  useEffect(() => {
    if (expanded && mediaId) {
      loadVersions()
    }
  }, [expanded, mediaId, loadVersions])

  // Filter versions
  const filteredVersions = onlyWithAnalysis
    ? versions.filter(v => getVersionAnalysis(v).trim().length > 0)
    : versions

  // Paginate
  const totalPages = Math.ceil(filteredVersions.length / pageSize)
  const paginatedVersions = filteredVersions.slice((page - 1) * pageSize, page * pageSize)

  // Load version with content
  const handleLoadVersion = async (v: Version) => {
    const vNum = getVersionNumber(v)
    if (vNum === undefined) return

    try {
      const data = await bgRequest<any>({
        path: `/api/v1/media/${mediaId}/versions/${vNum}?include_content=true` as any,
        method: 'GET' as any
      })
      const content = String(data?.content || data?.raw_content || '')
      const analysis = String(data?.analysis_content || data?.analysis || '')
      const prompt = String(data?.prompt || '')

      if (onVersionLoad) {
        onVersionLoad(content, analysis, prompt, vNum)
      }
      message.success(t('mediaPage.versionLoaded', 'Version loaded'))
    } catch (err) {
      console.error('Failed to load version:', err)
      message.error(t('mediaPage.loadFailed', 'Failed to load version'))
    }
  }

  // Rollback to version
  const handleRollback = async (v: Version) => {
    const vNum = getVersionNumber(v)
    if (vNum === undefined) return

    const ok = await confirmDanger({
      title: t('mediaPage.confirmRollback', 'Rollback to this version?'),
      content: t('mediaPage.rollbackWarning', 'This will restore version {{num}} as the current version.', { num: vNum }),
      okText: t('mediaPage.rollback', 'Rollback'),
      cancelText: t('common:cancel', 'Cancel')
    })
    if (!ok) return

    try {
      await bgRequest<any>({
        path: `/api/v1/media/${mediaId}/versions/rollback` as any,
        method: 'POST' as any,
        headers: { 'Content-Type': 'application/json' },
        body: { version_number: vNum }
      })
      message.success(t('mediaPage.rollbackSuccess', 'Rolled back to version {{num}}', { num: vNum }))
      loadVersions()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Rollback failed:', err)
      message.error(t('mediaPage.rollbackFailed', 'Failed to rollback'))
    }
  }

  // Delete version
  const handleDeleteVersion = async (v: Version) => {
    const vNum = getVersionNumber(v)
    if (vNum === undefined) return

    const ok = await confirmDanger({
      title: t('mediaPage.confirmDelete', 'Delete this version?'),
      content: t('mediaPage.deleteWarning', 'This will permanently delete version {{num}}.', { num: vNum }),
      okText: t('common:delete', 'Delete'),
      cancelText: t('common:cancel', 'Cancel')
    })
    if (!ok) return

    try {
      await bgRequest<any>({
        path: `/api/v1/media/${mediaId}/versions/${vNum}` as any,
        method: 'DELETE' as any
      })
      message.success(t('mediaPage.versionDeleted', 'Version deleted'))
      loadVersions()
    } catch (err) {
      console.error('Delete failed:', err)
      message.error(t('mediaPage.deleteFailed', 'Failed to delete version'))
    }
  }

  // Copy all analyses
  const handleCopyAll = () => {
    const texts = filteredVersions
      .map(v => {
        const num = getVersionNumber(v)
        const analysis = getVersionAnalysis(v)
        return analysis ? `[Version ${num}]\n${analysis}` : null
      })
      .filter(Boolean)
      .join('\n\n---\n\n')

    if (texts) {
      navigator.clipboard.writeText(texts)
        .then(() => message.success(t('mediaPage.allCopied', 'All analyses copied')))
        .catch(() => message.error(t('mediaPage.copyFailed', 'Copy failed')))
    } else {
      message.info(t('mediaPage.nothingToCopy', 'No analyses to copy'))
    }
  }

  // Copy as markdown
  const handleCopyMd = () => {
    const md = filteredVersions
      .map(v => {
        const num = getVersionNumber(v)
        const analysis = getVersionAnalysis(v)
        const ts = formatTimestamp(getVersionTimestamp(v))
        return analysis ? `## Version ${num}${ts ? ` (${ts})` : ''}\n\n${analysis}` : null
      })
      .filter(Boolean)
      .join('\n\n---\n\n')

    if (md) {
      navigator.clipboard.writeText(md)
        .then(() => message.success(t('mediaPage.markdownCopied', 'Copied as markdown')))
        .catch(() => message.error(t('mediaPage.copyFailed', 'Copy failed')))
    } else {
      message.info(t('mediaPage.nothingToCopy', 'No analyses to copy'))
    }
  }

  // Show diff between selected and another version
  const handleShowDiff = (v: Version) => {
    if (!onShowDiff || selectedIndex < 0) return
    const selectedV = filteredVersions[selectedIndex]
    if (!selectedV) return

    const leftNum = getVersionNumber(selectedV)
    const rightNum = getVersionNumber(v)
    const leftText = getVersionAnalysis(selectedV)
    const rightText = getVersionAnalysis(v)

    onShowDiff(
      leftText,
      rightText,
      `Version ${leftNum}`,
      `Version ${rightNum}`
    )
  }

  const getVersionMenuItems = (v: Version, idx: number): MenuProps['items'] => [
    {
      key: 'load',
      label: t('mediaPage.loadVersion', 'Load into editor'),
      icon: <FileText className="w-4 h-4" />,
      onClick: () => handleLoadVersion(v)
    },
    ...(onShowDiff && selectedIndex >= 0 && selectedIndex !== idx ? [{
      key: 'diff',
      label: t('mediaPage.showDiff', 'Compare with selected'),
      onClick: () => handleShowDiff(v)
    }] : []),
    { type: 'divider' as const },
    {
      key: 'rollback',
      label: t('mediaPage.rollbackVersion', 'Rollback to this version'),
      icon: <RotateCcw className="w-4 h-4" />,
      onClick: () => handleRollback(v)
    },
    {
      key: 'delete',
      label: t('mediaPage.deleteVersion', 'Delete version'),
      icon: <Trash2 className="w-4 h-4" />,
      danger: true,
      onClick: () => handleDeleteVersion(v)
    }
  ]

  return (
    <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('mediaPage.versionHistory', 'Version History')}
          </span>
          {versions.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({versions.length})
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : versions.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {t('mediaPage.noVersions', 'No versions available')}
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3">
                <Checkbox
                  checked={onlyWithAnalysis}
                  onChange={e => {
                    setOnlyWithAnalysis(e.target.checked)
                    setPage(1)
                  }}
                >
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {t('mediaPage.onlyWithAnalysis', 'Only with analysis')}
                  </span>
                </Checkbox>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyAll}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title={t('mediaPage.copyAll', 'Copy All')}
                  >
                    {t('mediaPage.copyAllShort', 'Copy All')}
                  </button>
                  <button
                    onClick={handleCopyMd}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title={t('mediaPage.copyMd', 'Copy as Markdown')}
                  >
                    {t('mediaPage.copyMdShort', 'Copy MD')}
                  </button>
                </div>
              </div>

              {/* Version List */}
              <div className="space-y-2">
                {paginatedVersions.map((v, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx
                  const vNum = getVersionNumber(v)
                  const analysis = getVersionAnalysis(v)
                  const timestamp = formatTimestamp(getVersionTimestamp(v))
                  const isCurrent = vNum === currentVersionNumber
                  const isSelected = globalIdx === selectedIndex

                  return (
                    <div
                      key={vNum || idx}
                      onClick={() => setSelectedIndex(globalIdx)}
                      className={`p-2 rounded border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            v{vNum}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                              {t('mediaPage.currentVersion', 'Current')}
                            </span>
                          )}
                          {analysis && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                              {t('mediaPage.hasAnalysis', 'Has analysis')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {timestamp && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {timestamp}
                            </span>
                          )}
                          <Dropdown
                            menu={{ items: getVersionMenuItems(v, globalIdx) }}
                            trigger={['click']}
                            placement="bottomRight"
                          >
                            <button
                              onClick={e => e.stopPropagation()}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </Dropdown>
                        </div>
                      </div>
                      {analysis && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {analysis.substring(0, 150)}
                          {analysis.length > 150 && '...'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('mediaPage.pageOf', 'Page {{current}} of {{total}}', { current: page, total: totalPages })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
