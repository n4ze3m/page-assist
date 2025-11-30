import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

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

  test('clarifies where ingest results are stored and updates aria-labels', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

    const ingestButton = page
      .getByRole('button', { name: /Quick ingest/i })
      .first()
    await expect(ingestButton).toBeVisible()
    await ingestButton.click()

    const modal = page.locator('.quick-ingest-modal .ant-modal-content')
    await expect(modal).toBeVisible()

    // Storage heading and descriptions should be visible.
    await expect(
      modal.getByText(/Where ingest results are stored/i)
    ).toBeVisible()
    await expect(
      modal.getByText(
        /Stored on your tldw server \(recommended for RAG and shared workspaces\)\./i
      )
    ).toBeVisible()
    await expect(
      modal.getByText(
        /Kept in this browser only; no data written to your server\./i
      )
    ).toBeVisible()

    // Switch accessible name should change based on mode.
    const storageToggle = modal.getByRole('switch', {
      name: /Store ingest results on your tldw server/i
    })
    await expect(storageToggle).toBeVisible()
    await expect(storageToggle).toHaveAttribute(
      'aria-label',
      /Store ingest results on your tldw server/i
    )

    await storageToggle.click()

    await expect(storageToggle).toHaveAttribute(
      'aria-label',
      /Process ingest results locally only/i
    )

    await context.close()
  })

  test('shows storage docs link only on first open', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

    const ingestButton = page
      .getByRole('button', { name: /Quick ingest/i })
      .first()
    await expect(ingestButton).toBeVisible()
    await ingestButton.click()

    const modal = page.locator('.quick-ingest-modal .ant-modal-content')
    await expect(modal).toBeVisible()

    const docsLink = modal.getByRole('button', {
      name: /Learn more about ingest & storage/i
    })
    await expect(docsLink).toBeVisible()

    // Clicking the link marks the hint as seen.
    await docsLink.click()

    // Close and reopen the modal; the hint should no longer be visible.
    await page.getByRole('button', { name: /Close quick ingest/i }).click()
    await expect(modal).toBeHidden()

    await ingestButton.click()
    await expect(modal).toBeVisible()
    await expect(
      modal.getByRole('button', {
        name: /Learn more about ingest & storage/i
      })
    ).toHaveCount(0)

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
    await expect(
      modal.getByText(/Check server health in Health & diagnostics/i)
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

    // Header quick-ingest trigger should indicate queued items.
    await expect(
      ingestButton
    ).toHaveAttribute("data-has-queued-ingest", "true")

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

    // After processing queued items, the badge should clear.
    await expect(ingestButton).toHaveAttribute(
      "data-has-queued-ingest",
      "false"
    )

    await context.close()
  })

  test('header CTA processes queued items after reconnection', async () => {
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

    const urlInput = page
      .getByLabel(/Paste URLs input/i)
      .or(page.getByPlaceholder(/https:\/\/example\.com/i))
      .first()
    await urlInput.click()
    await urlInput.fill('https://example.com')
    await page.getByRole('button', { name: /Add URLs/i }).click()

    await expect(
      modal.getByText(/Pending — will run when connected/i)
    ).toBeVisible()

    // Close the modal; queued badge should remain set.
    await page
      .getByRole('button', { name: /Close quick ingest/i })
      .click()

    await expect(ingestButton).toHaveAttribute(
      'data-has-queued-ingest',
      'true'
    )

    // Header Quick Ingest aria-label should mention queued items.
    await expect(ingestButton).toHaveAttribute(
      'aria-label',
      /items queued — click to review and process/i
    )

    // Simulate the server coming back online so queued items are processable.
    await page.evaluate(async () => {
      // @ts-ignore
      const w: any = window
      if (typeof w.__tldw_disableOfflineBypass === 'function') {
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

    // Global CTA near the header button should be visible.
    const processCta = page.getByTestId('process-queued-ingest-header')
    await expect(processCta).toBeVisible()

    await processCta.click()

    // Modal should reopen and queued items should be processed, clearing the badge.
    await expect(
      page.locator('.quick-ingest-modal .ant-modal-content')
    ).toBeVisible()

    await expect(ingestButton).toHaveAttribute(
      'data-has-queued-ingest',
      'false'
    )

    await context.close()
  })

  test('surfaces Health & diagnostics CTA when ingest fails', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    // Intercept Quick Ingest batch requests so they always fail.
    const patched = await page.evaluate(() => {
      try {
        // @ts-ignore
        const b = browser as any
        const original = b.runtime.sendMessage.bind(b.runtime)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__origQuickIngestSendMessage = original
        b.runtime.sendMessage = async (message: any) => {
          if (message?.type === 'tldw:quick-ingest-batch') {
            return {
              ok: false,
              error: 'Simulated ingest failure from test'
            }
          }
          return original(message)
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return typeof window.__origQuickIngestSendMessage === 'function'
      } catch {
        return false
      }
    })
    if (!patched) {
      test.skip('Quick ingest sendMessage patch failed; cannot force ingest failure')
    }

    await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

    const ingestButton = page
      .getByRole('button', { name: /Quick ingest/i })
      .first()
    await expect(ingestButton).toBeVisible()
    await ingestButton.click()

    const modal = page.locator('.quick-ingest-modal .ant-modal-content')
    await expect(modal).toBeVisible()

    const urlInput = page
      .getByLabel(/Paste URLs input/i)
      .or(page.getByPlaceholder(/https:\/\/example\.com/i))
      .first()
    await urlInput.click()
    await urlInput.fill('https://example.com/fail')
    await page.getByRole('button', { name: /Add URLs/i }).click()

    // Run ingest; the patched sendMessage will fail.
    await page.getByRole('button', { name: /Run quick ingest/i }).click()

    // Friendly error banner and CTA should be visible.
    await expect(
      modal.getByText(/We couldn’t process ingest items right now/i)
    ).toBeVisible({ timeout: 15_000 })

    const healthButton = modal.getByRole('button', {
      name: /Health & diagnostics/i
    })
    await expect(healthButton).toBeVisible()
    await healthButton.click()

    // Navigation should land on the Health & diagnostics view.
    await expect(page).toHaveURL(/#\/settings\/health/)

    await context.close()
  })
})
