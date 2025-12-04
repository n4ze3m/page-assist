import React from 'react'
import { Button, Input, Select, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { Plus as PlusIcon, Search as SearchIcon } from 'lucide-react'

type NotesToolbarProps = {
  query: string
  total: number
  visibleCount: number
  keywordTokens: string[]
  keywordOptions: string[]
  hasActiveFilters: boolean
  onQueryChange: (value: string) => void
  onSubmitSearch: () => void
  onKeywordChange: (values: string[]) => void
  onKeywordSearch: (text: string) => void
  onClearFilters: () => void
  onNewNote: () => void
}

const NotesToolbar: React.FC<NotesToolbarProps> = ({
  query,
  total,
  visibleCount,
  keywordTokens,
  keywordOptions,
  hasActiveFilters,
  onQueryChange,
  onSubmitSearch,
  onKeywordChange,
  onKeywordSearch,
  onClearFilters,
  onNewNote
}) => {
  const { t } = useTranslation(['option'])

  return (
    <div className="p-4 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.16em] text-gray-500">
          {t('option:notesSearch.headerLabel', { defaultValue: 'Notes' })}
          <span className="ml-2 text-gray-400">
            {visibleCount > 0 && total > 0
              ? t('option:notesSearch.headerCount', {
                  defaultValue: '{{visible}} of {{total}}',
                  visible: visibleCount,
                  total
                })
              : t('option:notesSearch.headerCountFallback', {
                  defaultValue: '{{total}} total',
                  total
                })}
          </span>
        </div>
        <Tooltip
          title={t('option:notesSearch.newTooltip', {
            defaultValue: 'Create a new note'
          })}
        >
          <Button
            type="text"
            shape="circle"
            onClick={onNewNote}
            className="flex items-center justify-center"
            icon={(<PlusIcon className="w-4 h-4" />) as any}
            aria-label={t('option:notesSearch.new', {
              defaultValue: 'New note'
            })}
          />
        </Tooltip>
      </div>
      <div className="relative">
        <Input
          allowClear
          placeholder={t('option:notesSearch.placeholder', {
            defaultValue: 'Search notes...'
          })}
          prefix={(<SearchIcon className="w-4 h-4 text-gray-400" />) as any}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onPressEnter={onSubmitSearch}
          className="flex-1 min-w-[12rem]"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Select
            mode="tags"
            allowClear
            placeholder={t('option:notesSearch.keywordsPlaceholder', {
              defaultValue: 'Filter by keyword'
            })}
            className="min-w-[12rem] w-full pl-2"
            value={keywordTokens}
            onSearch={(txt) => onKeywordSearch(txt)}
            onChange={(vals) => onKeywordChange(vals as string[])}
            options={keywordOptions.map((k) => ({ label: k, value: k }))}
          />
        </div>
      </div>
      {hasActiveFilters && (
        <Button
          size="small"
          onClick={onClearFilters}
          icon={(<PlusIcon className="w-3 h-3 rotate-45" />) as any}
          className="w-full justify-center text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          {t('option:notesSearch.clear', {
            defaultValue: 'Clear search & filters'
          })}
        </Button>
      )}
    </div>
  )
}

export default NotesToolbar

