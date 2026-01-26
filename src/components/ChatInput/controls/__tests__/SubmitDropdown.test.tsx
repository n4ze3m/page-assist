import React from 'react'
import { describe, it, expect } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { SubmitDropdown } from '../SubmitDropdown'

const items = [
  { key: 'a', label: 'Item A' },
  { key: 'b', label: 'Item B' }
]

describe('SubmitDropdown', () => {
  it('renders two buttons (main and caret) and shows primary label', () => {
    renderWithProviders(
      <SubmitDropdown items={items} icon={null}>
        Send
      </SubmitDropdown>
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('respects disabled prop', () => {
    renderWithProviders(
      <SubmitDropdown items={items} disabled>
        Send
      </SubmitDropdown>
    )
    const btns = screen.getAllByRole('button') as HTMLButtonElement[]
    // main and caret buttons should both be disabled
    expect(btns.some((b) => b.textContent?.match(/send/i))).toBe(true)
    btns.forEach((b) => expect(b.disabled).toBe(true))
  })
})
