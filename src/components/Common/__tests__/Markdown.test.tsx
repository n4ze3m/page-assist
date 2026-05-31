import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Markdown from '../Markdown'

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: () => [false]
}))

// Keep i18n simple for any nested components
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

describe('Markdown', () => {
  it('renders inline code and link with target _blank', () => {
    const md = 'Here is `code` and a [link](https://example.com)'
    render(<Markdown message={md} />)

    // inline code present
    expect(screen.getByText('code')).toBeInTheDocument()

    // link present with target and rel
    const link = screen.getByRole('link', { name: 'link' }) as HTMLAnchorElement
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noreferrer')
  })

  it('wraps tables with TableBlock', () => {
    const md = `\n| A | B |\n| - | - |\n| 1 | 2 |\n`
    render(<Markdown message={md} />)
    // Assert table-like structure rendered (TableBlock may strip outer <table>)
    expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument()
  })
})
