import path from 'path'
import { expect, test } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

test.describe('Quick Ingest workflows and UX', () => {
  test('URLs, files, inspector intro, and help flows', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:62731',
        authMode: 'single-user',
        apiKey: API_KEY
      },
      allowOffline: true
    })

    await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

    // Prefer the connection-card CTA (also enables offline bypass)
    const trigger = page
      .getByTestId('open-quick-ingest')
      .or(page.getByRole('button', { name: /open quick ingest/i }))
      .or(page.getByRole('button', { name: /quick ingest/i }))
      .first()
    if (await trigger.count()) {
      await trigger.click()
    } else {
      const offline = page.getByRole('button', { name: /continue offline/i }).first()
      if (await offline.count()) await offline.click()
      await page.getByRole('button', { name: /open quick ingest/i }).first().click()
    }

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tldw:open-quick-ingest'))
    })

    await expect(page.locator('.quick-ingest-modal')).toBeVisible({ timeout: 8000 })

    // Workflow 1: add URLs and see queue + Inspector intro
    const urlInput = page
      .getByLabel(/Paste URLs input/i)
      .or(page.getByPlaceholder(/https:\/\/example\.com/i))
      .first()
    await urlInput.click()
    await urlInput.fill('https://example.com, https://example.org')
    await page.getByRole('button', { name: /Add URLs/i }).click()

    const firstUrlRow = page.getByText('https://example.com').first()
    await expect(firstUrlRow).toBeVisible()
    await firstUrlRow.click()

    const intro = page.getByText(/How to use the Inspector/i)
    await expect(intro).toBeVisible()
    await expect(page.getByRole('button', { name: /Dismiss Inspector intro and close/i })).toBeVisible()
    await page.getByRole('button', { name: /Dismiss Inspector intro and close/i }).click()
    await expect(intro).toBeHidden()

    // Workflow 2: reopen intro via help button
    await page.getByRole('button', { name: /Open Inspector intro/i }).click()
    await expect(intro).toBeVisible()

    // Workflow 3: upload a file, open Inspector, toggle options
    const sampleFile = path.resolve(__dirname, '..', '..', 'README.md')
    await page.setInputFiles('#qi-file-input', sampleFile)

    const fileRow = page.getByText('README.md').first()
    await expect(fileRow).toBeVisible()
    await fileRow.click()

    await expect(page.getByText(/File settings follow/i)).toBeVisible()

    const analysisToggle = page.getByLabel(/Ingestion options .*analysis/i)
    await analysisToggle.click()
    const chunkingToggle = page.getByLabel(/Ingestion options .*chunking/i)
    await chunkingToggle.click()

    // Snapshot for UX review
    await page.screenshot({ path: '/tmp/quick-ingest-workflows.png', fullPage: true })
    await context.close()
  })
})
