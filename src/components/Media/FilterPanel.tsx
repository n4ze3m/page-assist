import { ChevronDown, Filter } from 'lucide-react'
import { useState } from 'react'

interface FilterPanelProps {
  activeFilters: {
    media: boolean
    notes: boolean
  }
  onFilterChange: (filters: { media: boolean; notes: boolean }) => void
  mediaTypes: string[]
  selectedMediaTypes: string[]
  onMediaTypesChange: (types: string[]) => void
  keywords: string[]
  selectedKeywords: string[]
  onKeywordsChange: (keywords: string[]) => void
}

export function FilterPanel({
  activeFilters,
  onFilterChange,
  mediaTypes,
  selectedMediaTypes,
  onMediaTypesChange,
  keywords,
  selectedKeywords,
  onKeywordsChange
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    resultTypes: true,
    mediaTypes: false,
    keywords: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleMediaTypeToggle = (type: string) => {
    if (selectedMediaTypes.includes(type)) {
      onMediaTypesChange(selectedMediaTypes.filter(t => t !== type))
    } else {
      onMediaTypesChange([...selectedMediaTypes, type])
    }
  }

  const handleKeywordToggle = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      onKeywordsChange(selectedKeywords.filter(k => k !== keyword))
    } else {
      onKeywordsChange([...selectedKeywords, keyword])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        <button
          onClick={() => {
            onFilterChange({ media: true, notes: false })
            onMediaTypesChange([])
            onKeywordsChange([])
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Clear all
        </button>
      </div>

      {/* Result Types */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('resultTypes')}
          className="flex items-center justify-between w-full text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <span>Result types</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expandedSections.resultTypes ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.resultTypes && (
          <div className="space-y-2 pl-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeFilters.media}
                onChange={(e) => onFilterChange({ ...activeFilters, media: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Media</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeFilters.notes}
                onChange={(e) => onFilterChange({ ...activeFilters, notes: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Notes</span>
            </label>
          </div>
        )}
      </div>

      {/* Media Types */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('mediaTypes')}
          className="flex items-center justify-between w-full text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <span>Media types</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expandedSections.mediaTypes ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.mediaTypes && (
          <div className="pl-1">
            {mediaTypes.length > 0 ? (
              <div className="space-y-2">
                {mediaTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMediaTypes.includes(type)}
                      onChange={() => handleMediaTypeToggle(type)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No media types available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('keywords')}
          className="flex items-center justify-between w-full text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <span>Keywords</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expandedSections.keywords ? 'rotate-180' : ''}`}
          />
        </button>
        {expandedSections.keywords && (
          <div className="pl-1">
            {keywords.length > 0 ? (
              <div className="space-y-2">
                {keywords.map(keyword => (
                  <label key={keyword} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedKeywords.includes(keyword)}
                      onChange={() => handleKeywordToggle(keyword)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{keyword}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Search matches title and content; keywords further narrow the results.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
