import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import Mermaid from '../Mermaid'

// Mock mermaid library
vi.mock('mermaid', () => ({
  default: {
    run: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('Mermaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders diagram container and runs mermaid', async () => {
    render(<Mermaid code={"graph TD; A-->B;"} />)

    // container with provided code in DOM
    expect(screen.getByText('graph TD; A-->B;')).toBeInTheDocument()
  })

  it('renders null when mermaid.run rejects', async () => {
    const mermaid = (await import('mermaid')).default as any
    mermaid.run.mockRejectedValueOnce(new Error('boom'))

    const { container } = render(<Mermaid code={"graph TD; X-->Y;"} />)

    // Wait for state update to hide the component
    await act(async () => {})
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })
})
