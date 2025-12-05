import { FileText, HelpCircle } from 'lucide-react'

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
}

interface ResultsListProps {
  results: Result[]
  selectedId: string | number | null
  onSelect: (id: string | number) => void
  totalCount: number
  loadedCount: number
}

export function ResultsList({
  results,
  selectedId,
  onSelect,
  totalCount,
  loadedCount
}: ResultsListProps) {
  return (
    <div>
      {/* Results Header */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-[#0c0c0c] border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">RESULTS</span>
          <span className="text-xs text-gray-900 dark:text-gray-100">
            {loadedCount} / {totalCount}
          </span>
        </div>
      </div>

      {/* Results List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {results.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            No results found
          </div>
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelect(result.id)}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors ${
                selectedId === result.id
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-l-blue-600 dark:border-l-blue-500'
                  : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5">
                  <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200">
                      {result.kind.toUpperCase()}
                    </span>
                    {result.meta?.type && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                        {result.meta.type}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 truncate font-medium">
                    {result.title || `${result.kind} ${result.id}`}
                  </div>
                  {result.snippet && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {result.snippet}
                    </div>
                  )}
                  {result.meta?.source && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {result.meta.source}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
