import React, { useState, useEffect } from 'react'
import { Modal, Button, Select, Input, message } from 'antd'
import { Storage } from '@plasmohq/storage'
import { useStorage } from '@plasmohq/storage/hook'
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
      message.success('Saved as default prompts')
    } catch {
      message.error('Failed to save prompts')
    }
  }

  const handleGenerate = async () => {
    if (!mediaContent || !mediaContent.trim()) {
      message.warning('No content available for analysis')
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
        path: '/api/v1/chat/completions' as any,
        method: 'POST' as any,
        headers: { 'Content-Type': 'application/json' },
        body
      })

      const analysisText =
        resp?.choices?.[0]?.message?.content || resp?.content || ''

      if (!analysisText) {
        message.error('No analysis returned from API')
        return
      }

      // Save the analysis to the media item
      try {
        await bgRequest<any>({
          path: `/api/v1/media/${mediaId}` as any,
          method: 'PATCH' as any,
          headers: { 'Content-Type': 'application/json' },
          body: {
            processing: {
              analysis: analysisText,
              model: selectedModel || 'default',
              prompt: systemPrompt
            }
          }
        })

        message.success('Analysis generated and saved')
        onAnalysisGenerated()
        onClose()
      } catch (err) {
        message.error('Failed to save analysis to media item')
        console.error('Save error:', err)
      }
    } catch (err) {
      message.error('Failed to generate analysis')
      console.error('Generation error:', err)
    } finally {
      setGenerating(false)
    }
  }

  const presets = [
    {
      name: 'Comprehensive Analysis',
      system:
        'You are an expert analyst. Provide a comprehensive analysis of the following content, including key themes, insights, and actionable takeaways.',
      user: ''
    },
    {
      name: 'Executive Summary',
      system:
        'Provide an executive summary with key points, main conclusions, and recommendations. Keep it concise and actionable.',
      user: ''
    },
    {
      name: 'Critical Review',
      system:
        'Act as a critical reviewer. Identify strengths, weaknesses, gaps in logic, and areas for improvement. Provide specific, actionable feedback.',
      user: ''
    },
    {
      name: 'Q&A Analysis',
      system:
        'Analyze the content and create a Q&A format response covering: What is it about? Who is it for? What are the key takeaways? What actions should be taken?',
      user: ''
    }
  ]

  return (
    <Modal
      title="Generate Analysis"
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="save" onClick={handleSaveAsDefault}>
          Save as default
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="generate"
          type="primary"
          loading={generating}
          onClick={handleGenerate}
          disabled={!mediaContent || !mediaContent.trim()}
        >
          Generate Analysis
        </Button>
      ]}
    >
      <div className="space-y-4">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Model
          </label>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            className="w-full"
            placeholder="Select a model"
            notFoundContent={models.length === 0 ? "No models available" : undefined}
          >
            {models.map((model) => (
              <Select.Option key={model.id} value={model.id}>
                {model.name || model.id}
              </Select.Option>
            ))}
          </Select>
        </div>

        {/* Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Prompt Presets
            </label>
            <Button
              size="small"
              type="link"
              onClick={() => setShowPresets(!showPresets)}
            >
              {showPresets ? 'Hide' : 'Show'} Presets
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
            System Prompt
          </label>
          <Input.TextArea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Enter system prompt..."
            className="text-sm"
          />
        </div>

        {/* User Prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            User Prompt Prefix
            <span className="text-xs text-gray-500 ml-2">
              (prepended before content)
            </span>
          </label>
          <Input.TextArea
            value={userPrefix}
            onChange={(e) => setUserPrefix(e.target.value)}
            rows={3}
            placeholder="Optional: Enter text to prepend before the media content..."
            className="text-sm"
          />
        </div>
      </div>
    </Modal>
  )
}
