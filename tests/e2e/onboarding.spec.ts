import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('Onboarding wizard', () => {
  let server: MockTldwServer

  test.beforeAll(async () => {
    server = new MockTldwServer()
    await server.start()
  })
  test.afterAll(async () => { await server.stop() })

  test('guides first-run config and tests connection', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Wizard visible
    await expect(page.getByText(/Let’s get you connected/i)).toBeVisible()

    // Step 1: server URL
    await page.getByPlaceholder('http://localhost:8000').fill(server.url)
    await page.getByRole('button', { name: /Next/i }).click()

    // Step 2: Single user + API key
    await page.getByText('Single User (API Key)').click()
    await page.getByPlaceholder('Enter your API key').fill('test-valid-key')
    await page.getByRole('button', { name: /Continue/i }).click()

    // Step 3: Connection shows Connected
    await expect(page.getByText(/Connection:/)).toBeVisible()
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10_000 })

    // Finish and expect chat UI
    await page.getByRole('button', { name: /Finish/i }).click()
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible()

    await context.close()
  })
})
