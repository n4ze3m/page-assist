import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NewChat } from '../NewChat'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

vi.mock('@/hooks/useMessageOption', () => ({
  useMessageOption: () => ({ temporaryChat: false, setTemporaryChat: vi.fn(), messages: [] })
}))

vi.mock('@/utils/is-private-mode', () => ({ isFireFoxPrivateMode: false }))

vi.mock('antd', () => ({ Tooltip: ({ children }: any) => <>{children}</> }))

describe('NewChat', () => {
  it('calls clearChat when clicking new chat button', () => {
    const clearChat = vi.fn()
    render(<NewChat clearChat={clearChat} />)
    fireEvent.click(screen.getByRole('button', { name: /newChat/i }))
    expect(clearChat).toHaveBeenCalled()
  })
})
