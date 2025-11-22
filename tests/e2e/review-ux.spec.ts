import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

test.describe('Review page UX', () => {
  test('shows helpful offline empty state', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl + '#/review')
    await page.waitForLoadState('networkidle')

    // Offline/unauthenticated: show the inline connect prompt.
    const headline = page.getByText(/Connect to use Review/i)
    await expect(headline).toBeVisible()

    const connectCta = page.getByRole('button', { name: /Connect to server/i })
    await expect(connectCta).toBeVisible()

    await context.close()
  })

  test('exposes core search and a11y affordances when connected', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    // Seed the connection store so useServerOnline() reports "online"
    await page.goto(optionsUrl)
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => {
      const store = (window as any).__tldw_useConnectionStore
      if (!store) return
      const prev = store.getState()
      // Disable active network checks for this test run
      store.setState({
        ...prev,
        checkOnce: async () => {}
      })
      store.setState({
        ...store.getState(),
        state: {
          ...store.getState().state,
          isConnected: true
        }
      })
    })

    await page.goto(optionsUrl + '#/review')
    await page.waitForLoadState('networkidle')

    // Left column: search input and Filters toggle
    const searchInput = page.getByPlaceholder(/Search media \(title\/content\)|Search media, notes/i)
    await expect(searchInput).toBeVisible()

    const filtersButton = page.getByRole('button', { name: /^Filters$/i })
    await expect(filtersButton).toBeVisible()
    await expect(filtersButton).toHaveAttribute('aria-expanded', /true/i)
    await filtersButton.click()
    await expect(filtersButton).toHaveAttribute('aria-expanded', /false/i)

    // Result types and generation mode labels should be present
    await expect(page.getByText(/Result types/i)).toBeVisible()
    await expect(page.getByText(/Generation mode/i)).toBeVisible()

    // Vertical sidebar toggle should be keyboard/a11y discoverable
    const sidebarToggle = page.getByRole('button', {
      name: /Toggle results sidebar/i
    })
    await expect(sidebarToggle).toBeVisible()

    // Results header shows a count string like "0 items"
    const resultsHeader = page.getByTestId('review-results-header')
    await expect(resultsHeader).toBeVisible()
    await expect(page.getByText(/items$/i)).toBeVisible()

    await context.close()
  })
})
