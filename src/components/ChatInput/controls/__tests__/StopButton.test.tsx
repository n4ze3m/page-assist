import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { StopButton } from '../StopButton'

describe('StopButton', () => {
  it('renders and triggers onStop when clicked', () => {
    const onStop = vi.fn()
    renderWithProviders(<StopButton title="Stop" onStop={onStop} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onStop).toHaveBeenCalledTimes(1)
  })
})
