import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from '../DocumentCard'

describe('DocumentCard', () => {
  it('renders file name and triggers onRemove', () => {
    const onRemove = vi.fn()
    render(<DocumentCard name="file.pdf" onRemove={onRemove} />)

    expect(screen.getByText('file.pdf')).toBeInTheDocument()

    // Click the absolute-positioned remove button inside the card
    const removeBtn = screen.getByRole('button', { name: /remove/i }) as HTMLButtonElement
    expect(removeBtn).toBeTruthy()
    fireEvent.click(removeBtn)
    expect(onRemove).toHaveBeenCalled()
  })

  it('marks container busy and disables remove when loading', () => {
    const onRemove = vi.fn()
    const { container } = render(<DocumentCard name="doc.txt" onRemove={onRemove} loading />)

    // container has aria-busy
    const group = container.querySelector('[role="group"]') as HTMLElement
    expect(group).toBeTruthy()
    expect(group.getAttribute('aria-busy')).toBe('true')

    // remove button disabled
    const removeBtn = screen.getByRole('button', { name: /remove/i }) as HTMLButtonElement
    expect(removeBtn.disabled).toBe(true)
  })
})
