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

  test('offline mode shows staging banner and pending tags', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      allowOffline: true
    })

    await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

    const ingestButton = page
      .getByRole('button', { name: /Quick ingest/i })
      .first()
    await expect(ingestButton).toBeVisible()
    await ingestButton.click()

    const modal = page.locator('.quick-ingest-modal .ant-modal-content')
    await expect(modal).toBeVisible()

    // Offline banner explains staging-only behavior.
    await expect(
      modal.getByText(/Server offline — staging only/i)
    ).toBeVisible()

    // Add a URL while offline; queued rows should show a pending status.
    const urlInput = page
      .getByLabel(/Paste URLs input/i)
      .or(page.getByPlaceholder(/https:\/\/example\.com/i))
      .first()
    await urlInput.click()
    await urlInput.fill('https://example.com')
    await page.getByRole('button', { name: /Add URLs/i }).click()

    const row = page.getByText('https://example.com').first()
    await expect(row).toBeVisible()

    await expect(
      modal.getByText(/Pending — will run when connected/i)
    ).toBeVisible()

    // Primary action switches to an explicit offline label.
    const offlineAction = modal.getByRole('button', {
      name: /Queue only \u2014 server offline/i
    })
    await expect(offlineAction).toBeVisible()
    await offlineAction.click()
    await expect(
      modal.getByText(/Offline mode: items are queued here until your server is back online\./i)
    ).toBeVisible()

    // Simulate the server coming back online; queued items should be processable.
    await page.evaluate(async () => {
      // @ts-ignore
      const w: any = window
      if (typeof w.__tldw_disableOfflineBypass === "function") {
        await w.__tldw_disableOfflineBypass()
      }
      if (w.__tldw_useConnectionStore) {
        const store = w.__tldw_useConnectionStore
        store.setState((prev: any) => ({
          state: {
            ...prev.state,
            isConnected: true,
            offlineBypass: false
          }
        }))
      }
    })

    await expect(
      modal.getByRole('button', { name: /Process queued items/i })
    ).toBeVisible()
    await modal.getByRole('button', { name: /Process queued items/i }).click()

    await context.close()
  })
})
