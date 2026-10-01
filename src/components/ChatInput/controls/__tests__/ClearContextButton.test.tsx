import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { ClearContextButton } from '../ClearContextButton'

describe('ClearContextButton', () => {
  it('renders and calls onClear when clicked', () => {
    const onClear = vi.fn()
    renderWithProviders(<ClearContextButton title="Clear" onClear={onClear} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('returns null when hidden', () => {
    const { container } = renderWithProviders(
      <ClearContextButton title="Clear" onClear={() => {}} hidden />
    )
    expect(container.firstChild).toBeNull()
  })
})
