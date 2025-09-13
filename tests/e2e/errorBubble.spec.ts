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
    const { context, page } = await launchWithExtension(extPath)

    await page.getByLabel('Server URL').fill(server.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('wrong-key')
    await page.getByRole('button', { name: 'Save' }).click()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('hello')
    await input.press('Enter')

    await expect(page.getByText(/Error: Invalid X-API-KEY/i)).toBeVisible({ timeout: 10_000 })

    await context.close()
  })
})

