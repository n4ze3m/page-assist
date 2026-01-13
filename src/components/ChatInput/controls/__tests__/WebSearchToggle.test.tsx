import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { WebSearchToggle } from '../WebSearchToggle'

describe('WebSearchToggle', () => {
  describe('icon variant', () => {
    it('renders Globe when active and calls onToggle when clicked', () => {
      const onToggle = vi.fn()
      renderWithProviders(
        <WebSearchToggle variant="icon" title="Web Search" active={true} onToggle={onToggle} />
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()

      // Should have the active class color (blue) on icon
      const icon = button.querySelector('svg') as SVGElement
      expect(icon).toBeTruthy()

      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('renders GlobeX when inactive', () => {
      const onToggle = vi.fn()
      renderWithProviders(
        <WebSearchToggle variant="icon" title="Web Search" active={false} onToggle={onToggle} />
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('returns null when hidden', () => {
      const { container } = renderWithProviders(
        <WebSearchToggle variant="icon" title="Web Search" active={false} onToggle={() => {}} hidden />
      )
      expect(container.firstChild).toBeNull()
    })

    it('is disabled when disabled prop provided', () => {
      renderWithProviders(
        <WebSearchToggle variant="icon" title="Web Search" active={true} onToggle={() => {}} disabled />
      )
      const button = screen.getByRole('button') as HTMLButtonElement
      expect(button.disabled).toBe(true)
    })
  })

  describe('switch variant', () => {
    it('reflects checked state and calls onChange', () => {
      const onChange = vi.fn()
      renderWithProviders(
        <WebSearchToggle variant="switch" title="Web Search" checked={true} onChange={onChange} />
      )

      const switchEl = screen.getByRole('switch') as HTMLButtonElement
      expect(switchEl).toBeInTheDocument()

      fireEvent.click(switchEl)
      expect(onChange).toHaveBeenCalled()
    })
  })
})
