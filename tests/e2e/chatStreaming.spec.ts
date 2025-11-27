import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('Chat streaming', () => {
  let server: MockTldwServer
  test.beforeAll(async () => {
    server = new MockTldwServer()
    await server.start()
  })
  test.afterAll(async () => { await server.stop() })

  test('streams tokens to chat', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Configure server + API key
    await page.getByLabel('Server URL').fill(server.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: 'Save' }).click()

    // Open the chat (already on options page with chat input)
    const input = page.getByPlaceholder('Type a message...')
    await input.fill('hello')
    await input.press('Enter')

    // Expect the assistant bubble to contain streamed tokens
    await expect(page.getByText(/Hello!?/)).toBeVisible({ timeout: 10_000 })

    await context.close()
  })
})
