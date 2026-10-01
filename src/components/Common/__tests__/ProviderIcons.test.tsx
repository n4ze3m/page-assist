import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProviderIcons } from '../ProviderIcon'

const cases = [
  'chrome','custom','fireworks','groq','lmstudio','openai','together','openrouter','llamafile','gemini','mistral','deepseek','siliconflow','volcengine','tencentcloud','alibabacloud','llamacpp','infinitenceai','novita','vllm','moonshot','xai','huggingface','vercel','chutes','anthropic','unknown'
]

describe('ProviderIcons', () => {
  it('renders an svg for known providers and default for unknown', () => {
    for (const provider of cases) {
      const { container, unmount } = render(<ProviderIcons provider={provider} className="w-4 h-4" />)
      // Expect at least one SVG element to be present
      expect(container.querySelector('svg')).toBeTruthy()
      unmount()
    }
  })
})
