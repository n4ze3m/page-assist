import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TableBlock } from '../TableBlock'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

// Mock URL for download
beforeEach(() => {
  vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:csv')
  vi.spyOn(window.URL, 'revokeObjectURL').mockReturnValue()
  // Anchor click mock
  vi.spyOn(document, 'createElement')
    .mockImplementation(((tag: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as any
      if (tag === 'a') el.click = vi.fn()
      return el
    }) as any)
  // Clipboard
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TableBlock', () => {
  const table = (
    <table>
      <thead>
        <tr>
          <th>Col A</th>
          <th>Col B</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>2</td>
        </tr>
        <tr>
          <td>3</td>
          <td>4</td>
        </tr>
      </tbody>
    </table>
  )

  it('copies CSV to clipboard', async () => {
    render(<TableBlock>{table}</TableBlock>)

    // first control button is copy
    const copyBtn = screen.getAllByRole('button')[0]
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    const csv = (navigator.clipboard.writeText as any).mock.calls[0][0]
    expect(csv).toContain('Col A,Col B')
    expect(csv).toContain('1,2')
  })

  it('downloads CSV file', async () => {
    const createSpy = vi.spyOn(document, 'createElement')
      .mockImplementation(((tag: string) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as any
        if (tag === 'a') el.click = vi.fn()
        return el
      }) as any)

    render(<TableBlock>{table}</TableBlock>)

    // second control button is download
    const downloadBtn = screen.getAllByRole('button')[1]
    fireEvent.click(downloadBtn)

    expect(createSpy).toHaveBeenCalledWith('a')
    expect(window.URL.createObjectURL).toHaveBeenCalled()
    expect(window.URL.revokeObjectURL).toHaveBeenCalled()
  })
})
