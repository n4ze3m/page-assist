import { useState, useEffect } from 'react'
import { Modal, Button, Select, Input, message } from 'antd'
import { Storage } from '@plasmohq/storage'
import { useStorage } from '@plasmohq/storage/hook'
import { useTranslation } from 'react-i18next'
import { bgRequest } from '@/services/background-proxy'
import { getAllModelsExT } from '@/db/models'

interface AnalysisModalProps {
  open: boolean
  onClose: () => void
  mediaId: string | number
  mediaContent: string
  onAnalysisGenerated: () => void
}

export function AnalysisModal({
  open,
  onClose,
  mediaId,
  mediaContent,
  onAnalysisGenerated
}: AnalysisModalProps) {
  const { t } = useTranslation(['review', 'common'])
  const [selectedModel, setSelectedModel] = useStorage('selectedModel')
  const [models, setModels] = useState<Array<{ id: string; name?: string }>>([])
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an expert analyst. Provide a comprehensive analysis of the following content, including key themes, insights, and actionable takeaways.'
  )
  const [userPrefix, setUserPrefix] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  // Load models from database
  useEffect(() => {
    ;(async () => {
      try {
        const allModels = await getAllModelsExT()
        setModels(allModels || [])
      } catch (err) {
        console.warn('Failed to load models:', err)
        setModels([])
      }
    })()
  }, [])

  // Load saved prompts from storage
  useEffect(() => {
    if (open) {
      ;(async () => {
        try {
          const storage = new Storage({ area: 'local' })
          const data = (await storage.get('media:analysisPrompts').catch(() => null)) as any
          if (data && typeof data === 'object') {
            if (typeof data.systemPrompt === 'string') setSystemPrompt(data.systemPrompt)
            if (typeof data.userPrefix === 'string') setUserPrefix(data.userPrefix)
          }
        } catch (err) {
          console.warn('Failed to load saved prompts:', err)
        }
      })()
    }
  }, [open])

  const handleSaveAsDefault = async () => {
    try {
      const storage = new Storage({ area: 'local' })
      await storage.set('media:analysisPrompts', { systemPrompt, userPrefix })
      message.success(t('mediaPage.savedAsDefault', 'Saved as default prompts'))
    } catch {
      message.error(t('mediaPage.savePromptsFailed', 'Failed to save prompts'))
    }
  }

  const handleGenerate = async () => {
    if (!mediaContent || !mediaContent.trim()) {
      message.warning(t('mediaPage.noContentForAnalysis', 'No content available for analysis'))
      return
    }

    setGenerating(true)
    try {
      const body = {
        model: selectedModel || 'default',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `${userPrefix ? userPrefix + '\n\n' : ''}${mediaContent}`
          }
        ]
      }

      const resp = await bgRequest<any>({
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      })

      const analysisText =
        resp?.choices?.[0]?.message?.content || resp?.content || ''

      if (!analysisText) {
        message.error(t('mediaPage.noAnalysisReturned', 'No analysis returned from API'))
        return
      }

      // Save the analysis to the media item
      try {
        await bgRequest<any>({
          path: `/api/v1/media/${mediaId}`,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: {
            processing: {
              analysis: analysisText,
              model: selectedModel || 'default',
              prompt: systemPrompt
            }
          }
        })

        message.success(t('mediaPage.analysisGeneratedAndSaved', 'Analysis generated and saved'))
        onAnalysisGenerated()
        onClose()
      } catch (err) {
        message.error(t('mediaPage.analysisSaveFailed', 'Failed to save analysis to media item'))
        console.error('Save error:', err)
      }
    } catch (err) {
      message.error(t('mediaPage.analysisGenerateFailed', 'Failed to generate analysis'))
      console.error('Generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  const presets = [
    {
      name: t(
        'mediaPage.presetComprehensiveAnalysis',
        'Comprehensive Analysis'
      ),
      system:
        'You are an expert analyst. Provide a comprehensive analysis of the following content, including key themes, insights, and actionable takeaways.',
      user: ''
    },
    {
      name: t('mediaPage.presetExecutiveSummary', 'Executive Summary'),
      system:
        'Provide an executive summary with key points, main conclusions, and recommendations. Keep it concise and actionable.',
      user: ''
    },
    {
      name: t('mediaPage.presetCriticalReview', 'Critical Review'),
      system:
        'Act as a critical reviewer. Identify strengths, weaknesses, gaps in logic, and areas for improvement. Provide specific, actionable feedback.',
      user: ''
    },
    {
      name: t('mediaPage.presetQAAnalysis', 'Q&A Analysis'),
      system:
        'Analyze the content and create a Q&A format response covering: What is it about? Who is it for? What are the key takeaways? What actions should be taken?',
      user: ''
    }
  ]

  return (
    <Modal
      title={t('mediaPage.generateAnalysis', 'Generate Analysis')}
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="save" onClick={handleSaveAsDefault}>
          {t('mediaPage.saveAsDefault', 'Save as default')}
        </Button>,
        <Button key="cancel" onClick={onClose}>
          {t('common:cancel', 'Cancel')}
        </Button>,
        <Button
          key="generate"
          type="primary"
          loading={generating}
          onClick={handleGenerate}
          disabled={!mediaContent || !mediaContent.trim()}
        >
          {t('mediaPage.generateAnalysis', 'Generate Analysis')}
        </Button>
      ]}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mediaPage.model', 'Model')}
          </label>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            className="w-full"
            placeholder={t('mediaPage.selectModel', 'Select a model')}
            notFoundContent={
              models.length === 0
                ? t('mediaPage.noModelsAvailable', 'No models available')
                : undefined
            }
          >
            {models.map((model) => (
              <Select.Option key={model.id} value={model.id}>
                {model.name || model.id}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('mediaPage.promptPresets', 'Prompt Presets')}
            </label>
            <Button
              size="small"
              type="link"
              onClick={() => setShowPresets(!showPresets)}
            >
              {showPresets
                ? t('mediaPage.hidePresets', 'Hide Presets')
                : t('mediaPage.showPresets', 'Show Presets')}
            </Button>
          </div>
          {showPresets && (
            <div className="flex flex-wrap gap-2 mb-3">
              {presets.map((preset, idx) => (
                <Button
                  key={idx}
                  size="small"
                  onClick={() => {
                    setSystemPrompt(preset.system)
                    setUserPrefix(preset.user)
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mediaPage.systemPromptLabel', 'System Prompt')}
          </label>
          <Input.TextArea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder={t(
              'mediaPage.systemPromptPlaceholder',
              'Enter system prompt...'
            )}
            className="text-sm"
          />
        </div>

        {/* User Prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mediaPage.userPromptPrefixLabel', 'User Prompt Prefix')}
            <span className="text-xs text-gray-500 ml-2">
              {t(
                'mediaPage.prependedBeforeContent',
                '(prepended before content)'
              )}
            </span>
          </label>
          <Input.TextArea
            value={userPrefix}
            onChange={(e) => setUserPrefix(e.target.value)}
            rows={3}
            placeholder={t(
              'mediaPage.userPrefixPlaceholder',
              'Optional: Enter text to prepend before the media content...'
            )}
            className="text-sm"
          />
        </div>
      </div>
    </Modal>
  )
}
