import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { DocumentsBar, type DocumentItem } from '../DocumentsBar'

vi.mock('@/components/Option/Playground/DocumentChip', () => ({
  DocumentChip: ({ document, onRemove }: any) => (
    <button data-testid={`doc-${document.id}`} onClick={() => onRemove(document)}>
      {document.title}
    </button>
  )
}))

describe('DocumentsBar', () => {
  it('returns null when no documents', () => {
    const { container, rerender } = renderWithProviders(
      <DocumentsBar documents={[]} onRemove={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()

    rerender(<DocumentsBar documents={undefined as any} onRemove={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders chips for each document and calls onRemove', () => {
    const onRemove = vi.fn()
    const docs: DocumentItem[] = [
      { id: 1, title: 'Doc A', url: 'https://a' },
      { id: 2, title: 'Doc B', url: 'https://b' }
    ]

    renderWithProviders(<DocumentsBar documents={docs} onRemove={onRemove} />)

    expect(screen.getByTestId('doc-1')).toBeInTheDocument()
    expect(screen.getByTestId('doc-2')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('doc-1'))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('wraps chips in scroll container with expected classes', () => {
    const docs: DocumentItem[] = [
      { id: 'a', title: 'A', url: '#' },
      { id: 'b', title: 'B', url: '#' },
      { id: 'c', title: 'C', url: '#' }
    ]
    const { container } = renderWithProviders(
      <DocumentsBar documents={docs} onRemove={vi.fn()} />
    )

    // ensure outer padding container exists
    const outer = container.querySelector('div.p-3')
    expect(outer).toBeTruthy()

    // ensure scroll container exists
    const scroll = container.querySelector('.max-h-24.overflow-y-auto')
    expect(scroll).toBeTruthy()

    // number of chips equals number of docs (mocked as buttons)
    const chips = container.querySelectorAll('button[data-testid^="doc-"]')
    expect(chips.length).toBe(docs.length)
  })
})
