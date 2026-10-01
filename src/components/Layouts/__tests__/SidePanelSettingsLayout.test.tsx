import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidePanelSettingsLayout } from '../SidePanelSettingsLayout'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { dir: () => 'ltr' } }) }))
vi.mock('@/assets/icon.png', () => ({ default: 'icon' }))

vi.mock('./LinkComponent', () => ({
  LinkComponent: ({ name }: any) => <div>{typeof name === 'string' ? name : 'name'}</div>
}))

describe('SidePanelSettingsLayout', () => {
  it('renders children content', () => {
    render(
      <MemoryRouter>
        <SidePanelSettingsLayout>
          <div>Child Content</div>
        </SidePanelSettingsLayout>
      </MemoryRouter>
    )

    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })
})
