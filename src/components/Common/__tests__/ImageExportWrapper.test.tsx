import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImageExportWrapper } from '../ImageExport'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

vi.mock('@/db/dexie/models', () => ({
  removeModelSuffix: (s: string) => s
}))

vi.mock('../Markdown', () => ({
  default: ({ message }: { message: string }) => <div data-testid="markdown">{message}</div>
}))

const baseMsg = (override?: Partial<any>) => ({
  isBot: false,
  modelImage: '',
  name: 'User',
  modelName: '',
  message: 'hello',
  images: [],
  ...override
})

describe('ImageExportWrapper', () => {
  it('renders user and bot messages with markdown', () => {
    const messages = [
      baseMsg({ isBot: false, message: 'hi' }),
      baseMsg({ isBot: true, name: 'Model', message: 'hey', modelName: 'gpt' })
    ]

    render(<ImageExportWrapper messages={messages as any} />)

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('gpt')).toBeInTheDocument()
    expect(screen.getAllByTestId('markdown')).toHaveLength(2)
  })

  it('renders images if provided', () => {
    const messages = [
      baseMsg({ isBot: true, message: 'see', images: ['data:image/png;base64,abc'] })
    ]

    const { container } = render(<ImageExportWrapper messages={messages as any} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBeGreaterThan(0)
  })
})
