import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  Sparkles,
  MoreHorizontal,
  MessageSquare,
  Clock,
  FileText,
  StickyNote,
  Edit3,
  ExternalLink,
  Expand,
  Minimize2
} from 'lucide-react'
import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react'
import { Select, Dropdown, Tooltip, message } from 'antd'
import { useTranslation } from 'react-i18next'
import type { MenuProps } from 'antd'
import { AnalysisModal } from './AnalysisModal'
import { AnalysisEditModal } from './AnalysisEditModal'
import { VersionHistoryPanel } from './VersionHistoryPanel'
import { DeveloperToolsSection } from './DeveloperToolsSection'
import { DiffViewModal } from './DiffViewModal'
import { bgRequest } from '@/services/background-proxy'
import type { MediaResultItem } from './types'

// Lazy load Markdown component
const Markdown = React.lazy(() => import('@/components/Common/Markdown'))

interface ContentViewerProps {
  selectedMedia: MediaResultItem | null
  content: string
  mediaDetail?: any
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  currentIndex?: number
  totalResults?: number
  onChatWithMedia?: () => void
  onChatAboutMedia?: () => void
  onRefreshMedia?: () => void
  onKeywordsUpdated?: (mediaId: string | number, keywords: string[]) => void
  onCreateNoteWithContent?: (content: string, title: string) => void
  onOpenInMultiReview?: () => void
  onSendAnalysisToChat?: (text: string) => void
  contentRef?: (node: HTMLDivElement | null) => void
}

