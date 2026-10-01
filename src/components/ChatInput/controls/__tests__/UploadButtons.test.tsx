import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { UploadImageButton } from '../UploadImageButton'
import { UploadDocumentButton } from '../UploadDocumentButton'

describe('Upload buttons', () => {
  it('UploadImageButton renders and calls onClick, respects hidden and disabled', () => {
    const onClick = vi.fn()
    // visible and enabled
    renderWithProviders(
      <UploadImageButton title="Upload image" onClick={onClick} />
    )
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)

    // hidden => not rendered
    const { container } = renderWithProviders(
      <UploadImageButton title="Upload image" onClick={() => {}} hidden />
    )
    expect(container.firstChild).toBeNull()

    // disabled
    renderWithProviders(
      <UploadImageButton title="Upload image" onClick={() => {}} disabled />
    )
    const disabledBtn = screen.getAllByRole('button')[1] as HTMLButtonElement
    expect(disabledBtn.disabled).toBe(true)
  })

  it('UploadDocumentButton renders and calls onClick, respects disabled', () => {
    const onClick = vi.fn()
    renderWithProviders(
      <UploadDocumentButton title="Upload doc" onClick={onClick} />
    )
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)

    // disabled
    renderWithProviders(
      <UploadDocumentButton title="Upload doc" onClick={() => {}} disabled />
    )
    const disabledBtn = screen.getAllByRole('button')[1] as HTMLButtonElement
    expect(disabledBtn.disabled).toBe(true)
  })
})
