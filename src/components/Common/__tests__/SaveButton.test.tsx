import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { SaveButton } from '../SaveButton'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}))

describe('SaveButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('calls onClick and toggles saved state briefly', async () => {
    const onClick = vi.fn()
    render(<SaveButton onClick={onClick} />)

    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('save')

    await act(async () => {
      fireEvent.click(btn)
    })
    expect(onClick).toHaveBeenCalled()
    expect(btn).toHaveTextContent('saved')

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(btn).toHaveTextContent('save')
  })
})
