import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BetaTag } from '../Beta'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

describe('BetaTag', () => {
  it('renders translated beta tag', () => {
    render(<BetaTag className="my-class" />)
    const el = screen.getByText('beta')
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('my-class')
  })
})
