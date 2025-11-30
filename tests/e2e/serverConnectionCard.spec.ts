import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('ServerConnectionCard states', () => {
  test('missing-config shows Open settings and navigates', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Card visible with missing-config state (headline + primary CTA)
    await expect(
      page.getByText(/Connect tldw Assistant to your server/i)
    ).toBeVisible()
    // Shared server overview block and docs CTA should be present.
    await expect(
      page.getByText(/How tldw server fits into this extension/i)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /View server setup guide/i })
    ).toBeVisible()
    // Primary CTA should clearly guide users to configure the server
    await expect(page.getByRole('button', { name: /Set up server/i })).toBeVisible()

    // Navigate to settings
    await page.getByRole('button', { name: /Set up server/i }).click()
    await expect(page.getByText(/tldw Server Configuration/i)).toBeVisible()

    await context.close()
  })

  test('connected state focuses composer on Start chatting', async () => {
    const server = new MockTldwServer()
    await server.start()

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed config directly in extension storage
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: server.url, authMode: 'single-user', apiKey: 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY' })

    await page.reload()

    // Should show Start chatting and focus the textarea on click
    await expect(page.getByRole('button', { name: /Start chatting/i })).toBeVisible()
    await page.getByRole('button', { name: /Start chatting/i }).click()
    await expect(page.locator('#textarea-message')).toBeFocused()

    await context.close()
    await server.stop()
  })

  test('unreachable state shows Troubleshooting guide', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Unreachable URL (ensure any existing config is cleared first)
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        // @ts-ignore
        chrome.storage.local.clear(() => resolve())
      })
    })

    // Unreachable URL
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: 'http://127.0.0.1:65535', authMode: 'single-user' })

    await page.reload()

    // Primary CTA now focuses troubleshooting rather than a generic retry.
    const primaryCta = page.getByRole('button', {
      name: /Troubleshoot connection|Retry connection/i
    })
    await expect(primaryCta).toBeVisible()

    // Advanced troubleshooting options are hidden behind a toggle by default.
    const advancedToggle = page.getByRole('button', {
      name: /More troubleshooting options/i
    })
    await expect(advancedToggle).toBeVisible()
    await advancedToggle.click()

    // Advanced panel exposes offline + Quick Ingest paths and docs.
    await expect(
      page.getByRole('button', { name: /Continue offline/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Open Quick Ingest intro/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Open Quick Ingest/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Help docs/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Health & diagnostics/i })
    ).toBeVisible()

    // Even before enabling offline mode, users should see a short hint
    // that Quick Ingest can queue items while offline.
    await expect(
      page.getByText(/Quick Ingest can queue URLs and files/i)
    ).toBeVisible()

    // Enabling offline mode should surface a clear hint about staging.
    await page.getByRole('button', { name: /Continue offline/i }).click()
    await expect(
      page.getByText(/Quick Ingest works as a staging area/i)
    ).toBeVisible()

    // Offline mode badge is visible on the card.
    await expect(
      page.getByText(/Offline mode \u2014 staging only/i)
    ).toBeVisible()

    // Advanced panel now offers a reversible toggle.
    const disableOffline = page.getByRole('button', {
      name: /Disable offline mode/i
    })
    await expect(disableOffline).toBeVisible()
    await disableOffline.click()

    // Once disabled, we fall back to the regular error state.
    await expect(
      page.getByRole('button', { name: /Continue offline/i })
    ).toBeVisible()

    await expect(
      page.getByText(/Offline mode \u2014 staging only/i)
    ).toBeHidden()

    await context.close()
  })

  test('diagnostics link from connection card opens Health & diagnostics in a new tab', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // First-run: connection card should be visible with diagnostics entry point
    await expect(
      page.getByText(/Can.?t reach your tldw server|Connect tldw Assistant to your server/i)
    ).toBeVisible()

    const [healthPage] = await Promise.all([
      context.waitForEvent('page'),
      page
        .getByRole('button', {
          name: /Health & diagnostics|Open diagnostics|View diagnostics/i
        })
        .click()
    ])

    await healthPage.waitForLoadState('domcontentloaded')
    await expect(healthPage).toHaveURL(/options\.html#\/settings\/health/i)
    await expect(
      healthPage.getByText(/Health & diagnostics|Health Status/i)
    ).toBeVisible()

    await context.close()
  })

  test('header status chips and Diagnostics link navigate to Health & diagnostics', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    // Navigate to a route that always shows the main header
    await page.goto(`${optionsUrl}#/media`)

    // Header should use plain-language labels for connection status
    await expect(page.getByText(/Server: /i)).toBeVisible()
    await expect(page.getByText(/Knowledge: /i)).toBeVisible()

    // Old "Core"/"RAG" labels should not appear in the header
    await expect(page.getByText(/Core:/i)).toBeHidden()
    await expect(page.getByText(/RAG/i)).toBeHidden()

    // Server status pill opens Health & diagnostics
    await page.getByRole('button', { name: /Server:/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)
    await expect(page.getByText(/Health & diagnostics/i)).toBeVisible()

    // Navigate back to a content route and verify Knowledge pill
    await page.goto(`${optionsUrl}#/media`)
    await page.getByRole('button', { name: /Knowledge:/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)

    // Navigate back again and verify the header Diagnostics link
    await page.goto(`${optionsUrl}#/media`)
    await page.getByRole('link', { name: /Health & diagnostics/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)

    await context.close()
  })
})