export function ContentViewer({
  selectedMedia,
  content,
  mediaDetail,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  currentIndex = 0,
  totalResults = 0,
  onChatWithMedia,
  onChatAboutMedia,
  onRefreshMedia,
  onKeywordsUpdated,
  onCreateNoteWithContent,
  onOpenInMultiReview,
  onSendAnalysisToChat,
  contentRef
}: ContentViewerProps) {
  const { t } = useTranslation(['review'])
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    statistics: true,
    content: true,
    metadata: true,
    analysis: true
  })
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)
  const [editingKeywords, setEditingKeywords] = useState<string[]>([])
  const [savingKeywords, setSavingKeywords] = useState(false)
  const saveKeywordsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // New state for enhanced features
  const [contentExpanded, setContentExpanded] = useState(true)
  const [analysisEditModalOpen, setAnalysisEditModalOpen] = useState(false)
  const [editingAnalysisText, setEditingAnalysisText] = useState('')
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [diffLeftText, setDiffLeftText] = useState('')
  const [diffRightText, setDiffRightText] = useState('')
  const [diffLeftLabel, setDiffLeftLabel] = useState('')
  const [diffRightLabel, setDiffRightLabel] = useState('')

  // Content length threshold for collapse (2500 chars)
  const CONTENT_COLLAPSE_THRESHOLD = 2500
  const shouldShowExpandToggle = content && content.length > CONTENT_COLLAPSE_THRESHOLD

  // Sync editing keywords with selected media
  useEffect(() => {
    if (saveKeywordsTimeout.current) {
      clearTimeout(saveKeywordsTimeout.current)
      saveKeywordsTimeout.current = null
    }
    setEditingKeywords(selectedMedia?.keywords || [])
  }, [selectedMedia?.id, selectedMedia?.keywords])

  // Save keywords to API (debounced)
  const persistKeywords = useCallback(
    async (newKeywords: string[]) => {
      if (!selectedMedia) return
      setSavingKeywords(true)
      try {
        const endpoint =
          selectedMedia.kind === 'note'
            ? `/api/v1/notes/${selectedMedia.id}`
            : `/api/v1/media/${selectedMedia.id}`

        await bgRequest({
          path: endpoint as any,
          method: 'PUT' as any,
          headers: { 'Content-Type': 'application/json' },
          body: { keywords: newKeywords }
        })
        setEditingKeywords(newKeywords)
        if (onKeywordsUpdated) {
          onKeywordsUpdated(selectedMedia.id, newKeywords)
        }
        message.success(
          t('review:mediaPage.keywordsSaved', {
            defaultValue: 'Keywords saved'
          })
        )
      } catch (err) {
        console.error('Failed to save keywords:', err)
        message.error(
          t('review:mediaPage.keywordsSaveFailed', {
            defaultValue: 'Failed to save keywords'
          })
        )
      } finally {
        setSavingKeywords(false)
      }
    },
    [selectedMedia, onKeywordsUpdated]
  )

  const handleSaveKeywords = (newKeywords: string[]) => {
    setEditingKeywords(newKeywords)
    if (saveKeywordsTimeout.current) {
      clearTimeout(saveKeywordsTimeout.current)
    }
    saveKeywordsTimeout.current = setTimeout(() => {
      persistKeywords(newKeywords)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (saveKeywordsTimeout.current) {
        clearTimeout(saveKeywordsTimeout.current)
      }
    }
  }, [])

  // Extract analyses from media detail
  const existingAnalyses = useMemo(() => {
    if (!mediaDetail) return []
    const analyses: Array<{ type: string; text: string }> = []

    // Check processing.analysis (tldw API structure)
    if (mediaDetail.processing?.analysis && typeof mediaDetail.processing.analysis === 'string' && mediaDetail.processing.analysis.trim()) {
      analyses.push({ type: 'Analysis', text: mediaDetail.processing.analysis })
    }

    // Check for summary field (root level)
    if (mediaDetail.summary && typeof mediaDetail.summary === 'string' && mediaDetail.summary.trim()) {
      analyses.push({ type: 'Summary', text: mediaDetail.summary })
    }

    // Check for analysis field (root level)
    if (mediaDetail.analysis && typeof mediaDetail.analysis === 'string' && mediaDetail.analysis.trim()) {
      analyses.push({ type: 'Analysis', text: mediaDetail.analysis })
    }

    // Check for analyses array
    if (Array.isArray(mediaDetail.analyses)) {
      mediaDetail.analyses.forEach((a: any, idx: number) => {
        const text = typeof a === 'string' ? a : (a?.content || a?.text || a?.summary || a?.analysis_content || '')
        const type = typeof a === 'object' && a?.type ? a.type : `Analysis ${idx + 1}`
        if (text && text.trim()) {
          analyses.push({ type, text })
        }
      })
    }

    // Check versions array for analysis_content
    if (Array.isArray(mediaDetail.versions)) {
      mediaDetail.versions.forEach((v: any, idx: number) => {
        if (v?.analysis_content && typeof v.analysis_content === 'string' && v.analysis_content.trim()) {
          const versionNum = v?.version_number || idx + 1
          analyses.push({ type: `Analysis (Version ${versionNum})`, text: v.analysis_content })
        }
      })
    }

    return analyses
  }, [mediaDetail])

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const copyTextWithToasts = async (
    text: string,
    successKey: string,
    defaultSuccess: string
  ) => {
    if (!text) return
    if (!navigator.clipboard?.writeText) {
      message.error(
        t('mediaPage.copyNotSupported', 'Copy is not supported here')
      )
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      message.success(t(successKey, { defaultValue: defaultSuccess }))
    } catch (err) {
      console.error('Failed to copy text:', err)
      message.error(t('mediaPage.copyFailed', 'Failed to copy'))
    }
  }

  const handleCopyContent = () => {
    if (!content) return
    copyTextWithToasts(content, 'mediaPage.contentCopied', 'Content copied')
  }

  const handleCopyMetadata = () => {
    if (!selectedMedia) return
    const metadata = {
      id: selectedMedia.id,
      title: selectedMedia.title,
      type: selectedMedia.meta?.type,
      source: selectedMedia.meta?.source,
      duration: selectedMedia.meta?.duration
    }
    copyTextWithToasts(
      JSON.stringify(metadata, null, 2),
      'mediaPage.metadataCopied',
      'Metadata copied'
    )
  }

  // Get the first/selected analysis for creating note with analysis
  const selectedAnalysis = existingAnalyses.length > 0 ? existingAnalyses[0] : null

  // Check if viewing a note vs media
  const isNote = selectedMedia?.kind === 'note'

  // Actions dropdown menu items
  const actionMenuItems: MenuProps['items'] = [
    // Chat actions - only for media
    ...(!isNote && onChatWithMedia ? [{
      key: 'chat-with',
      label: t('review:reviewPage.chatWithMedia', {
        defaultValue: 'Chat with this media'
      }),
      icon: <Send className="w-4 h-4" />,
      onClick: onChatWithMedia
    }] : []),
    ...(!isNote && onChatAboutMedia ? [{
      key: 'chat-about',
      label: t('review:reviewPage.chatAboutMedia', {
        defaultValue: 'Chat about this media'
      }),
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: onChatAboutMedia
    }] : []),
    ...(!isNote && (onChatWithMedia || onChatAboutMedia) ? [{ type: 'divider' as const }] : []),
    // Create note actions - only for media
    ...(!isNote && onCreateNoteWithContent ? [{
      key: 'create-note-content',
      label: t('review:mediaPage.createNoteWithContent', {
        defaultValue: 'Create note with content'
      }),
      icon: <StickyNote className="w-4 h-4" />,
      onClick: () => {
        const title = selectedMedia?.title || t('review:mediaPage.untitled', { defaultValue: 'Untitled' })
        onCreateNoteWithContent(content, title)
      }
    }] : []),
    ...(!isNote && onCreateNoteWithContent && selectedAnalysis ? [{
      key: 'create-note-content-analysis',
      label: t('review:mediaPage.createNoteWithContentAnalysis', {
        defaultValue: 'Create note with content + analysis'
      }),
      icon: <StickyNote className="w-4 h-4" />,
      onClick: () => {
        const title = selectedMedia?.title || t('review:mediaPage.untitled', { defaultValue: 'Untitled' })
        const noteContent = `${content}\n\n---\n\n## Analysis\n\n${selectedAnalysis.text}`
        onCreateNoteWithContent(noteContent, title)
      }
    }] : []),
    ...(!isNote && onCreateNoteWithContent ? [{ type: 'divider' as const }] : []),
    {
      key: 'copy-content',
      label: t('review:mediaPage.copyContent', { defaultValue: 'Copy content' }),
      icon: <Copy className="w-4 h-4" />,
      onClick: handleCopyContent
    },
    {
      key: 'copy-metadata',
      label: t('review:mediaPage.copyMetadata', { defaultValue: 'Copy metadata' }),
      icon: <Copy className="w-4 h-4" />,
      onClick: handleCopyMetadata
    },
    // Multi-item review - only for media
    ...(!isNote && onOpenInMultiReview ? [
      { type: 'divider' as const },
      {
        key: 'open-multi-review',
        label: t('review:reviewPage.openInMulti', 'Open in Multi-Item Review'),
        icon: <ExternalLink className="w-4 h-4" />,
        onClick: onOpenInMultiReview
      }
    ] : [])
  ]

  if (!selectedMedia) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#101010]">
        <div className="text-center max-w-md px-6">
          <div className="mb-6 flex justify-center">
            <div className="w-48 h-48 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <FileSearch className="w-24 h-24 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <h2 className="text-gray-900 dark:text-gray-100 mb-2 text-xl font-semibold">
            {t('review:mediaPage.noSelectionTitle', {
              defaultValue: 'No media item selected'
            })}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('review:mediaPage.noSelectionDescription', {
              defaultValue:
                'Select a media item from the left sidebar to view its content and analyses here.'
            })}
          </p>
        </div>
      </div>
    )
  }

  // Use API-provided word count if available, otherwise calculate
  const { wordCount, charCount, paragraphCount } = useMemo(() => {
    const text = content || ''
    const apiWordCount = mediaDetail?.content?.word_count
    const wordCountValue =
      typeof apiWordCount === 'number'
        ? apiWordCount
        : text.trim()
          ? text.trim().split(/\s+/).filter((w) => w.length > 0).length
          : 0
    const charCountValue = text.length
    const paragraphCountValue = text.trim()
      ? text.split(/\n\n/).filter((p: string) => p.trim().length > 0).length
      : 0
    return {
      wordCount: wordCountValue,
      charCount: charCountValue,
      paragraphCount: paragraphCountValue
    }
  }, [content, mediaDetail])

  return (
    <div ref={contentRef} className="flex-1 flex flex-col bg-gray-50 dark:bg-[#101010]">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111]">
        <div className="flex items-center gap-3">
          {/* Left: Navigation */}
          <div className="flex items-center gap-1">
            <Tooltip
              title={t('review:reviewPage.prevItem', { defaultValue: 'Previous' })}
            >
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626] rounded disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('review:reviewPage.prevItem', { defaultValue: 'Previous' })}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Tooltip>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums min-w-[40px] text-center">
              {currentIndex + 1}/{totalResults}
            </span>
            <Tooltip
              title={t('review:reviewPage.nextItem', { defaultValue: 'Next' })}
            >
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626] rounded disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={t('review:reviewPage.nextItem', { defaultValue: 'Next' })}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          {/* Center: Title */}
          <Tooltip title={selectedMedia.title || ''} placement="bottom">
            <h3 className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate text-center px-2">
              {selectedMedia.title || `${selectedMedia.kind} ${selectedMedia.id}`}
            </h3>
          </Tooltip>

          {/* Right: Actions Dropdown */}
          <Dropdown
            menu={{ items: actionMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626] rounded"
              aria-label={t('review:mediaPage.actionsLabel', {
                defaultValue: 'Actions'
              })}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Meta Row */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400 mb-3">
            {selectedMedia.meta?.type && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize font-medium">
                {selectedMedia.meta.type}
              </span>
            )}
            {selectedMedia.meta?.source && (
              <span className="truncate max-w-[200px]" title={selectedMedia.meta.source}>
                {selectedMedia.meta.source}
              </span>
            )}
            {(() => {
              const rawDuration = selectedMedia.meta?.duration as
                | number
                | string
                | null
                | undefined
              const durationSeconds =
                typeof rawDuration === 'number'
                  ? rawDuration
                  : typeof rawDuration === 'string'
                    ? Number(rawDuration)
                    : null
              const durationLabel = formatDuration(durationSeconds)
              if (!durationLabel) return null
              return (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {durationLabel}
                </span>
              )
            })()}
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()} {t('review:mediaPage.words', { defaultValue: 'words' })}
            </span>
          </div>

          {/* Keywords - Compact */}
          <div className="mb-4">
            <Select
              mode="tags"
              allowClear
              placeholder={t('review:mediaPage.keywordsPlaceholder', {
                defaultValue: 'Add keywords...'
              })}
              className="w-full"
              size="small"
              value={editingKeywords}
              onChange={(vals) => {
                handleSaveKeywords(vals as string[])
              }}
              loading={savingKeywords}
              disabled={savingKeywords}
              tokenSeparators={[',']}
            />
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c]">
              <button
                onClick={() => toggleSection('content')}
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#151515] -ml-1 px-1 rounded transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('review:mediaPage.content', { defaultValue: 'Content' })}
                </span>
                {collapsedSections.content ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {/* Expand/collapse toggle for long content */}
              {!collapsedSections.content && shouldShowExpandToggle && (
                  <button
                    onClick={() => setContentExpanded(v => !v)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title={
                      contentExpanded
                        ? t('review:mediaPage.collapse', { defaultValue: 'Collapse' })
                        : t('review:mediaPage.expand', { defaultValue: 'Expand' })
                    }
                  >
                    {contentExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Expand className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            {!collapsedSections.content && (
              <div className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
                <div
                  className={`prose prose-slate dark:prose-invert max-w-none ${
                    !contentExpanded && shouldShowExpandToggle ? 'max-h-64 overflow-hidden relative' : ''
                  }`}
                >
                  <Suspense fallback={
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {content || t('review:mediaPage.noContent', { defaultValue: 'No content available' })}
                    </div>
                  }>
                    <Markdown
                      message={content || t('review:mediaPage.noContent', { defaultValue: 'No content available' })}
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose-p:leading-relaxed prose-pre:p-0"
                    />
                  </Suspense>
                  {/* Fade overlay when collapsed */}
                  {!contentExpanded && shouldShowExpandToggle && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-[#171717] to-transparent" />
                  )}
                </div>
                {/* Show more/less button */}
                {shouldShowExpandToggle && (
                  <button
                    onClick={() => setContentExpanded(v => !v)}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {contentExpanded
                      ? t('review:mediaPage.showLess', { defaultValue: 'Show less' })
                      : t('review:mediaPage.showMore', {
                          defaultValue: `Show more (${Math.round(content.length / 1000)}k chars)`
                        })}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Analysis - only for media, not notes */}
          {!isNote && (
            <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c]">
              <button
                onClick={() => toggleSection('analysis')}
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#151515] -ml-1 px-1 rounded transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('review:reviewPage.analysisTitle', { defaultValue: 'Analysis' })}
                </span>
                  {collapsedSections.analysis ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnalysisModalOpen(true)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                  title={t('review:mediaPage.generateAnalysisHint', {
                    defaultValue: 'Generate new analysis'
                  })}
                >
                  <Sparkles className="w-3 h-3" />
                  {t('review:mediaPage.generateAnalysis', { defaultValue: 'Generate' })}
                </button>
                  {existingAnalyses.length > 0 && (
                    <>
                      {/* Edit analysis button */}
                      <button
                        onClick={() => {
                          setEditingAnalysisText(existingAnalyses[0].text)
                          setAnalysisEditModalOpen(true)
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title={t('review:mediaPage.editAnalysis', { defaultValue: 'Edit analysis' })}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {/* Send to chat button */}
                      {onSendAnalysisToChat && (
                        <button
                          onClick={() => onSendAnalysisToChat(existingAnalyses[0].text)}
                          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          title={t('review:reviewPage.sendAnalysisToChat', {
                            defaultValue: 'Send analysis to chat'
                          })}
                        >
                          <Send className="w-3.5 h-3.5" />
                          </button>
                      )}
                      {/* Copy analysis button */}
                      <button
                        onClick={() =>
                          copyTextWithToasts(
                            existingAnalyses[0].text,
                            'mediaPage.analysisCopied',
                            'Analysis copied'
                          )
                        }
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title={t('review:reviewPage.copyAnalysis', { defaultValue: 'Copy analysis' })}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!collapsedSections.analysis && (
                <div className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
                  {existingAnalyses.length > 0 ? (
                    <div className="space-y-3">
                    {existingAnalyses.map((analysis, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {analysis.type}
                          </span>
                          <button
                            onClick={() =>
                              copyTextWithToasts(
                                analysis.text,
                                'mediaPage.analysisCopied',
                                'Analysis copied'
                              )
                            }
                          className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                              aria-label={t('review:mediaPage.copyAnalysis', {
                                defaultValue: 'Copy analysis to clipboard'
                              })}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {analysis.text}
                          </div>
                          {idx < existingAnalyses.length - 1 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3" />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      {t('review:reviewPage.noAnalysis', {
                        defaultValue: 'No analysis yet'
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Statistics */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            <button
              onClick={() => toggleSection('statistics')}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('review:mediaPage.statistics', { defaultValue: 'Statistics' })}
              </span>
              {collapsedSections.statistics ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {!collapsedSections.statistics && (
              <div className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {t('review:mediaPage.words', { defaultValue: 'Words' })}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {wordCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {t('review:mediaPage.characters', { defaultValue: 'Characters' })}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {charCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {t('review:mediaPage.paragraphs', { defaultValue: 'Paragraphs' })}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {paragraphCount}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            <button
              onClick={() => toggleSection('metadata')}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('review:mediaPage.metadata', { defaultValue: 'Metadata' })}
              </span>
              {collapsedSections.metadata ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {!collapsedSections.metadata && (
              <div className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {t('review:mediaPage.idLabel', { defaultValue: 'ID' })}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                      {selectedMedia.id}
                    </span>
                  </div>
                  {selectedMedia.meta?.type && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {t('review:mediaPage.typeLabel', { defaultValue: 'Type' })}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 text-xs capitalize">
                        {selectedMedia.meta.type}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {t('review:mediaPage.titleLabel', { defaultValue: 'Title' })}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs truncate max-w-[200px]">
                      {selectedMedia.title || t('review:mediaPage.notAvailable', { defaultValue: 'N/A' })}
                    </span>
                  </div>
                  {selectedMedia.meta?.source && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {t('review:mediaPage.source', { defaultValue: 'Source' })}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100 text-xs truncate max-w-[200px]">
                        {selectedMedia.meta.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Version History - only for media */}
          {!isNote && (
            <div className="mb-2">
              <VersionHistoryPanel
                mediaId={selectedMedia.id}
                onVersionLoad={(vContent, vAnalysis, vPrompt, vNum) => {
                  // Update the analysis edit text with the loaded version
                  if (vAnalysis) {
                    setEditingAnalysisText(vAnalysis)
                    setAnalysisEditModalOpen(true)
                  }
                }}
                onRefresh={onRefreshMedia}
                onShowDiff={(left, right, leftLabel, rightLabel) => {
                  setDiffLeftText(left)
                  setDiffRightText(right)
                  setDiffLeftLabel(leftLabel)
                  setDiffRightLabel(rightLabel)
                  setDiffModalOpen(true)
                }}
              />
            </div>
          )}

          {/* Developer Tools */}
          <DeveloperToolsSection
            data={mediaDetail}
            label={t('review:mediaPage.developerTools', { defaultValue: 'Developer Tools' })}
          />
        </div>
      </div>

      {/* Analysis Generation Modal - only for media */}
      {selectedMedia && !isNote && (
        <AnalysisModal
          open={analysisModalOpen}
          onClose={() => setAnalysisModalOpen(false)}
          mediaId={selectedMedia.id}
          mediaContent={content}
          onAnalysisGenerated={() => {
            if (onRefreshMedia) {
              onRefreshMedia()
            }
          }}
        />
      )}

      {/* Analysis Edit Modal */}
      <AnalysisEditModal
        open={analysisEditModalOpen}
        onClose={() => setAnalysisEditModalOpen(false)}
        initialText={editingAnalysisText}
        mediaId={selectedMedia?.id}
        onSendToChat={onSendAnalysisToChat}
        onSaveNewVersion={() => {
          if (onRefreshMedia) {
            onRefreshMedia()
          }
        }}
      />

      {/* Diff View Modal */}
      <DiffViewModal
        open={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        leftText={diffLeftText}
        rightText={diffRightText}
        leftLabel={diffLeftLabel}
        rightLabel={diffRightLabel}
      />
    </div>
  )
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(Number(seconds))) return null
  const total = Math.max(0, Math.floor(Number(seconds)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
