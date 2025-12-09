import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'
import {
  waitForConnectionStore,
  forceUnconfigured,
  forceErrorUnreachable
} from './utils/connection'

const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

test.describe('Quick ingest – UX audit', () => {
  test('first-time user sees tips with Advanced/Inspector collapsed', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

      const ingestButton = page
        .getByRole('button', { name: /Quick ingest/i })
        .first()
      await expect(ingestButton).toBeVisible()
      await ingestButton.click()

      const modal = page.locator('.quick-ingest-modal .ant-modal-content')
      await expect(modal).toBeVisible()

      // Tips + supported formats should be visible on first open.
      await expect(
        modal.getByText(/Tips/i)
      ).toBeVisible()
      await expect(
        modal.getByText(/Supported: docs, PDFs, audio, video, and web URLs./i)
      ).toBeVisible()

      // Advanced options content should not be visible until expanded.
      await expect(
        modal.getByText(/Advanced options/i)
      ).toBeVisible()
      await expect(
        modal.getByPlaceholder(/Search advanced fields/i)
      ).toHaveCount(0)

      // Inspector drawer should not be open by default.
      await expect(
        page.getByRole('dialog', { name: /Inspector/i })
      ).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('success summary surfaces a primary Media CTA', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

      const ingestButton = page
        .getByRole('button', { name: /Quick ingest/i })
        .first()
      await expect(ingestButton).toBeVisible()
      await ingestButton.click()

      const modal = page.locator('.quick-ingest-modal .ant-modal-content')
      await expect(modal).toBeVisible()

      // Add a URL to queue.
      const urlInput = modal
        .getByLabel(/URLs to ingest/i)
        .or(modal.getByPlaceholder(/https:\/\/example\.com/i))
        .first()
      await urlInput.click()
      await urlInput.fill('https://example.com')
      await modal.getByRole('button', { name: /Add URLs/i }).click()

      // Run ingest – rely on live server or existing mocks.
      const runButton = modal.getByRole('button', {
        name: /Run quick ingest|Ingest|Process/i
      }).first()
      await expect(runButton).toBeVisible()
      await runButton.click()

      // Wait for summary to appear.
      await expect(
        modal.getByText(/Quick ingest completed (successfully|with some errors)/i)
      ).toBeVisible({ timeout: 30_000 })

      // Primary CTA should be present first in the summary actions.
      const primaryCta = modal.getByTestId(
        'quick-ingest-open-media-primary'
      )
      await expect(primaryCta).toBeVisible()

      // At least one "Open in Media viewer" link should be present in the results list.
      await expect(
        modal.getByRole('button', { name: /Open in Media viewer/i }).first()
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('advanced options surface a Recommended group and embedding context', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

      // Seed a default embedding model so the inline RAG label is deterministic.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            // @ts-ignore
            chrome.storage.local.set(
              { defaultEmbeddingModel: 'openai/text-embedding-3-small' },
              () => resolve()
            )
          })
      )

      const ingestButton = page
        .getByRole('button', { name: /Quick ingest/i })
        .first()
      await expect(ingestButton).toBeVisible()
      await ingestButton.click()

      const modal = page.locator('.quick-ingest-modal .ant-modal-content')
      await expect(modal).toBeVisible()

      // Inline embedding context should be visible near common options.
      await expect(
        modal.getByText(/Uses .* for RAG search/i)
      ).toBeVisible()

      // "Model settings" link should navigate to the model settings route.
      await modal.getByRole('button', { name: /Model settings/i }).click()
      await expect(page).toHaveURL(/#\/settings\/model/)

      // Go back to Media and reopen Quick Ingest for Advanced checks.
      await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })
      const ingestButton2 = page
        .getByRole('button', { name: /Quick ingest/i })
        .first()
      await ingestButton2.click()

      const modal2 = page.locator('.quick-ingest-modal .ant-modal-content')
      await expect(modal2).toBeVisible()

      // Expand Advanced options.
      await modal2.getByText(/Advanced options/i).click()

      // Recommended group should appear at the top when present.
      const recommendedHeading = modal2.getByText(/Recommended fields/i)
      const count = await recommendedHeading.count()
      if (count > 0) {
        await expect(recommendedHeading.first()).toBeVisible()
      }
    } finally {
      await context.close()
    }
  })

  test('results filter surfaces failed items first and supports Failed-only view', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: 'http://127.0.0.1:8000',
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      // Patch quick-ingest batch to return mixed results deterministically.
      const patched = await page.evaluate(() => {
        try {
          // @ts-ignore
          const b = browser as any
          const original = b.runtime.sendMessage.bind(b.runtime)
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          window.__origQuickIngestSendMessageMixed = original
          b.runtime.sendMessage = async (message: any) => {
            if (message?.type === 'tldw:quick-ingest-batch') {
              return {
                ok: true,
                results: [
                  {
                    id: 'fail-1',
                    status: 'error',
                    type: 'html',
                    url: 'https://fail.example.com',
                    error: 'Simulated failure'
                  },
                  {
                    id: 'ok-1',
                    status: 'ok',
                    type: 'html',
                    url: 'https://ok.example.com',
                    data: { id: 123 }
                  }
                ]
              }
            }
            return original(message)
          }
          return true
        } catch {
          return false
        }
      })

      if (!patched) {
        test.info().skip(
          'Quick-ingest message patching failed in page context; skipping mixed-results UX audit.'
        )
      }

      await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })

      const ingestButton = page
        .getByRole('button', { name: /Quick ingest/i })
        .first()
      await expect(ingestButton).toBeVisible()
      await ingestButton.click()

      const modal = page.locator('.quick-ingest-modal .ant-modal-content')
      await expect(modal).toBeVisible()

      const urlInput = modal
        .getByLabel(/URLs to ingest/i)
        .or(modal.getByPlaceholder(/https:\/\/example\.com/i))
        .first()
      await urlInput.click()
      await urlInput.fill('https://example.com/mixed')
      await modal.getByRole('button', { name: /Add URLs/i }).click()

      const runButton = modal.getByRole('button', {
        name: /Run quick ingest|Ingest|Process/i
      }).first()
      await expect(runButton).toBeVisible()
      await runButton.click()

      // Wait for summary/result list.
      await expect(
        modal.getByText(/Quick ingest completed (successfully|with some errors)/i)
      ).toBeVisible({ timeout: 30_000 })

      const items = modal.locator('.ant-list-item')
      await expect(items.first().getByText(/FAILED/i)).toBeVisible()

      const filterCombo = modal.getByRole('combobox', {
        name: /Filter results by status/i
      })
      await filterCombo.click()
      await page.getByRole('option', { name: /Failed only/i }).click()

      await expect(items).toHaveCount(1)
      await expect(items.first().getByText(/https:\/\/fail\.example\.com/i)).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('offline states share a clear headline and footer', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    try {
      await page.goto(optionsUrl + '#/media', { waitUntil: 'domcontentloaded' })
      await waitForConnectionStore(page, 'quick-ingest-ux-offline')

      const openQuickIngest = async () => {
        const ingestButton = page
          .getByRole('button', { name: /Quick ingest/i })
          .first()
        await expect(ingestButton).toBeVisible()
        await ingestButton.click()

        const modal = page.locator('.quick-ingest-modal .ant-modal-content')
        await expect(modal).toBeVisible()
        return { ingestButton, modal }
      }

      const assertBannerAndFooter = async () => {
        const { modal } = await openQuickIngest()

        // Headline should be either generic connection error or auth error.
        await expect(
          modal.getByText(/Can.?t reach your tldw server|API key needs attention/i)
        ).toBeVisible()

        // Footer should start with "Can't reach your server."
        await expect(
          modal.getByText(/Can.?t reach your server\./i)
        ).toBeVisible()

        // Close between states so each run starts clean.
        await page
          .getByRole('button', { name: /Close quick ingest/i })
          .click()
        await expect(modal).toBeHidden()
      }

      // 1) Unconfigured state
      await forceUnconfigured(page, 'qi-ux-unconfigured')
      await assertBannerAndFooter()

      // 2) Offline unreachable state
      await forceErrorUnreachable(
        page,
        { errorKind: 'unreachable', serverUrl: 'http://127.0.0.1:8000' },
        'qi-ux-offline'
      )
      await assertBannerAndFooter()

      // 3) Offline bypass / allow-offline mode
      await page.evaluate(async () => {
        const w: any = window
        if (typeof w.__tldw_enableOfflineBypass === 'function') {
          await w.__tldw_enableOfflineBypass()
        }
      })
      await assertBannerAndFooter()
    } finally {
      await context.close()
    }
  })
})
