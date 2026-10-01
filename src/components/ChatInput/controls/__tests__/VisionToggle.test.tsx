import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { VisionToggle } from '../VisionToggle'

describe('VisionToggle', () => {
  it('renders eye-off for normal mode and toggles on click', () => {
    const onToggle = vi.fn()
    renderWithProviders(
      <VisionToggle title="Vision" mode="normal" onToggle={onToggle} />
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders eye icon for vision mode', () => {
    renderWithProviders(
      <VisionToggle title="Vision" mode="vision" onToggle={() => {}} />
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('is hidden when hidden prop is true', () => {
    const { container } = renderWithProviders(
      <VisionToggle title="Vision" mode="normal" onToggle={() => {}} hidden />
    )
    expect(container.firstChild).toBeNull()
  })

  it('is disabled when disabled prop is true', () => {
    renderWithProviders(
      <VisionToggle title="Vision" mode="normal" onToggle={() => {}} disabled />
    )
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('renders disabled hidden button in rag mode and does not call onToggle on click', () => {
    const onToggle = vi.fn()
    renderWithProviders(
      <VisionToggle title="Vision" mode="rag" onToggle={onToggle} />
    )
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn).toBeInTheDocument()
    expect(btn.disabled).toBe(true)
    expect(btn.className).toMatch(/hidden/)
    // Clicking should not call onToggle since button is disabled
    fireEvent.click(btn)
    expect(onToggle).not.toHaveBeenCalled()
  })
})
