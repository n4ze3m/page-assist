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
    await expect(page.getByRole('button', { name: /Open settings/i })).toBeVisible()

    // Navigate to settings
    await page.getByRole('button', { name: /Open settings/i }).click()
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
})

