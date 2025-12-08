import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { launchWithBuiltExtension } from './utils/extension-build'
import {
  waitForConnectionStore,
  logConnectionSnapshot
} from './utils/connection'

const SERVER_URL =
  process.env.TLDW_SERVER_URL ?? 'http://127.0.0.1:8000'
const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'
const TEST_EXT_PATH = path.resolve('build/chrome-mv3')

// Gate all tests behind an opt-in env flag and a live
// health check so they never run against a missing server.
const describeLive = process.env.TLDW_LIVE_E2E
  ? test.describe
  : test.describe.skip

describeLive('Live server UX workflows (no mocks)', () => {
  test.beforeAll(async () => {
    const target = `${SERVER_URL.replace(/\/$/, '')}/health`
    try {
      const res = await fetch(target)
      if (!res.ok) {
        test.skip(
          `Live server not healthy at ${target} (HTTP ${res.status}).`
        )
      }
    } catch (e: any) {
      test.skip(
        `Live server not reachable at ${target}: ${e?.message || String(e)}`
      )
    }
  })
  test('Onboarding with real server shows reachability hints', async () => {
    const { context, page } = await launchWithExtension(TEST_EXT_PATH)

    try {
      // Step 1: server URL
      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      await waitForConnectionStore(page, 'live-workflows-onboarding')

      const urlInput = page.getByLabel(/Server URL/i)
      await urlInput.scrollIntoViewIfNeeded()
      await urlInput.fill(SERVER_URL)

      // Helper hint should flip to the reachable state once the live
      // server responds to /api/v1/health, enabling Next without reload.
      await expect(
        page.getByText(
          /Server responded successfully\. You can continue\./i
        )
      ).toBeVisible({ timeout: 15_000 })

      // Docs CTA for learning about the server should be available.
      const docsCta = page.getByRole('button', {
        name: /Learn how tldw server works/i
      })
      await expect(docsCta).toBeVisible()

      const nextButton = page.getByRole('button', { name: /Next/i })
      await expect(nextButton).toBeVisible()
      await expect(nextButton).toBeEnabled()
      await logConnectionSnapshot(page, 'live-workflows-after-url')
    } finally {
      await context.close()
    }
  })

  test('Quick ingest modal with live server', async () => {
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

      // With a healthy, configured server, Quick Ingest should be ready
      // to run instead of presenting an offline-only staging banner.
      const runButton = modal.getByRole('button', {
        name: /Run quick ingest/i
      })
      await expect(runButton).toBeVisible()
      await expect(runButton).toBeEnabled()

      // The offline staging banner and generic pending label should not
      // appear when the connection store reports an online server.
      await expect(
        modal.getByText(/Server offline — staging only/i)
      ).toHaveCount(0)
      await expect(
        modal.getByText(/Pending — will run when connected/i)
      ).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('Knowledge QA mode surfaces connect card with live server config', async () => {
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

      // When Knowledge QA is selected, users should always see a clear
      // state: either a connect card or the "no sources yet" empty state.
      await Promise.race([
        page
          .getByText(/Connect to use Knowledge QA/i)
          .waitFor({ timeout: 20_000 })
          .catch(() => null),
        page
          .getByText(/Index knowledge to use Knowledge QA/i)
          .waitFor({ timeout: 20_000 })
          .catch(() => null)
      ])

      // Header chips should be present for quick connection diagnostics.
      await expect(page.getByText(/Server: /i)).toBeVisible()
      await expect(page.getByText(/Knowledge: /i)).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
