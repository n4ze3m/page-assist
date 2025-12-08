import React from 'react'
import { Button, Dropdown, Pagination, Spin, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import FeatureEmptyState from '@/components/Common/FeatureEmptyState'
import ConnectionProblemBanner from '@/components/Common/ConnectionProblemBanner'
import { useConnectionActions } from '@/hooks/useConnectionState'
import { getDemoNotes } from '@/utils/demo-content'
import type { ServerCapabilities } from '@/services/tldw/server-capabilities'
import type { NoteListItem } from '@/components/Notes/types'

const MAX_TITLE_LENGTH = 80
const MAX_PREVIEW_LENGTH = 100

const truncateText = (value?: string | null, max?: number) => {
  if (!value) return ''
  if (!max || value.length <= max) return value
  return `${value.slice(0, max)}...`
}

type NotesListPanelProps = {
  isOnline: boolean
  isFetching: boolean
  demoEnabled: boolean
  capsLoading: boolean
  capabilities: ServerCapabilities | null
  notes: NoteListItem[] | undefined
  total: number
  page: number
  pageSize: number
  selectedId: string | number | null
  onSelectNote: (id: string | number) => void
  onChangePage: (page: number, pageSize: number) => void
  onResetEditor: () => void
  onOpenSettings: () => void
  onOpenHealth: () => void
  onExportAllMd: () => void
  onExportAllCsv: () => void
  onExportAllJson: () => void
}

const NotesListPanel: React.FC<NotesListPanelProps> = ({
  isOnline,
  isFetching,
  demoEnabled,
  capsLoading,
  capabilities,
  notes,
  total,
  page,
  pageSize,
  selectedId,
  onSelectNote,
  onChangePage,
  onResetEditor,
  onOpenSettings,
  onOpenHealth,
  onExportAllMd,
  onExportAllCsv,
  onExportAllJson
}) => {
  const { t } = useTranslation(['option', 'settings'])
  const { checkOnce } = useConnectionActions()
  const hasNotes = Array.isArray(notes) && notes.length > 0
  const startItem = hasNotes ? (page - 1) * pageSize + 1 : 0
  const endItem = hasNotes ? Math.min(page * pageSize, total) : 0
  const exportDisabled = !isOnline || !hasNotes

  const demoNotes = React.useMemo(() => getDemoNotes(t), [t])

  return (
    <div className="flex flex-col h-full">
      {/* Export header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0c0c0c]">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {t('option:notesSearch.resultsLabel', { defaultValue: 'Results' })}
          </span>
          <Tooltip
            title={
              exportDisabled
                ? t('option:notesSearch.exportDisabled', {
                    defaultValue: isOnline
                      ? 'No results to export'
                      : 'Connect to export notes'
                  })
                : undefined
            }
          >
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'md',
                    label: t('option:notesSearch.exportMdTooltip', {
                      defaultValue: 'Export matching notes as Markdown (.md)'
                    })
                  },
                  {
                    key: 'csv',
                    label: t('option:notesSearch.exportCsvTooltip', {
                      defaultValue: 'Export matching notes as CSV'
                    })
                  },
                  {
                    key: 'json',
                    label: t('option:notesSearch.exportJsonTooltip', {
                      defaultValue: 'Export matching notes as JSON'
                    })
                  }
                ],
                onClick: ({ key }) => {
                  if (exportDisabled) return
                  if (key === 'md') onExportAllMd()
                  if (key === 'csv') onExportAllCsv()
                  if (key === 'json') onExportAllJson()
                }
              }}
              disabled={exportDisabled}
            >
              <Button
                size="small"
                type="text"
                className="text-xs"
                disabled={exportDisabled}
              >
                {t('option:notesSearch.exportMenuTrigger', {
                  defaultValue: 'Export'
                })}
              </Button>
            </Dropdown>
          </Tooltip>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4">
      {isFetching ? (
        <div className="flex items-center justify-center py-10">
          <Spin />
        </div>
      ) : !isOnline ? (
        demoEnabled ? (
          <div className="space-y-4">
            <FeatureEmptyState
              title={
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                    Demo
                  </span>
                  <span>
                    {t('option:notesEmpty.demoTitle', {
                      defaultValue: 'Explore Notes in demo mode'
                    })}
                  </span>
                </span>
              }
              description={t('option:notesEmpty.demoDescription', {
                defaultValue:
                  'This demo shows how Notes can organize your insights. Connect your own server later to create and save real notes.'
              })}
              examples={[
                t('option:notesEmpty.demoExample1', {
                  defaultValue:
                    'See how note titles, previews, and timestamps appear in this list.'
                }),
                t('option:notesEmpty.demoExample2', {
                  defaultValue:
                    'When you connect, you’ll be able to create notes from meetings, reviews, and more.'
                }),
                t('option:notesEmpty.demoExample3', {
                  defaultValue:
                    'Use Notes alongside Media and Review to keep track of your findings.'
                })
              ]}
              primaryActionLabel={t('settings:tldw.setupLink', 'Set up server')}
              onPrimaryAction={onOpenSettings}
            />
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-[#111] dark:text-gray-200">
              <div className="mb-2 font-semibold">
                {t("option:notesEmpty.demoPreviewHeading", {
                  defaultValue: "Example notes (preview only)"
                })}
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {demoNotes.map((note) => (
                  <div key={note.id} className="py-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {note.title}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">
                      {note.preview}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      {note.updated_at}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ConnectionProblemBanner
            badgeLabel="Not connected"
            title={t('option:notesEmpty.connectTitle', {
              defaultValue: 'Connect to use Notes'
            })}
            description={t('option:notesEmpty.connectDescription', {
              defaultValue:
                'This view needs a connected server. Use the server connection card above to fix your connection, then return here to capture and organize notes.'
            })}
            examples={[
              t('option:notesEmpty.connectExample1', {
                defaultValue:
                  'Use the connection card at the top of this page to add your server URL and API key.'
              })
            ]}
            primaryActionLabel={t('settings:tldw.setupLink', 'Set up server')}
            onPrimaryAction={onOpenSettings}
            retryActionLabel={t('option:buttonRetry', 'Retry connection')}
            onRetry={() => {
              void checkOnce()
            }}
          />
        )
      ) : !capsLoading && capabilities && !capabilities.hasNotes ? (
        <FeatureEmptyState
          title={
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                Feature unavailable
              </span>
              <span>
                {t('option:notesEmpty.offlineTitle', {
                  defaultValue: 'Notes API not available on this server'
                })}
              </span>
            </span>
          }
          description={t('option:notesEmpty.offlineDescription', {
            defaultValue:
              'This tldw server does not advertise the Notes endpoints (for example, /api/v1/notes/). Upgrade your server to a version that includes the Notes API to use this workspace.'
          })}
          examples={[
            t('option:notesEmpty.offlineExample1', {
              defaultValue:
                'Open Health & diagnostics to confirm your server version and available APIs.'
            }),
            t('option:notesEmpty.offlineExample2', {
              defaultValue:
                'After upgrading, reload the extension and return to Notes.'
            })
          ]}
          primaryActionLabel={t('settings:healthSummary.diagnostics', {
            defaultValue: 'Health & diagnostics'
          })}
          onPrimaryAction={onOpenHealth}
        />
      ) : Array.isArray(notes) && notes.length > 0 ? (
        <>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notes.map((item) => (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => {
                  onSelectNote(item.id)
                }}
                className={`w-full py-3 text-left hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors ${
                  selectedId === item.id
                    ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-l-blue-600 dark:border-l-blue-500 px-3'
                    : 'px-4'
                }`}
              >
                <div className="w-full">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {truncateText(
                      item.title || `Note ${item.id}`,
                      MAX_TITLE_LENGTH
                    )}
                  </div>
                  {item.content && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {truncateText(
                        String(item.content),
                        MAX_PREVIEW_LENGTH
                      )}
                    </div>
                  )}
                  {Array.isArray(item.keywords) && item.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.keywords.slice(0, 5).map((keyword, idx) => (
                        <span
                          key={`${keyword}-${idx}`}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        >
                          {keyword}
                        </span>
                      ))}
                      {item.keywords.length > 5 && (
                        <Tooltip
                          title={t('option:notesSearch.moreTagsTooltip', {
                            defaultValue: '+{{count}} more tags',
                            count: item.keywords.length - 5
                          })}
                        >
                          <span className="inline-flex items-center px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                            +{item.keywords.length - 5}
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  {item.conversation_id && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {t('option:notesSearch.linkedConversation', {
                        defaultValue: 'Linked to conversation'
                      })}
                      {': '}
                      {String(item.conversation_id)}
                      {item.message_id ? ` · msg ${String(item.message_id)}` : ''}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {item.updated_at
                      ? (() => {
                          const d = new Date(item.updated_at)
                          return isNaN(d.getTime()) ? '' : d.toLocaleString()
                        })()
                      : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <FeatureEmptyState
          title={
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                Getting started
              </span>
              <span>
                {t('option:notesEmpty.title', { defaultValue: 'No notes yet' })}
              </span>
            </span>
          }
          description={t('option:notesEmpty.description', {
            defaultValue:
              'Capture and organize free-form notes connected to your tldw insights.'
          })}
          examples={[
            t('option:notesEmpty.exampleCreate', {
              defaultValue:
                'Create a new note for a recent meeting or transcript.'
            }),
            t('option:notesEmpty.exampleLink', {
              defaultValue:
                'Save review outputs into Notes so you can revisit them later.'
            })
          ]}
          primaryActionLabel={t('option:notesEmpty.primaryCta', {
            defaultValue: 'Create note'
          })}
          onPrimaryAction={onResetEditor}
        />
      )}
      </div>

      {/* Pagination Footer */}
      {hasNotes && (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#171717]">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div>
              {t('option:notesSearch.showingRange', {
                defaultValue: 'Showing {{start}}-{{end}} of {{total}}',
                start: startItem,
                end: endItem,
                total
              })}
            </div>
            <Pagination
              simple
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(p) => {
                onChangePage(p, pageSize)
              }}
              showSizeChanger={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default NotesListPanel
