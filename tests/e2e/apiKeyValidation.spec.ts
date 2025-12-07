import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('API Key validation', () => {
  let server: MockTldwServer

  test.beforeAll(async () => {
    server = new MockTldwServer()
    await server.start()
  })

  test.afterAll(async () => {
    await server.stop()
  })

  test('rejects invalid key and accepts valid key', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })

    await page.getByLabel('Server URL').fill(server.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()

    // Invalid key
    await page.getByLabel('API Key').fill('fake-key')
    await page.getByRole('button', { name: 'Test Connection' }).click()
    await expect(page.getByText('Connection failed')).toBeVisible()

    // Valid key
    await page.getByLabel('API Key').fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: 'Test Connection' }).click()
    await expect(page.getByText('Connected')).toBeVisible()

    await context.close()
  })
})
