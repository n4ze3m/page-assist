import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { ImagePreview } from '../ImagePreview'

// Mock antd Image to a plain img for jsdom simplicity
vi.mock('antd', () => ({
  Image: ({ preview, ...rest }: any) => <img {...rest} />
}))

describe('ImagePreview', () => {
  it('returns null when src is empty', () => {
    const { container } = renderWithProviders(
      // src empty triggers early return null
      // onClear should not be required to be called
      <ImagePreview src="" onClear={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders image and triggers onClear when clicking close', () => {
    const onClear = vi.fn()
    renderWithProviders(<ImagePreview src="data:image/png;base64,abc" onClear={onClear} />)

    const img = screen.getByAltText('Uploaded Image') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img.src).toContain('data:image/png;base64,abc')

    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('applies optional dark bg class to close button', () => {
    renderWithProviders(
      <ImagePreview src="x" onClear={vi.fn()} closeButtonDarkBgClass="dark:bg-custom" />
    )
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('dark:bg-custom')
  })
})
