import { useTranslation } from 'react-i18next'

interface JumpToNavigatorProps {
  results: Array<{ id: string | number; title?: string }>
  selectedId: string | number | null
  onSelect: (id: string | number) => void
  maxButtons?: number
}

export function JumpToNavigator({
  results,
  selectedId,
  onSelect,
  maxButtons = 12
}: JumpToNavigatorProps) {
  const { t } = useTranslation(['review'])

  if (results.length <= 5) {
    return null
  }

  const displayResults = results.slice(0, maxButtons)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
        {t('mediaPage.jumpTo', 'Jump to')}
      </span>
      <div className="flex flex-wrap gap-1">
        {displayResults.map((r) => {
          const isSelected = selectedId === r.id
          const displayTitle = String(r.title || r.id).slice(0, 24)
          const needsTruncation = String(r.title || r.id).length > 24

          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={needsTruncation ? String(r.title || r.id) : undefined}
            >
              {displayTitle}
              {needsTruncation && '...'}
            </button>
          )
        })}
        {results.length > maxButtons && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 self-center">
            {t('mediaPage.moreItems', '+{{count}} more', { count: results.length - maxButtons })}
          </span>
        )}
      </div>
    </div>
  )
}
