import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  Sparkles
} from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { Select } from 'antd'
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
  contentRef
}: ContentViewerProps) {
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    statistics: false,
    content: false,
    metadata: false,
    analysis: false
  })
  const [showMoreActions, setShowMoreActions] = useState(false)
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)
  const [editingKeywords, setEditingKeywords] = useState<string[]>([])
  const [savingKeywords, setSavingKeywords] = useState(false)
  const moreActionsRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreActionsRef.current &&
        !moreActionsRef.current.contains(event.target as Node)
      ) {
        setShowMoreActions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleCopyContent = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      setShowMoreActions(false)
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
      setShowMoreActions(false)
    }
  }

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
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <h2 className="text-gray-900 dark:text-gray-100">Review Controls</h2>
            {totalResults > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentIndex + 1} / {totalResults}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h3 className="text-gray-900 dark:text-gray-100 mb-2 text-2xl font-semibold">
              {selectedMedia.title || `${selectedMedia.kind} ${selectedMedia.id}`}
            </h3>
            {/* Keywords - Editable */}
            <div className="mb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Keywords</div>
              <Select
                mode="tags"
                allowClear
                placeholder="Add keywords..."
                className="w-full max-w-md"
                value={editingKeywords}
                onChange={(vals) => {
                  handleSaveKeywords(vals as string[])
                }}
                loading={savingKeywords}
                disabled={savingKeywords}
                tokenSeparators={[',']}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Keywords help you find this media using the keyword filter on the left.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedMedia.meta?.type && (
                <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                  {selectedMedia.meta.type}
                </span>
              )}
              {selectedMedia.meta?.source && (
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  Source: {selectedMedia.meta.source}
                </span>
              )}
              {selectedMedia.meta?.duration && (
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  Duration: {formatDuration(selectedMedia.meta.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Ask the assistant */}
          {(onChatWithMedia || onChatAboutMedia) && (
            <div className="mb-6">
              <h4 className="text-gray-600 dark:text-gray-400 mb-3 text-sm">Ask the assistant</h4>
              <div className="flex gap-3">
                {onChatWithMedia && (
                  <button
                    onClick={onChatWithMedia}
                    className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    Chat with this media
                  </button>
                )}
                {onChatAboutMedia && (
                  <button
                    onClick={onChatAboutMedia}
                    className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Chat about this media
                  </button>
                )}
                <div className="relative" ref={moreActionsRef}>
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium min-w-[160px]"
                  >
                    More actions
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showMoreActions && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#171717] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                      <button
                        onClick={handleCopyContent}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#262626] flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy content
                      </button>
                      <button
                        onClick={handleCopyMetadata}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#262626] flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy metadata
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content Statistics */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0c0c0c]">
              <h4 className="text-gray-900 dark:text-gray-100 font-medium">Document Statistics</h4>
              <button
                onClick={() => toggleSection('statistics')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
              >
                {collapsedSections.statistics ? (
                  <>
                    Expand
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </>
                ) : (
                  <>
                    Collapse
                    <ChevronUp className="w-4 h-4 transition-transform" />
                  </>
                )}
              </button>
            </div>
            {!collapsedSections.statistics && (
              <div className="p-4 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-600 dark:text-gray-400">Word Count</span>
                    <span className="text-gray-900 dark:text-gray-100 mt-1 font-medium">
                      {wordCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-600 dark:text-gray-400">Characters</span>
                    <span className="text-gray-900 dark:text-gray-100 mt-1 font-medium">
                      {charCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-600 dark:text-gray-400">Paragraphs</span>
                    <span className="text-gray-900 dark:text-gray-100 mt-1 font-medium">
                      {paragraphCount}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0c0c0c]">
              <h4 className="text-gray-900 dark:text-gray-100 font-medium">Content</h4>
              <button
                onClick={() => toggleSection('content')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
              >
                {collapsedSections.content ? (
                  <>
                    Expand
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </>
                ) : (
                  <>
                    Collapse
                    <ChevronUp className="w-4 h-4 transition-transform" />
                  </>
                )}
              </button>
            </div>
            {!collapsedSections.content && (
              <div className="p-4 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {content || 'No content available'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analysis */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg mb-4 overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0c0c0c]">
              <h4 className="text-gray-900 dark:text-gray-100 font-medium">Analysis</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnalysisModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Generate new analysis"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate
                </button>
                <button
                  onClick={() => toggleSection('analysis')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
                >
                  {collapsedSections.analysis ? (
                    <>
                      Expand
                      <ChevronDown className="w-4 h-4 transition-transform" />
                    </>
                  ) : (
                    <>
                      Collapse
                      <ChevronUp className="w-4 h-4 transition-transform" />
                    </>
                  )}
                </button>
                {existingAnalyses.length > 0 && (
                  <button
                    onClick={() => {
                      if (existingAnalyses.length > 0) {
                        navigator.clipboard.writeText(existingAnalyses[0].text)
                      }
                    }}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {!collapsedSections.analysis && (
              <div className="p-4 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-2 duration-200">
                {existingAnalyses.length > 0 ? (
                  <div className="space-y-4">
                    {existingAnalyses.map((analysis, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {analysis.type}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(analysis.text)}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {analysis.text}
                        </div>
                        {idx < existingAnalyses.length - 1 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    No analysis available for this media item
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-[#171717] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0c0c0c]">
              <h4 className="text-gray-900 dark:text-gray-100 font-medium">Metadata</h4>
              <button
                onClick={() => toggleSection('metadata')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center gap-1 transition-colors"
              >
                {collapsedSections.metadata ? (
                  <>
                    Expand
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  </>
                ) : (
                  <>
                    Collapse
                    <ChevronUp className="w-4 h-4 transition-transform" />
                  </>
                )}
              </button>
            </div>
            {!collapsedSections.metadata && (
              <div className="p-4 bg-white dark:bg-[#171717] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">ID:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                      {selectedMedia.id}
                    </span>
                  </div>
                  {selectedMedia.meta?.type && (
                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="text-gray-900 dark:text-gray-100 capitalize">
                        {selectedMedia.meta.type}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Title:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {selectedMedia.title || 'N/A'}
                    </span>
                  </div>
                  {selectedMedia.meta?.source && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 dark:text-gray-400">Source:</span>
                      <span className="text-gray-900 dark:text-gray-100">
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
