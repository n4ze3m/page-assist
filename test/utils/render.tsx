import React, { PropsWithChildren } from 'react'
import { render } from '@testing-library/react'
import { PageAssistProvider } from '@/components/Common/PageAssistProvider'

// Add more providers (React Query, Router) here as needed
export function renderWithProviders(ui: React.ReactElement, options?: Parameters<typeof render>[1]) {
  const Wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <PageAssistProvider>{children}</PageAssistProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}
