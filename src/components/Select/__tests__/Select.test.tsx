import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageAssistSelect, type SelectOption } from '../index'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

describe('PageAssistSelect', () => {
  const options: SelectOption[] = [
    { label: 'Alpha', value: 'a' },
    { label: 'Beta', value: 'b' },
    { label: 'Gamma', value: 'c' }
  ]

  it('renders placeholder and opens dropdown', () => {
    const onChange = vi.fn()
    render(
      <PageAssistSelect options={options} onChange={onChange} placeholder="Pick one" />
    )

    expect(screen.getByText('Pick one')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
  })

  it('filters by search and selects option', () => {
    const onChange = vi.fn()
    render(
      <PageAssistSelect options={options} onChange={onChange} placeholder="Pick one" />
    )

    fireEvent.click(screen.getByRole('combobox'))
    const search = screen.getByRole('textbox', { name: /search options/i })
    fireEvent.change(search, { target: { value: 'bet' } })
    expect(screen.queryByRole('option', { name: 'Alpha' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Beta' }))
    expect(onChange).toHaveBeenCalledWith({ label: 'Beta', value: 'b' })
  })
})
