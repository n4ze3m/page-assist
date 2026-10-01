import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeBlock } from '../CodeBlock'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

// Mock SyntaxHighlighter to simplify DOM
vi.mock('react-syntax-highlighter', () => ({ Prism: (props: any) => <pre>{props.children}</pre> }))

// Mock style import
vi.mock('react-syntax-highlighter/dist/cjs/styles/prism', () => ({ coldarkDark: {} }))

describe('CodeBlock', () => {
  beforeEach(() => {
    // clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    })
    // download
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(window.URL, 'revokeObjectURL').mockReturnValue()
    vi.spyOn(document, 'createElement')
      .mockImplementation(((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as any
        if (tag === 'a') {
          el.click = vi.fn()
        }
        return el
      }) as any)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders code and copies to clipboard', async () => {
    render(<CodeBlock language="ts" value={'const a = 1'} />)

    // language label
    expect(screen.getByText('ts')).toBeInTheDocument()

    // click copy (Tooltip does not set accessible name in jsdom, pick the second control button)
    const buttons = screen.getAllByRole('button')
    const copyBtn = buttons[1]
    fireEvent.click(copyBtn)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const a = 1')
  })

  it('downloads content with proper extension', () => {
    const createSpy = vi.spyOn(document, 'createElement')
      .mockImplementation(((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as any
        if (tag === 'a') {
          el.click = vi.fn()
        }
        return el
      }) as any)

    render(<CodeBlock language="javascript" value={'console.log(1)'} />)

    // first control button is download
    const btn = screen.getAllByRole('button')[0]
    fireEvent.click(btn)

    // verify we created an anchor and set download attribute
    expect(createSpy).toHaveBeenCalledWith('a')
    // createObjectURL called
    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('toggles preview controls for previewable language', () => {
    render(<CodeBlock language="html" value={'<b>hi</b>'} />)

    // shows preview toggles
    const codeToggle = screen.getByRole('button', { name: /showCode/i })
    const previewToggle = screen.getByRole('button', { name: /preview/i })
    expect(codeToggle).toBeInTheDocument()
    expect(previewToggle).toBeInTheDocument()

    // click preview should render iframe
    fireEvent.click(previewToggle)
    expect(document.querySelector('iframe')).toBeTruthy()
  })
})
