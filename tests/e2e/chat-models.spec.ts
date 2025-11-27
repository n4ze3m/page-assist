import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('Chat across tldw models', () => {
  let server: MockTldwServer

  test.beforeAll(async () => {
    server = new MockTldwServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.stop()
  })

  test('lists multiple tldw models and can chat with a non-default model', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Configure server + API key
    await page.getByLabel('Server URL').fill(server.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: 'Save' }).click()

    // Open model selector and verify multiple providers are surfaced
    await page.getByRole('button', { name: /Select a model/i }).click()

    await expect(
      page.getByRole('menuitem', { name: /gpt-4\.1-mini/i })
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: /claude-3\.5-sonnet/i })
    ).toBeVisible()
    await expect(
      page.getByRole('menuitem', { name: /mistral-small/i })
    ).toBeVisible()

    // Pick a non-OpenAI model (Anthropic) and send a message
    await page.getByRole('menuitem', { name: /claude-3\.5-sonnet/i }).click()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('hello from claude')
    await input.press('Enter')

    // Expect streamed assistant reply to appear
    await expect(page.getByText(/Hello!?/)).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('shows an assistant error bubble when chat completions fail server-side', async () => {
    // Start a server that returns a 500 for chat completions
    const errorServer = new MockTldwServer({
      '/api/v1/chat/completions': (req, res) => {
        res.writeHead(500, {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
          'access-control-allow-credentials': 'true'
        })
        res.end(JSON.stringify({ detail: 'Chat failed in test' }))
      }
    })
    await errorServer.start()

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    await page.getByLabel('Server URL').fill(errorServer.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: 'Save' }).click()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('hello (should error)')
    await input.press('Enter')

    // Error from chat-helper is rendered as an assistant message
    await expect(
      page.getByText(/Error: Chat failed in test/i)
    ).toBeVisible({ timeout: 10_000 })

    await context.close()
    await errorServer.stop()
  })
})
