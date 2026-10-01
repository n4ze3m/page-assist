import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsLayout } from '../SettingsOptionLayout'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

// Lightly mock OllamaIcon import used by SettingsOptionLayout menu
vi.mock('../../Icons/Ollama', () => ({ OllamaIcon: (props: any) => <svg data-testid="ollama" {...props} /> }))

describe('SettingsLayout', () => {
  it('renders provided children', () => {
    render(
      <MemoryRouter>
        <SettingsLayout>
          <div>Inner Content</div>
        </SettingsLayout>
      </MemoryRouter>
    )

    expect(screen.getByText('Inner Content')).toBeInTheDocument()
  })
})
