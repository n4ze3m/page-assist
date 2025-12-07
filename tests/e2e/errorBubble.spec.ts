import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('Error bubble in chat', () => {
  let server: MockTldwServer
  test.beforeAll(async () => {
    server = new MockTldwServer()
    await server.start()
  })
  test.afterAll(async () => { await server.stop() })

  test('shows Invalid API key error as assistant message', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })
    await page.getByLabel('Server URL').fill(server.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('wrong-key')
    await page.getByRole('button', { name: 'Save' }).click()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('hello')
    await input.press('Enter')

    // Friendly summary and next-step guidance
    const summary = page.getByText(/couldn.?t reach your tldw server/i)
    await expect(summary).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByText(/open settings .*tldw server/i)
    ).toBeVisible()

    // Error bubble should be announced as an alert
    const alert = page
      .getByRole('alert')
      .filter({ hasText: /couldn.?t reach your tldw server/i })
    await expect(alert).toBeVisible()

    // Technical details remain available behind a toggle
    const toggle = page.getByRole('button', {
      name: /show technical details/i
    })
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(page.getByText(/Invalid X-API-KEY/i)).toBeVisible()

    await context.close()
  })
})
