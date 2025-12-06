import { useState, useEffect } from 'react'
import { Modal, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { Copy, Send, Save } from 'lucide-react'
import { bgRequest } from '@/services/background-proxy'

interface AnalysisEditModalProps {
  open: boolean
  onClose: () => void
  initialText: string
  mediaId?: string | number
  onSave?: (text: string) => void
  onSendToChat?: (text: string) => void
  onSaveNewVersion?: (text: string) => void
}

export function AnalysisEditModal({
  open,
  onClose,
  initialText,
  mediaId,
  onSave,
  onSendToChat,
  onSaveNewVersion
}: AnalysisEditModalProps) {
  const { t } = useTranslation(['review', 'common'])
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)

  // Reset text when modal opens with new initial text
  useEffect(() => {
    if (open) {
      setText(initialText)
    }
  }, [open, initialText])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(t('mediaPage.analysisCopied', 'Analysis copied'))
    } catch {
      message.error(t('mediaPage.copyFailed', 'Failed to copy'))
    }
  }

  const handleSendToChat = () => {
    if (!text.trim()) {
      message.warning(t('mediaPage.nothingToSend', 'Nothing to send'))
      return
    }
    if (onSendToChat) {
      onSendToChat(text)
      onClose()
    }
  }

  const handleSave = async () => {
    if (onSave) {
      onSave(text)
      onClose()
    }
  }

  const handleSaveAsNewVersion = async () => {
    if (!mediaId) {
      message.error(t('mediaPage.noMediaId', 'No media ID available'))
      return
    }
    if (!text.trim()) {
      message.warning(t('mediaPage.emptyAnalysis', 'Analysis cannot be empty'))
      return
    }

    setSaving(true)
    try {
      await bgRequest({
        path: `/api/v1/media/${mediaId}/versions`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          analysis_content: text
        }
      })
      message.success(t('mediaPage.versionSaved', 'Saved as new version'))
      if (onSaveNewVersion) {
        onSaveNewVersion(text)
      }
      onClose()
    } catch (err) {
      console.error('Failed to save version:', err)
      message.error(t('mediaPage.saveFailed', 'Failed to save version'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('mediaPage.editAnalysis', 'Edit Analysis')}
      open={open}
      onCancel={onClose}
      width={700}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-4 h-4" />
              {t('common:copy', 'Copy')}
            </button>
            {onSendToChat && (
              <button
                onClick={handleSendToChat}
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                {t('mediaPage.sendToChat', 'Send to Chat')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {mediaId && (
              <button
                onClick={handleSaveAsNewVersion}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {t('mediaPage.saveAsVersion', 'Save as New Version')}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              {t('common:cancel', 'Cancel')}
            </button>
            {onSave && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                {t('common:save', 'Save')}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full min-h-[300px] p-3 text-sm font-mono rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#171717] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"
          placeholder={t('mediaPage.analysisPlaceholder', 'Enter analysis text...')}
        />
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('mediaPage.wordCount', '{{count}} words', { count: text.trim() ? text.trim().split(/\s+/).length : 0 })}
          {' • '}
          {t('mediaPage.charCount', '{{count}} characters', { count: text.length })}
        </div>
      </div>
    </Modal>
  )
}
