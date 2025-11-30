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

  // Step 1: server URL – scroll wizard into view first
  const urlInput = page.getByLabel(/Server URL/i)
  await urlInput.scrollIntoViewIfNeeded()
  await urlInput.fill(server.url)

    // Docs link is visible and opens the server docs (href or target may vary by browser)
    const docsLink = page.getByRole('button', { name: /Learn how tldw server works/i })
    await expect(docsLink).toBeVisible()
    await page.getByRole('button', { name: /Next/i }).click()

    // Step 2: Single user + API key
    await page.getByText('Single User (API Key)').click()
    await page.getByPlaceholder('Enter your API key').fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: /Continue/i }).click()

    // Step 3: Connection shows Connected
    await expect(page.getByText(/Connection:/)).toBeVisible()
    await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10_000 })

    // Finish and expect chat UI
    await page.getByRole('button', { name: /Finish/i }).click()
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible()

    await context.close()
  })

  test('does not auto-advance when URL becomes reachable', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    await expect(
      page.getByText(/Let’s get you connected/i)
    ).toBeVisible()

    const urlInput = page.getByLabel(/Server URL/i)
    await urlInput.scrollIntoViewIfNeeded()
    await urlInput.fill(server.url)

    await expect(
      page.getByText(/Server responded successfully\. You can continue\./i)
    ).toBeVisible()

    await expect(
      page.getByText(/Authentication Mode/i)
    ).toHaveCount(0)

    await page.getByRole('button', { name: /Next/i }).click()
    await expect(
      page.getByText(/Authentication Mode/i)
    ).toBeVisible()

    await context.close()
  })

  test('explains knowledge search health in plain language', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    await expect(
      page.getByText(/Let’s get you connected/i)
    ).toBeVisible()

    const urlInput = page.getByLabel(/Server URL/i)
    await urlInput.scrollIntoViewIfNeeded()
    await urlInput.fill(server.url)
    await page.getByRole('button', { name: /Next/i }).click()

    await page.getByText('Single User (API Key)').click()
    await page
      .getByPlaceholder(/Enter your API key/i)
      .fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(
      page.getByText(/Connection:/i)
    ).toBeVisible()

    await expect(
      page.getByText(/Knowledge search & retrieval:/i)
    ).toBeVisible()

    await expect(
      page.getByText(
        /search your notes, media, and other connected knowledge sources/i
      )
    ).toBeVisible()

    // Finish without connecting path uses friendly copy when forced failure
    // (simulate by forcing a failed connection state in the UI)
    await page.reload()
    await expect(
      page.getByText(/Let’s get you connected/i)
    ).toBeVisible()

    const urlInput2 = page.getByLabel(/Server URL/i)
    await urlInput2.scrollIntoViewIfNeeded()
    await urlInput2.fill('http://127.0.0.1:9999')
    await page.getByRole('button', { name: /Next/i }).click()

    await page.getByText('Single User (API Key)').click()
    await page
      .getByPlaceholder(/Enter your API key/i)
      .fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: /Continue/i }).click()

    await expect(
      page.getByText(/You can finish setup now and explore the UI without a server/i)
    ).toBeVisible()

    await context.close()
  })
})
