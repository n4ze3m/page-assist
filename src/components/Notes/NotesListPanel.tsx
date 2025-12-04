import React from 'react'
import { Button, Dropdown, List, Pagination, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import FeatureEmptyState from '@/components/Common/FeatureEmptyState'
import type { ServerCapabilities } from '@/services/tldw/server-capabilities'

type NotesListItem = {
  id: string | number
  title?: string
  content?: string
  updated_at?: string
  conversation_id?: string | null
  message_id?: string | null
}

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
  notes: NotesListItem[] | undefined
  total: number
  page: number
  pageSize: number
  selectedId: string | number | null
  onSelectNote: (id: string | number) => void
  onChangePage: (page: number, pageSize: number) => void
  onResetEditor: () => void
  onScrollToServerCard: () => void
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
  onScrollToServerCard,
  onOpenHealth,
  onExportAllMd,
  onExportAllCsv,
  onExportAllJson
}) => {
  const { t } = useTranslation(['option', 'settings'])

  return (
    <div className="mt-3 p-3 rounded-lg border dark:border-gray-700 bg-white dark:bg-[#171717] max-h-[50vh] md:max-h-[60vh] lg:max-h-[calc(100dvh-18rem)] overflow-auto">
      <div className="sticky -m-3 mb-2 top-0 z-10 px-3 py-2 bg-white dark:bg-[#171717] border-b dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          <span className="uppercase tracking-wide">Notes</span>
          <span className="text-gray-400 ml-1">
            {t('option:notesSearch.listCount', {
              defaultValue: '{{count}} notes',
              count: total
            })}
          </span>
        </span>
        <div className="flex items-center gap-2">
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
                if (key === 'md') onExportAllMd()
                if (key === 'csv') onExportAllCsv()
                if (key === 'json') onExportAllJson()
              }
            }}
          >
            <Button size="small">
              {t('option:notesSearch.exportMenuTrigger', {
                defaultValue: 'Export'
              })}
            </Button>
          </Dropdown>
        </div>
      </div>
      {isFetching ? (
        <div className="flex items-center justify-center py-10">
          <Spin />
        </div>
      ) : !isOnline ? (
        demoEnabled ? (
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
              })
            ]}
            primaryActionLabel={t('option:connectionCard.buttonGoToServerCard', {
              defaultValue: 'Go to server card'
            })}
            onPrimaryAction={onScrollToServerCard}
          />
        ) : (
          <FeatureEmptyState
            title={
              <span className="inline-flex items-center gap-2">
                <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200">
                  Not connected
                </span>
                <span>
                  {t('option:notesEmpty.connectTitle', {
                    defaultValue: 'Connect to use Notes'
                  })}
                </span>
              </span>
            }
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
            primaryActionLabel={t('option:connectionCard.buttonGoToServerCard', {
              defaultValue: 'Go to server card'
            })}
            onPrimaryAction={onScrollToServerCard}
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
          <List
            size="small"
            dataSource={notes}
            renderItem={(item) => (
              <List.Item
                key={String(item.id)}
                onClick={() => {
                  onSelectNote(item.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectNote(item.id)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-selected={selectedId === item.id}
                className={`cursor-pointer rounded-md border px-3 py-2 text-left transition-colors ${
                  selectedId === item.id
                    ? 'border-blue-500 bg-blue-50/80 dark:border-blue-400 dark:bg-blue-900/30'
                    : 'border-transparent hover:border-gray-600 hover:bg-gray-50 dark:border-transparent dark:hover:border-gray-600 dark:hover:bg-[#262626]'
                }`}
              >
                <div className="w-full">
                  <Typography.Text
                    strong
                    ellipsis
                    className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
                  >
                    {truncateText(
                      item.title || `Note ${item.id}`,
                      MAX_TITLE_LENGTH
                    )}
                  </Typography.Text>
                  {item.content && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {truncateText(
                        String(item.content),
                        MAX_PREVIEW_LENGTH
                      )}
                    </div>
                  )}
                  {item.conversation_id && (
                    <div className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                      {t('option:notesSearch.linkedConversation', {
                        defaultValue: 'Linked to conversation'
                      })}
                      {': '}
                      {String(item.conversation_id)}
                      {item.message_id ? ` · msg ${String(item.message_id)}` : ''}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {item.updated_at
                      ? new Date(item.updated_at).toLocaleString()
                      : ''}
                  </div>
                </div>
              </List.Item>
            )}
          />
          <div className="mt-2 flex justify-center">
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={[10, 20, 50, 100] as any}
              onChange={(p, ps) => {
                onChangePage(p, ps)
              }}
            />
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
  )
}

export default NotesListPanel

