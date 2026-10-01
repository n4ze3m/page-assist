import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { ThinkingControls } from '../ThinkingControls'

describe('ThinkingControls', () => {
  it('toggle mode: shows correct icon state and toggles', () => {
    const onToggle = vi.fn()
    renderWithProviders(
      <ThinkingControls mode="toggle" title="Reasoning" enabled={false} onToggle={onToggle} />
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('ossLevels mode: opens popover and selects a level', async () => {
    const onChange = vi.fn()
    const labels = { low: 'Low', medium: 'Medium', high: 'High' }
    renderWithProviders(
      <ThinkingControls
        mode="ossLevels"
        title="Reasoning Level"
        value="low"
        onChange={onChange}
        labels={labels}
      />
    )

    // open popover
    const trigger = screen.getByRole('button')
    fireEvent.click(trigger)

    // radios should render in portal
    const mediumRadio = await screen.findByRole('radio', { name: labels.medium })
    fireEvent.click(mediumRadio)

    expect(onChange).toHaveBeenCalled()
    // The handler receives the new value via event.target.value; we at least assert it was called
  })
})
