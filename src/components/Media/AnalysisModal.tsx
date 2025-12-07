import { useState, useEffect, useMemo } from 'react'
import { Modal, Button, Select, Input, message } from 'antd'
import { Storage } from '@plasmohq/storage'
import { useStorage } from '@plasmohq/storage/hook'
import { useTranslation } from 'react-i18next'
import { bgRequest } from '@/services/background-proxy'
import { tldwModels } from '@/services/tldw'
import { ANALYSIS_PRESETS } from "@/components/Media/analysisPresets"

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
  const [selectedModel, setSelectedModel] = useStorage<string | undefined>('selectedModel')
  const [models, setModels] = useState<Array<{ id: string; name?: string }>>([])
  const [systemPrompt, setSystemPrompt] = useState(
    'You are an expert analyst. Provide a comprehensive analysis of the following content, including key themes, insights, and actionable takeaways.'
  )
  const [userPrefix, setUserPrefix] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showPresets, setShowPresets] = useState(false)

  const presets = useMemo(
    () =>
      ANALYSIS_PRESETS.map((preset) => ({
        name: t(preset.nameKey, preset.nameDefault),
        system: preset.systemPrompt,
        user: preset.userPrefix ?? ''
      })),
    [t]
  )

  // Load models from tldw_server
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const chatModels = await tldwModels.getChatModels(true)
        const allModels = chatModels.map((m) => ({
          id: m.id,
          name: m.name || m.id
        }))
        if (!cancelled) {
          setModels(allModels || [])
        }
      } catch (err) {
        console.warn('Failed to load models:', err)
        if (!cancelled) {
          setModels([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Load saved prompts from storage
  useEffect(() => {
    if (open) {
      let cancelled = false
      ;(async () => {
        try {
          const storage = new Storage({ area: 'local' })
          const data = (await storage.get('media:analysisPrompts').catch(() => null)) as any
          if (!cancelled && data && typeof data === 'object') {
            if (typeof data.systemPrompt === 'string') setSystemPrompt(data.systemPrompt)
            if (typeof data.userPrefix === 'string') setUserPrefix(data.userPrefix)
          }
        } catch (err) {
          console.warn('Failed to load saved prompts:', err)
        }
      })()

      return () => {
        cancelled = true
      }
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

    const validSelectedModel =
      selectedModel && models.find((m) => m.id === selectedModel)?.id
    const effectiveModel = validSelectedModel || models[0]?.id
    if (!effectiveModel) {
      message.warning(
        t(
          'mediaPage.noModelSelected',
          'Select a model before generating analysis'
        )
      )
      return
    }

    setGenerating(true)
    try {
      const body = {
        model: effectiveModel,
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

      // Save the analysis to the media item (MediaUpdateRequest)
      try {
        await bgRequest<any>({
          path: `/api/v1/media/${mediaId}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: {
            analysis: analysisText,
            prompt: systemPrompt
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
          disabled={
            !mediaContent ||
            !mediaContent.trim() ||
            models.length === 0
          }
        >
          {t('mediaPage.generateAnalysis', 'Generate Analysis')}
        </Button>
      ]}
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="media-analysis-model"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mediaPage.model', 'Model')}
          </label>
          <Select
            id="media-analysis-model"
            aria-label={t('mediaPage.model', 'Model')}
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
          <label
            htmlFor="systemPrompt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mediaPage.systemPromptLabel', 'System Prompt')}
          </label>
          <Input.TextArea
            id="systemPrompt"
            aria-label={t('mediaPage.systemPromptLabel', 'System Prompt')}
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
          <label
            htmlFor="userPromptPrefix"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('mediaPage.userPromptPrefixLabel', 'User Prompt Prefix')}
            <span className="text-xs text-gray-500 ml-2">
              {t(
                'mediaPage.prependedBeforeContent',
                '(prepended before content)'
              )}
            </span>
          </label>
          <Input.TextArea
            id="userPromptPrefix"
            aria-label={t('mediaPage.userPromptPrefixLabel', 'User Prompt Prefix')}
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
