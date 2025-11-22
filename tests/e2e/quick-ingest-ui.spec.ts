import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

test.describe('Quick ingest modal', () => {
  test('opens and filters advanced fields without server', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: { serverUrl: 'http://127.0.0.1:8000', authMode: 'single-user', apiKey: 'dummy' } }, () => resolve())
    }))
    await page.reload({ waitUntil: 'domcontentloaded' })

    const ingestButton = page.getByRole('button', { name: /Quick ingest/i }).first()
    await expect(ingestButton).toBeVisible()
    await ingestButton.click()

    const modal = page.locator('.quick-ingest-modal .ant-modal-content')
    await expect(modal).toBeVisible()

    await page.getByText('Advanced options').click()
    await page.getByPlaceholder('Search advanced fields...').fill('embedding')

    await expect(page.getByText(/advanced fields loaded/i)).toBeVisible()
    await expect(modal.getByText(/embedding/i).first()).toBeVisible()

    await context.close()
  })
})
