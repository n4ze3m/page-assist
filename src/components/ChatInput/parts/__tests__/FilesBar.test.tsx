import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/../test/utils/render'
import { FilesBar } from '../FilesBar'

// Mock PlaygroundFile to a clickable button to simulate remove action
vi.mock('@/components/Option/Playground/PlaygroundFile', () => ({
  PlaygroundFile: ({ file, removeUploadedFile }: any) => (
    <button data-testid={`file-${file.id}`} onClick={() => removeUploadedFile(file)}>
      {file.name ?? String(file.id)}
    </button>
  )
}))

describe('FilesBar', () => {
  it('returns null when no files', () => {
    const { container, rerender } = renderWithProviders(
      <FilesBar files={[]} onRemove={vi.fn()} retrievalEnabled={false} onToggleRetrieval={vi.fn()} retrievalTitle="Toggle" />
    )
    expect(container.firstChild).toBeNull()

    rerender(
      <FilesBar files={undefined as any} onRemove={vi.fn()} retrievalEnabled={false} onToggleRetrieval={vi.fn()} retrievalTitle="Toggle" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders files and supports toggling retrieval', () => {
    const onRemove = vi.fn()
    const onToggle = vi.fn()

    renderWithProviders(
      <FilesBar
        files={[{ id: 1, name: 'A' }, { id: 2, name: 'B' }]}
        onRemove={onRemove}
        retrievalEnabled={true}
        onToggleRetrieval={onToggle}
        retrievalTitle="Toggle"
      />
    )

    // Files rendered via mocked component
    expect(screen.getByTestId('file-1')).toBeInTheDocument()
    expect(screen.getByTestId('file-2')).toBeInTheDocument()

    // Clicking on file triggers remove callback
    fireEvent.click(screen.getByTestId('file-1'))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))

    // AntD Switch renders role="switch" with aria-checked
    const switchEl = screen.getByRole('switch')
    expect(switchEl).toHaveAttribute('aria-checked', 'true')

    // Toggle it
    fireEvent.click(switchEl)
    expect(onToggle).toHaveBeenCalledTimes(1)
    // AntD Switch onChange passes (checked, event). We care that first arg toggled to false.
    expect(onToggle).toHaveBeenCalledWith(false, expect.anything())
  })

  it('renders when retrieval disabled initially and toggles to true; supports files without name', () => {
    const onRemove = vi.fn()
    const onToggle = vi.fn()

    renderWithProviders(
      <FilesBar
        files={[{ id: 10 }, { id: 11, name: 'Named' }]}
        onRemove={onRemove}
        retrievalEnabled={false}
        onToggleRetrieval={onToggle}
        retrievalTitle="Toggle Retrieval"
      />
    )

    // Button text for unnamed file falls back to id
    expect(screen.getByTestId('file-10').textContent).toBe('10')
    expect(screen.getByTestId('file-11').textContent).toBe('Named')

    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(sw)
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith(true, expect.anything())
  })
})
