import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

// Requires env vars for connected flow
//   TLDW_URL (e.g., http://127.0.0.1:8000)
//   TLDW_API_KEY (single-user auth)

test.describe('UX validation (connected server)', () => {
  test('onboarding → sticky header shortcuts persist + focus; sidepanel ingest menu a11y; health back', async () => {
    const { context, page, openSidepanel, optionsUrl } = await launchWithBuiltExtension()

    // If onboarding is visible, complete it using env vars
    const url = process.env.TLDW_URL || 'http://127.0.0.1:8000'
    const key = process.env.TLDW_API_KEY || ''

    if (await page.getByText('Welcome — Let’s get you connected').isVisible({ timeout: 1000 }).catch(() => false)) {
      // If Next is disabled (server not reachable in CI), directly seed config via chrome.storage
      await page.evaluate(([serverUrl, apiKey]) => new Promise<void>((resolve) => {
        // @ts-ignore
        chrome.storage.local.set({ tldwConfig: { serverUrl, authMode: 'single-user', apiKey } }, () => resolve())
      }), [url, key])
      await page.reload()
      await page.waitForLoadState('networkidle')
    }

    // Navigate to a route that always renders the header (bypasses onboarding layout)
    await page.goto(optionsUrl + '#/media')
    await page.waitForLoadState('networkidle')

    // We should be on Options with header visible
    // Toggle shortcuts and verify persistence + focus behavior
    const toggle = page.getByRole('button', { name: /Show shortcuts|Hide shortcuts/i })
    await toggle.click()
    // After expanding, focus should move to first shortcut link
    const firstShortcut = page.getByRole('link', { name: /Review|Media|Settings/i }).first()
    await expect(firstShortcut).toBeFocused()

    // Navigate away and back to ensure the state persists
    await page.goto(optionsUrl + '#/media')
    await page.waitForLoadState('networkidle')
    await page.goto(optionsUrl)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /Hide shortcuts/i })).toBeVisible()

    // Collapse using Escape key from within the region
    await firstShortcut.press('Escape')
    await expect(page.getByRole('button', { name: /Show shortcuts/i })).toBeVisible()

    // Sidepanel quick ingest a11y
    const sp = await openSidepanel()
    const ingestBtn = sp.getByRole('button', { name: /Ingest/i })
    await ingestBtn.click()
    await expect(ingestBtn).toHaveAttribute('aria-expanded', 'true')
    await sp.getByText(/Save current page on server/i).click()
    await expect(ingestBtn).toHaveAttribute('aria-expanded', 'false')

    // Health Status descriptions, back button + copy diagnostics
    await page.goto(optionsUrl + '#/settings/health')
    await expect(
      page.getByText(/Knowledge search & retrieval/i)
    ).toBeVisible()
    // When no server URL is configured, an onboarding-style banner should be visible
    // (in connected test runs this may be configured; tolerate either state but
    // assert that the banner text resolves when serverUrl is empty).
    if (
      await page
        .getByText(/Server is not configured/i)
        .isVisible({ timeout: 1000 })
        .catch(() => false)
    ) {
      await expect(
        page.getByText(/Don’t have a server yet\?/i)
      ).toBeVisible()
      await expect(
        page.getByText(/Learn how tldw server works/i)
      ).toBeVisible()
    }
    await expect(page.getByRole('button', { name: /Back to chat/i })).toBeVisible()
    const copyBtn = page.getByRole('button', { name: /Copy diagnostics/i })
    await copyBtn.click()
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('serverUrl')
    // Back
    await page.getByRole('button', { name: /Back to chat/i }).click()
    await expect(page).toHaveURL(optionsUrl)

    await context.close()
  })
})
