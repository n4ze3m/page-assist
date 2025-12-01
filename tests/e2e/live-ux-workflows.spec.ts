import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { launchWithBuiltExtension } from './utils/extension-build'

const SERVER_URL =
  process.env.TLDW_SERVER_URL ?? 'http://127.0.0.1:8000'
const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'
const TEST_EXT_PATH = path.resolve('.output/chrome-mv3')

test.describe('Live server UX workflows (no mocks)', () => {
  test('Onboarding with real server shows reachability hints', async () => {
    const { context, page } = await launchWithExtension(TEST_EXT_PATH)

    try {
      // Step 1: server URL
      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      const urlInput = page.getByLabel(/Server URL/i)
      await urlInput.scrollIntoViewIfNeeded()
      await urlInput.fill(SERVER_URL)

      // Give the built-in reachability check a moment to run.
      await page.waitForTimeout(1500)

      // Helper hint should describe what happens next.
      await expect(
        page.getByText(
          /We’ll enable Next once we can reach this address\.|Server responded successfully\. You can continue\./i
        )
      ).toBeVisible()

      // Docs CTA for learning about the server should be available.
      const docsCta = page.getByRole('button', {
        name: /Learn how tldw server works/i
      })
      await expect(docsCta).toBeVisible()

      // Next button should be present, even if disabled until reachability passes.
      await expect(
        page.getByRole('button', { name: /Next/i })
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Quick ingest modal with live server', async () => {
    test.fixme(
      true,
      'Quick Ingest live-server flow is still sensitive to connection-store state; enable once connection UX is stabilized.'
    )

    const { context, page, optionsUrl } =
      await launchWithBuiltExtension({
        seedConfig: {
          serverUrl: SERVER_URL,
          authMode: 'single-user',
          apiKey: API_KEY
        }
      })

    try {
      await page.goto(optionsUrl + '#/media', {
        waitUntil: 'domcontentloaded'
      })

      const ingestButton = page
        .getByRole('button', { name: /Quick ingest/i })
        .first()
      await expect(ingestButton).toBeVisible()
      await ingestButton.click()

      const modal = page.locator(
        '.quick-ingest-modal .ant-modal-content'
      )
      await expect(modal).toBeVisible()

      // Basic ingest path: add a URL to the queue
      const urlInput = page
        .getByLabel(/Paste URLs input/i)
        .or(page.getByPlaceholder(/https:\/\/example\.com/i))
        .first()
      await urlInput.click()
      await urlInput.fill('https://example.com')
      await page
        .getByRole('button', { name: /Add URLs/i })
        .click()

      // Queue row should appear with the URL and default status text.
      const row = modal.getByText('https://example.com').first()
      await expect(row).toBeVisible()
      await expect(
        modal.getByText(/Defaults will be applied\./i)
      ).toBeVisible()

      // When connection is blocked, the offline banner + pending label
      // should guide users toward Diagnostics instead of silently failing.
      await expect(
        modal.getByText(/Server offline — staging only/i)
      ).toBeVisible()
      await expect(
        modal.getByText(/Pending — will run when connected/i)
      ).toBeVisible()
      await expect(
        modal.getByText(/Check server health in Health & diagnostics/i)
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('Knowledge QA mode surfaces connect card with live server config', async () => {
    test.fixme(
      true,
      'Knowledge QA live-server UX still depends on connection store behavior; enable once header/knowledge state is finalized.'
    )

    const { context, page, optionsUrl } =
      await launchWithBuiltExtension({
        seedConfig: {
          serverUrl: SERVER_URL,
          authMode: 'single-user',
          apiKey: API_KEY
        }
      })

    try {
      // Go to the main playground route and switch to Knowledge QA mode.
      await page.goto(optionsUrl + '#/', {
        waitUntil: 'domcontentloaded'
      })

      await page
        .getByRole('button', { name: /Knowledge QA/i })
        .click()

      // With a real server configured but connection not yet fully established,
      // users should see a clear "connect to use" card rather than a blank view.
      await expect(
        page.getByText(/Connect to use Knowledge QA/i)
      ).toBeVisible()
      await expect(
        page.getByText(
          /To use Knowledge QA and RAG search, first connect to your tldw server\./i
        )
      ).toBeVisible()

      const connectCta = page.getByRole('button', {
        name: /Connect to server/i
      })
      await expect(connectCta).toBeVisible()

      // Header chips should reflect the offline/unknown state,
      // nudging users toward Health & diagnostics for more detail.
      await expect(page.getByText(/Server: /i)).toBeVisible()
      await expect(page.getByText(/Knowledge: /i)).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
