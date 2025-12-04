import React from 'react'
import { Button, Tooltip, Typography, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import {
  Link2 as LinkIcon,
  Plus as PlusIcon,
  Copy as CopyIcon,
  FileDown as FileDownIcon,
  Save as SaveIcon,
  Trash2 as TrashIcon,
  Eye as EyeIcon,
  Edit3 as EditIcon
} from 'lucide-react'

interface NotesEditorHeaderProps {
  title: string
  selectedId: string | number | null
  backlinkConversationId: string | null
  backlinkMessageId: string | null
  editorDisabled: boolean
  openingLinkedChat: boolean
  showPreview: boolean
  hasContent: boolean
  canSave: boolean
  canExport: boolean
  isSaving: boolean
  canDelete: boolean
  onOpenLinkedConversation: () => void
  onNewNote: () => void
  onTogglePreview: () => void
  onCopy: () => void
  onExport: () => void
  onSave: () => void
  onDelete: () => void
}

const NotesEditorHeader: React.FC<NotesEditorHeaderProps> = ({
  title,
  selectedId,
  backlinkConversationId,
  backlinkMessageId,
  editorDisabled,
  openingLinkedChat,
  showPreview,
  hasContent,
  canSave,
  canExport,
  isSaving,
  canDelete,
  onOpenLinkedConversation,
  onNewNote,
  onTogglePreview,
  onCopy,
  onExport,
  onSave,
  onDelete
}) => {
  const { t } = useTranslation(['option', 'common'])

  const displayTitle =
    selectedId == null
      ? t('option:notesSearch.newNoteTitle', { defaultValue: 'New note' })
      : title ||
        t('option:notesSearch.untitledNote', {
          defaultValue: `Note ${selectedId}`
        })

  return (
    <div className="flex items-center justify-between gap-4 pb-3 border-b dark:border-gray-700 mb-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <Typography.Title level={5} className="!mb-0 truncate">
          {displayTitle}
        </Typography.Title>
        {backlinkConversationId && (
          <div className="text-xs text-blue-600 dark:text-blue-300">
            {t('option:notesSearch.linkedConversation', {
              defaultValue: 'Linked to conversation'
            })}{' '}
            {backlinkConversationId}
            {backlinkMessageId ? ` · msg ${backlinkMessageId}` : ''}
          </div>
        )}
      </div>
      <Space>
        {!editorDisabled && (
          <>
            {backlinkConversationId && (
              <Tooltip
                title={t('option:notesSearch.openConversationTooltip', {
                  defaultValue: 'Open linked conversation'
                })}
              >
                <Button
                  size="small"
                  loading={openingLinkedChat}
                  onClick={onOpenLinkedConversation}
                  icon={(<LinkIcon className="w-4 h-4" />) as any}
                >
                  {t('option:notesSearch.openConversation', {
                    defaultValue: 'Open conversation'
                  })}
                </Button>
              </Tooltip>
            )}
            <Tooltip
              title={t('option:notesSearch.newTooltip', {
                defaultValue: 'Create a new note'
              })}
            >
              <Button
                size="small"
                onClick={onNewNote}
                icon={(<PlusIcon className="w-4 h-4" />) as any}
              >
                {t('option:notesSearch.new', {
                  defaultValue: 'New note'
                })}
              </Button>
            </Tooltip>
          </>
        )}
        <Tooltip
          title={
            showPreview
              ? t('option:notesSearch.toolbarEditModeTooltip', {
                  defaultValue: 'Switch back to edit mode'
                })
              : t('option:notesSearch.toolbarPreviewTooltip', {
                  defaultValue: 'Preview rendered Markdown'
                })
          }
        >
          <Button
            size="small"
            onClick={onTogglePreview}
            icon={
              (showPreview ? (
                <EditIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )) as any
            }
            aria-label={
              showPreview
                ? t('option:notesSearch.toolbarEditModeTooltip', {
                    defaultValue: 'Switch back to edit mode'
                  })
                : t('option:notesSearch.toolbarPreviewTooltip', {
                    defaultValue: 'Preview rendered Markdown'
                  })
            }
          >
            {showPreview
              ? t('option:notesSearch.editModeLabel', {
                  defaultValue: 'Edit'
                })
              : t('option:notesSearch.previewModeLabel', {
                  defaultValue: 'Preview'
                })}
          </Button>
        </Tooltip>
        <Tooltip
          title={t('option:notesSearch.toolbarCopyTooltip', {
            defaultValue: 'Copy note content'
          })}
        >
          <Button
            size="small"
            onClick={onCopy}
            icon={(<CopyIcon className="w-4 h-4" />) as any}
            disabled={!hasContent}
            aria-label={t('option:notesSearch.toolbarCopyTooltip', {
              defaultValue: 'Copy note content'
            })}
          />
        </Tooltip>
        <Tooltip
          title={t('option:notesSearch.toolbarExportMdTooltip', {
            defaultValue: 'Export note as Markdown (.md)'
          })}
        >
          <Button
            size="small"
            onClick={onExport}
            icon={(<FileDownIcon className="w-4 h-4" />) as any}
            disabled={!canExport}
            aria-label={t('option:notesSearch.toolbarExportMdTooltip', {
              defaultValue: 'Export note as Markdown (.md)'
            })}
          >
            MD
          </Button>
        </Tooltip>
        <Tooltip
          title={t('option:notesSearch.toolbarSaveTooltip', {
            defaultValue: 'Save note'
          })}
        >
          <Button
            type="primary"
            size="small"
            onClick={onSave}
            loading={isSaving}
            disabled={!canSave}
            icon={(<SaveIcon className="w-4 h-4" />) as any}
            aria-label={t('option:notesSearch.toolbarSaveTooltip', {
              defaultValue: 'Save note'
            })}
          >
            {t('common:save', { defaultValue: 'Save' })}
          </Button>
        </Tooltip>
        <Tooltip
          title={t('option:notesSearch.toolbarDeleteTooltip', {
            defaultValue: 'Delete note'
          })}
        >
          <Button
            danger
            size="small"
            onClick={onDelete}
            icon={(<TrashIcon className="w-4 h-4" />) as any}
            disabled={!canDelete}
            aria-label={t('option:notesSearch.toolbarDeleteTooltip', {
              defaultValue: 'Delete note'
            })}
          >
            {t('common:delete', { defaultValue: 'Delete' })}
          </Button>
        </Tooltip>
      </Space>
    </div>
  )
}

export default NotesEditorHeader

