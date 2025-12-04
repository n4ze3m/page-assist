import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  MoreVertical
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Result {
  id: string | number
  title?: string
  kind: 'media' | 'note'
  snippet?: string
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
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  currentIndex?: number
  totalResults?: number
  onChatWithMedia?: () => void
  onChatAboutMedia?: () => void
}

export function ContentViewer({
  selectedMedia,
  content,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  currentIndex = 0,
  totalResults = 0,
  onChatWithMedia,
  onChatAboutMedia
}: ContentViewerProps) {
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({
    statistics: false,
    content: false,
    metadata: false,
    analysis: false,
    existingAnalyses: false
  })
  const [showMoreActions, setShowMoreActions] = useState(false)
  const moreActionsRef = useRef<HTMLDivElement>(null)

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
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
          <div className="mb-6 flex justify-center">
            <div className="w-48 h-48 bg-slate-200 rounded-lg flex items-center justify-center">
              <FileSearch className="w-24 h-24 text-slate-400" />
            </div>
          </div>
          <h2 className="text-slate-900 mb-2 text-xl font-semibold">
            No media item selected
          </h2>
          <p className="text-slate-600">
            Select a media item from the left sidebar to view its content and
            analyses here.
          </p>
        </div>
      </div>
    )
  }

  const wordCount = content ? content.split(/\s+/).length : 0
  const charCount = content ? content.length : 0
  const paragraphCount = content
    ? content.split('\n\n').filter((p: string) => p.trim().length > 0).length
    : 0

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-slate-400" />
            <h2 className="text-slate-900">Review Controls</h2>
            {totalResults > 0 && (
              <span className="text-sm text-slate-500">
                {currentIndex + 1} / {totalResults}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h3 className="text-slate-900 mb-2 text-2xl font-semibold">
              {selectedMedia.title || `${selectedMedia.kind} ${selectedMedia.id}`}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedMedia.meta?.type && (
                <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-slate-100 text-slate-700 capitalize">
                  {selectedMedia.meta.type}
                </span>
              )}
              {selectedMedia.meta?.source && (
                <span className="text-slate-600 text-sm">
                  Source: {selectedMedia.meta.source}
                </span>
              )}
              {selectedMedia.meta?.duration && (
                <span className="text-slate-600 text-sm">
                  Duration: {formatDuration(selectedMedia.meta.duration)}
                </span>
              )}
            </div>
          </div>

          {/* Ask the assistant */}
          {(onChatWithMedia || onChatAboutMedia) && (
            <div className="mb-6">
              <h4 className="text-slate-600 mb-3 text-sm">Ask the assistant</h4>
              <div className="flex gap-3">
                {onChatWithMedia && (
                  <button
                    onClick={onChatWithMedia}
                    className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                  >
                    <Send className="w-4 h-4" />
                    Chat with this media
                  </button>
                )}
                {onChatAboutMedia && (
                  <button
                    onClick={onChatAboutMedia}
                    className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Chat about this media
                  </button>
                )}
                <div className="relative" ref={moreActionsRef}>
                  <button
                    onClick={() => setShowMoreActions(!showMoreActions)}
                    className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium min-w-[160px]"
                  >
                    More actions
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showMoreActions && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                      <button
                        onClick={handleCopyContent}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Copy content
                      </button>
                      <button
                        onClick={handleCopyMetadata}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
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
          <div className="bg-slate-50 border border-slate-200 rounded-lg mb-4 overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-slate-100">
              <h4 className="text-slate-900 font-medium">Document Statistics</h4>
              <button
                onClick={() => toggleSection('statistics')}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
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
              <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-600">Word Count</span>
                    <span className="text-slate-900 mt-1 font-medium">
                      {wordCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-600">Characters</span>
                    <span className="text-slate-900 mt-1 font-medium">
                      {charCount}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-600">Paragraphs</span>
                    <span className="text-slate-900 mt-1 font-medium">
                      {paragraphCount}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="bg-white border border-slate-200 rounded-lg mb-4 overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-slate-100">
              <h4 className="text-slate-900 font-medium">Content</h4>
              <button
                onClick={() => toggleSection('content')}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
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
              <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="prose prose-slate max-w-none">
                  <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {content || 'No content available'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analysis */}
          <div className="bg-white border border-slate-200 rounded-lg mb-4 overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-slate-100">
              <h4 className="text-slate-900 font-medium">Analysis</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSection('analysis')}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
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
                <button className="text-slate-600 hover:text-slate-700 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="text-slate-600 hover:text-slate-700 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!collapsedSections.analysis && (
              <div className="p-4 bg-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <textarea
                  placeholder="Run Review or Summarize, then edit here..."
                  className="w-full min-h-[200px] p-3 bg-white border border-slate-300 rounded text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden transition-all duration-200">
            <div className="flex items-center justify-between p-4 bg-slate-100">
              <h4 className="text-slate-900 font-medium">Metadata</h4>
              <button
                onClick={() => toggleSection('metadata')}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
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
              <div className="p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">ID:</span>
                    <span className="text-slate-900 font-mono text-xs">
                      {selectedMedia.id}
                    </span>
                  </div>
                  {selectedMedia.meta?.type && (
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-600">Type:</span>
                      <span className="text-slate-900 capitalize">
                        {selectedMedia.meta.type}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-600">Title:</span>
                    <span className="text-slate-900">
                      {selectedMedia.title || 'N/A'}
                    </span>
                  </div>
                  {selectedMedia.meta?.source && (
                    <div className="flex justify-between py-2">
                      <span className="text-slate-600">Source:</span>
                      <span className="text-slate-900">
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
