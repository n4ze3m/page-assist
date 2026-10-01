import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { SpeechButton } from '../SpeechButton'

describe('SpeechButton', () => {
  it('renders mic icon when not listening', () => {
    const onToggle = vi.fn()
    renderWithProviders(
      <SpeechButton title="Start" isListening={false} onToggle={onToggle} />
    )

    // The button should be in the document
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // Clicking triggers onToggle
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders ping indicator when listening', () => {
    const onToggle = vi.fn()
    renderWithProviders(
      <SpeechButton title="Stop" isListening={true} onToggle={onToggle} />
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // The animated indicator exists (via className animate-ping)
    const ping = screen.getByText((_, element) => {
      return element?.classList.contains('animate-ping') ?? false
    })
    expect(ping).toBeInTheDocument()
  })
})
