import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Markdown from '../Markdown'

vi.mock('react-i18next', () => ({
  // Markdown itself doesn't use t, but downstream components may
  useTranslation: () => ({ t: (k: string) => k })
}))

// Mock CodeBlock to avoid heavy highlighter dependency rendering
vi.mock('../CodeBlock', () => ({
  CodeBlock: ({ language, value }: { language: string; value: string }) => (
    <div data-testid="code-block-mock">{language}:{value}</div>
  )
}))

// Mock @plasmohq/storage/hook to avoid actual storage access
vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: () => [false]
}))

describe('Markdown', () => {
  it('renders paragraphs, links, and code blocks via CodeBlock', () => {
    const md = `Paragraph with a [link](https://example.com)\n\n\`\`\`js\nconsole.log("hi")\n\`\`\``
    render(<Markdown message={md} />)

    expect(screen.getByText('Paragraph with a')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'link' }) as HTMLAnchorElement
    expect(link.href).toContain('https://example.com')

    const code = screen.getByTestId('code-block-mock')
    expect(code).toHaveTextContent('js:console.log("hi")')
  })
})
