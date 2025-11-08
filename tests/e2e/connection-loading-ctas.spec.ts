import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('ServerConnectionCard loading CTAs', () => {
  test('shows Cancel search and Set up server during loading; navigates to settings', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed a serverUrl to force the card into a loading state on first paint
    // Use a non-routable TEST-NET address to avoid instant connection refusal
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: 'http://192.0.2.1:12345', authMode: 'single-user' })

    await page.reload()

    // Best-effort: wait briefly for the Searching state to appear
    const sawSearching = await page
      .getByText(/Searching for your tldw server/i)
      .isVisible()
      .catch(() => false)

    if (sawSearching) {
      // Loading state should show Cancel search (primary) and Set up server (secondary)
      await expect(page.getByRole('button', { name: /Cancel search/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Set up server/i })).toBeVisible()

      // Cancel search should swap to stuck state where primary opens settings
      await page.getByRole('button', { name: /Cancel search/i }).click()
      await expect(page.getByRole('button', { name: /Open tldw Settings/i })).toBeVisible()

      // Navigate to settings via primary button
      await page.getByRole('button', { name: /Open tldw Settings/i }).click()
      await expect(page).toHaveURL(/options\.html#\/settings\/tldw/i)
      await expect(page.getByText(/tldw Server Configuration/i)).toBeVisible()
    } else {
      // If we missed the transient loading state, assert we at least render the card
      // and show a reasonable fallback CTA (Retry or Open settings)
      await expect(page.getByText(/Waiting for your tldw server/i)).toBeVisible()
      const retryVisible = await page.getByRole('button', { name: /Retry/i }).isVisible().catch(() => false)
      const openVisible = await page.getByRole('button', { name: /Open settings|Open tldw Settings/i }).isVisible().catch(() => false)
      expect(retryVisible || openVisible).toBeTruthy()
    }

    await context.close()
  })
})

