import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('ServerConnectionCard states', () => {
  test('missing-config shows Open settings and navigates', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Card visible with missing-config state
    await expect(page.getByText(/Waiting for your tldw server/i)).toBeVisible()
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
    }), { serverUrl: server.url, authMode: 'single-user', apiKey: 'test-valid-key' })

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

    // Unreachable URL
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: 'http://127.0.0.1:65535', authMode: 'single-user' })

    await page.reload()
    await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible()
    await expect(page.getByText(/Troubleshooting guide/i)).toBeVisible()

    await context.close()
  })

  test('diagnostics link from connection card opens Health Status in a new tab', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // First-run: connection card should be visible with diagnostics entry point
    await expect(page.getByText(/Waiting for your tldw server/i)).toBeVisible()

    const [healthPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /Open diagnostics|View diagnostics/i }).click()
    ])

    await healthPage.waitForLoadState('domcontentloaded')
    await expect(healthPage).toHaveURL(/options\.html#\/settings\/health/i)
    await expect(healthPage.getByText(/Health Status/i)).toBeVisible()

    await context.close()
  })

  test('header status chips and Diagnostics link navigate to Health Status', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    // Navigate to a route that always shows the main header
    await page.goto(`${optionsUrl}#/media`)

    // Header should use plain-language labels for connection status
    await expect(page.getByText(/Server: /i)).toBeVisible()
    await expect(page.getByText(/Knowledge: /i)).toBeVisible()

    // Old "Core"/"RAG" labels should not appear in the header
    const coreLabelVisible = await page
      .getByText(/Core:/i)
      .isVisible()
      .catch(() => false)
    const ragLabelVisible = await page
      .getByText(/RAG/i)
      .isVisible()
      .catch(() => false)
    expect(coreLabelVisible || ragLabelVisible).toBeFalsy()

    // Server status pill opens Health Status
    await page.getByRole('button', { name: /Server:/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)
    await expect(page.getByText(/Health Status/i)).toBeVisible()

    // Navigate back to a content route and verify Knowledge pill
    await page.goto(`${optionsUrl}#/media`)
    await page.getByRole('button', { name: /Knowledge:/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)

    // Navigate back again and verify the header Diagnostics link
    await page.goto(`${optionsUrl}#/media`)
    await page.getByRole('link', { name: /Diagnostics/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)

    await context.close()
  })
})
