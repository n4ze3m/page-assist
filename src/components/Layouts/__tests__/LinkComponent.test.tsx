import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LinkComponent } from '../LinkComponent'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

const DummyIcon = (props: any) => <svg data-testid="icon" {...props} />

describe('LinkComponent', () => {
  it('renders link with icon and label', () => {
    render(
      <MemoryRouter>
        {/* @ts-expect-error testing component signature */}
        <LinkComponent
          href="/settings"
          name="Settings"
          icon={DummyIcon}
          current="/"
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('applies active styles when current matches href', () => {
    render(
      <MemoryRouter>
        {/* @ts-expect-error testing component signature */}
        <LinkComponent
          href="/settings"
          name="Settings"
          icon={DummyIcon}
          current="/settings"
        />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /Settings/i })
    expect(link.className).toMatch(/bg-gray-100/)
  })
})
