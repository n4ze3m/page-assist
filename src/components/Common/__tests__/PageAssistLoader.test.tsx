import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageAssistLoader } from '../PageAssistLoader'

describe('PageAssistLoader', () => {
  it('renders loading overlay', () => {
    render(<PageAssistLoader />)
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
  })
})
