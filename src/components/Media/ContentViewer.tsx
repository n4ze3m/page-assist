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
  StickyNote
} from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Select, Dropdown, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { AnalysisModal } from './AnalysisModal'
import { bgRequest } from '@/services/background-proxy'

interface Result {
  id: string | number
  title?: string
  kind: 'media' | 'note'
  snippet?: string
  keywords?: string[]
  meta?: {
    type?: string
    source?: string | null
    duration?: number | null
    status?: any
  }
  raw?: any
}

interface ContentViewerProps {
  selectedMedia: Result | null
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
  contentRef
}: ContentViewerProps) {
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

  // Sync editing keywords with selected media
  useEffect(() => {
    setEditingKeywords(selectedMedia?.keywords || [])
  }, [selectedMedia?.id, selectedMedia?.keywords])

  // Save keywords to API
  const handleSaveKeywords = async (newKeywords: string[]) => {
    if (!selectedMedia) return
    setSavingKeywords(true)
    try {
      await bgRequest({
        path: `/api/v1/media/${selectedMedia.id}` as any,
        method: 'PUT' as any,
        headers: { 'Content-Type': 'application/json' },
        body: { keywords: newKeywords }
      })
      setEditingKeywords(newKeywords)
      if (onKeywordsUpdated) {
        onKeywordsUpdated(selectedMedia.id, newKeywords)
      }
    } catch (err) {
      console.error('Failed to save keywords:', err)
    } finally {
      setSavingKeywords(false)
    }
  }

  // Extract analyses from media detail
  const existingAnalyses = React.useMemo(() => {
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

  const handleCopyContent = () => {
    if (content) {
      navigator.clipboard.writeText(content)
    }
  }

  const handleCopyMetadata = () => {
    if (selectedMedia) {
      const metadata = {
        id: selectedMedia.id,
        title: selectedMedia.title,
        type: selectedMedia.meta?.type,
        source: selectedMedia.meta?.source,
        duration: selectedMedia.meta?.duration
      }
      navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
    }
  }

  // Get the first/selected analysis for creating note with analysis
  const selectedAnalysis = existingAnalyses.length > 0 ? existingAnalyses[0] : null

  // Actions dropdown menu items
  const actionMenuItems: MenuProps['items'] = [
    ...(onChatWithMedia ? [{
      key: 'chat-with',
      label: 'Chat with this media',
      icon: <Send className="w-4 h-4" />,
      onClick: onChatWithMedia
    }] : []),
    ...(onChatAboutMedia ? [{
      key: 'chat-about',
      label: 'Chat about this media',
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: onChatAboutMedia
    }] : []),
    ...((onChatWithMedia || onChatAboutMedia) ? [{ type: 'divider' as const }] : []),
    ...(onCreateNoteWithContent ? [{
      key: 'create-note-content',
      label: 'Create note with content',
      icon: <StickyNote className="w-4 h-4" />,
      onClick: () => {
        const title = selectedMedia?.title || 'Untitled'
        onCreateNoteWithContent(content, title)
      }
    }] : []),
    ...(onCreateNoteWithContent && selectedAnalysis ? [{
      key: 'create-note-content-analysis',
      label: 'Create note with content + analysis',
      icon: <StickyNote className="w-4 h-4" />,
      onClick: () => {
        const title = selectedMedia?.title || 'Untitled'
        const noteContent = `${content}\n\n---\n\n## Analysis\n\n${selectedAnalysis.text}`
        onCreateNoteWithContent(noteContent, title)
      }
    }] : []),
    { type: 'divider' as const },
    {
      key: 'copy-content',
      label: 'Copy content',
      icon: <Copy className="w-4 h-4" />,
      onClick: handleCopyContent
    },
    {
      key: 'copy-metadata',
      label: 'Copy metadata',
      icon: <Copy className="w-4 h-4" />,
      onClick: handleCopyMetadata
    }
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
            No media item selected
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Select a media item from the left sidebar to view its content and
            analyses here.
          </p>
        </div>
      </div>
    )
  }

  // Use API-provided word count if available, otherwise calculate
  const wordCount = mediaDetail?.content?.word_count ||
    (content && content.trim() ? content.trim().split(/\s+/).filter(w => w.length > 0).length : 0)
  const charCount = content ? content.length : 0
  const paragraphCount = content && content.trim()
    ? content.split(/\n\n/).filter((p: string) => p.trim().length > 0).length
    : 0

  return (
    <div ref={contentRef} className="flex-1 flex flex-col bg-gray-50 dark:bg-[#101010]">
      {/* Compact Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111]">
        <div className="flex items-center gap-3">
          {/* Left: Navigation */}
          <div className="flex items-center gap-1">
            <Tooltip title="Previous">
              <button
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626] rounded disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Tooltip>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums min-w-[40px] text-center">
              {currentIndex + 1}/{totalResults}
            </span>
            <Tooltip title="Next">
              <button
                onClick={onNext}
                disabled={!hasNext}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#262626] rounded disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next"
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
              aria-label="Actions"
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
            {selectedMedia.meta?.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(selectedMedia.meta.duration)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
          </div>

          {/* Keywords - Compact */}
          <div className="mb-4">
            <Select
              mode="tags"
              allowClear
              placeholder="Add keywords..."
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
            <button
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Content</span>
              {collapsedSections.content ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {!collapsedSections.content && (
              <div className="p-3 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {content || 'No content available'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analysis */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c]">
              <button
                onClick={() => toggleSection('analysis')}
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#151515] -ml-1 px-1 rounded transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Analysis</span>
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
                  title="Generate new analysis"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate
                </button>
                {existingAnalyses.length > 0 && (
                  <button
                    onClick={() => navigator.clipboard.writeText(existingAnalyses[0].text)}
                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title="Copy analysis"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
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
                            onClick={() => navigator.clipboard.writeText(analysis.text)}
                            className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                    No analysis available for this media item
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            <button
              onClick={() => toggleSection('statistics')}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Statistics</span>
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
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Words</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {wordCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Characters</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {charCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Paragraphs</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {paragraphCount}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('metadata')}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#0c0c0c] hover:bg-gray-100 dark:hover:bg-[#151515] transition-colors"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Metadata</span>
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
                    <span className="text-gray-500 dark:text-gray-400 text-xs">ID</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                      {selectedMedia.id}
                    </span>
                  </div>
                  {selectedMedia.meta?.type && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Type</span>
                      <span className="text-gray-900 dark:text-gray-100 text-xs capitalize">
                        {selectedMedia.meta.type}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Title</span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs truncate max-w-[200px]">
                      {selectedMedia.title || 'N/A'}
                    </span>
                  </div>
                  {selectedMedia.meta?.source && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Source</span>
                      <span className="text-gray-900 dark:text-gray-100 text-xs truncate max-w-[200px]">
                        {selectedMedia.meta.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Generation Modal */}
      {selectedMedia && (
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
    </div>
  )
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
