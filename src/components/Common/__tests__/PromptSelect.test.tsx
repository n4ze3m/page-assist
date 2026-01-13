import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PromptSelect } from '../PromptSelect'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

// Mock Dexie helpers
vi.mock('@/db/dexie/helpers', () => ({
  getAllPrompts: vi.fn().mockResolvedValue([
    { id: 'sys-1', title: 'System Prompt', is_system: true, content: 'ignored' },
    { id: 'qp-1', title: 'Quick Prompt', is_system: false, content: 'Do X now' }
  ])
}))

describe('PromptSelect', () => {
  const setup = () => {
    const qc = new QueryClient()
    const setSelectedSystemPrompt = vi.fn()
    const setSelectedQuickPrompt = vi.fn()

    render(
      <QueryClientProvider client={qc}>
        <PromptSelect
          setSelectedQuickPrompt={setSelectedQuickPrompt}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          selectedSystemPrompt={undefined}
        />
      </QueryClientProvider>
    )

    return { setSelectedSystemPrompt, setSelectedQuickPrompt }
  }

  it('renders trigger and shows prompts in dropdown', async () => {
    setup()

    const trigger = await screen.findByRole('button')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('System Prompt')).toBeInTheDocument()
      expect(screen.getByText('Quick Prompt')).toBeInTheDocument()
    })
  })

  it('selecting a system prompt sets selectedSystemPrompt', async () => {
    const { setSelectedSystemPrompt, setSelectedQuickPrompt } = setup()

    const trigger = await screen.findByRole('button')
    fireEvent.click(trigger)

    const sysItem = await screen.findByText('System Prompt')
    fireEvent.click(sysItem)

    await waitFor(() => {
      expect(setSelectedSystemPrompt).toHaveBeenCalledWith('sys-1')
      expect(setSelectedQuickPrompt).not.toHaveBeenCalled()
    })
  })

  it('selecting a quick prompt sets quick prompt and clears system', async () => {
    const { setSelectedSystemPrompt, setSelectedQuickPrompt } = setup()

    const trigger = await screen.findByRole('button')
    fireEvent.click(trigger)

    const qpItem = await screen.findByText('Quick Prompt')
    fireEvent.click(qpItem)

    await waitFor(() => {
      expect(setSelectedSystemPrompt).toHaveBeenCalledWith(undefined)
      expect(setSelectedQuickPrompt).toHaveBeenCalledWith('Do X now')
    })
  })

  it('clicking same selected system prompt toggles off', async () => {
    const qc = new QueryClient()
    const setSelectedSystemPrompt = vi.fn()
    const setSelectedQuickPrompt = vi.fn()

    render(
      <QueryClientProvider client={qc}>
        <PromptSelect
          setSelectedQuickPrompt={setSelectedQuickPrompt}
          setSelectedSystemPrompt={setSelectedSystemPrompt}
          selectedSystemPrompt={'sys-1'}
        />
      </QueryClientProvider>
    )

    const trigger = await screen.findByRole('button')
    fireEvent.click(trigger)

    const sysItem = await screen.findByText('System Prompt')
    fireEvent.click(sysItem)

    await waitFor(() => {
      expect(setSelectedSystemPrompt).toHaveBeenCalledWith(undefined)
    })
  })
})
