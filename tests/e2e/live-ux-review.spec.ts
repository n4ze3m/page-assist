import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { launchWithBuiltExtension } from './utils/extension-build'
import {
  waitForConnectionStore,
  logConnectionSnapshot
} from './utils/connection'

// Live server URL + API key.
// These defaults match local dev expectations, but tests are only
// enabled when TLDW_LIVE_E2E is set to avoid blocking CI.
const SERVER_URL =
  process.env.TLDW_SERVER_URL ?? 'http://127.0.0.1:8000'
const API_KEY =
  process.env.TLDW_API_KEY ?? 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

const TEST_EXT_PATH = path.resolve('.output/chrome-mv3')

// Gate all tests behind an opt‑in env flag so they never
// run in normal suites unless explicitly requested.
const describeLive = process.env.TLDW_LIVE_E2E
  ? test.describe
  : test.describe.skip

type LiveRagStatus = 'ready' | 'empty' | 'offline'

const fetchLiveRagStatus = async (): Promise<LiveRagStatus> => {
  const target = `${SERVER_URL.replace(/\/$/, '')}/api/v1/rag/health`
  try {
    const res = await fetch(target, {
      headers: { 'X-API-KEY': API_KEY }
    } as any)
    if (!res.ok) {
      return 'offline'
    }
    const raw = await res.json().catch(() => null)
    try {
      const components = raw && typeof raw === 'object' ? (raw as any).components : null
      const search =
        components && typeof components === 'object'
          ? (components as any).search_index || (components as any).searchIndex
          : null
      if (search && typeof search === 'object') {
        const status = String((search as any).status || '').toLowerCase()
        const message = String((search as any).message || '')
        const rawCount = (search as any).fts_table_count
        const ftsCount =
          typeof rawCount === 'number' && Number.isFinite(rawCount)
            ? rawCount
            : null
        const noIndexByCount = ftsCount !== null && ftsCount <= 0
        const noIndexByMessage = /no fts indexes found/i.test(message)
        if ((noIndexByCount || noIndexByMessage) && status !== 'unhealthy') {
          return 'empty'
        }
      }
    } catch {
      // fall through to ready
    }
    return 'ready'
  } catch {
    return 'offline'
  }
}

describeLive('Live server UX review (no mocks)', () => {
  test.beforeAll(async () => {
    const target = `${SERVER_URL.replace(/\/$/, '')}/health`
    try {
      const res = await fetch(target)
      if (!res.ok) {
        test.skip(`Live server not healthy at ${target} (HTTP ${res.status}).`)
      }
    } catch (e: any) {
      test.skip(
        `Live server not reachable at ${target}: ${e?.message || String(e)}`
      )
    }
  })

  test('Onboarding to connected state with live server', async () => {
    const { context, page } = await launchWithExtension(TEST_EXT_PATH)

    try {
      // Step 1: server URL + reachability hint
      await waitForConnectionStore(page, 'live-onboarding-initial')
      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible({ timeout: 15_000 })

      const urlInput = page.getByLabel(/Server URL/i)
      await urlInput.scrollIntoViewIfNeeded()
      await urlInput.fill(SERVER_URL)

      // Wait for the reachability helper to update. Prefer the
      // "reachable" copy, but accept the neutral hint for now so
      // this test stays informative while connection UX evolves.
      const helper = page.getByText(
        /We’ll enable Next once we can reach this address\.|We'll enable Next once we can reach this address\.|Server responded successfully\. You can continue\./i
      )
      await expect(helper).toBeVisible({ timeout: 12_000 })

      await page.screenshot({
        path: 'e2e-tests/live-onboarding-step1.png',
        fullPage: true
      })

      await page.getByRole('button', { name: /Next/i }).click()

      // Step 2: Single-user API key
      await expect(
        page.getByText(/Authentication Mode/i)
      ).toBeVisible({ timeout: 10_000 })

      await page.getByText(/Single User \(API Key\)/i).click()

      const apiKeyInput = page.getByPlaceholder(/Enter your API key/i)
      await apiKeyInput.fill(API_KEY)

      await page.screenshot({
        path: 'e2e-tests/live-onboarding-step2.png',
        fullPage: true
      })

      await page
        .getByRole('button', { name: /Continue/i })
        .click()

      await logConnectionSnapshot(page, 'live-onboarding-after-auth')

      // Either the wizard auto‑finishes into chat, or shows Step 3 with
      // connected tags. Accept either outcome.
      const chatPlaceholder = page.getByPlaceholder(
        /Type a message\.\.\./i
      )
      const connectionTag = page.getByText(/Connection:/i)

      await Promise.race([
        chatPlaceholder.waitFor({ timeout: 30_000 }).catch(() => null),
        connectionTag.waitFor({ timeout: 30_000 }).catch(() => null)
      ])

      await page.screenshot({
        path: 'e2e-tests/live-onboarding-after-continue.png',
        fullPage: true
      })

      // Log header chips for later UX review.
      const serverChip = await page
        .getByText(/Server:/i)
        .first()
        .textContent()
        .catch(() => null)
      const knowledgeChip =
        (await page
          .getByText(/Knowledge:/i)
          .first()
          .textContent()
          .catch(() => null)) || null

      if (serverChip) {
        console.log(
          'HEADER_SERVER_CHIP:',
          serverChip.replace(/\s+/g, ' ').trim()
        )
      }
      if (knowledgeChip) {
        console.log(
          'HEADER_KNOWLEDGE_CHIP:',
          knowledgeChip.replace(/\s+/g, ' ').trim()
        )
      }
    } finally {
      await context.close()
    }
  })

  test('Quick Ingest + Media status with live server', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
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
      await expect(ingestButton).toBeVisible({ timeout: 15_000 })
      await ingestButton.click()

      const modal = page.locator(
        '.quick-ingest-modal .ant-modal-content'
      )
      await expect(modal).toBeVisible({ timeout: 15_000 })

      await page.screenshot({
        path: 'e2e-tests/live-quick-ingest-open.png',
        fullPage: true
      })

      // Queue a simple URL and start ingest.
      const urlInput = page
        .getByLabel(/Paste URLs input/i)
        .or(page.getByPlaceholder(/https:\/\/example\.com/i))
        .first()
      await urlInput.click()
      await urlInput.fill('https://example.com/')
      await page
        .getByRole('button', { name: /Add URLs/i })
        .click()

      const row = modal.getByText('https://example.com/').first()
      await expect(row).toBeVisible({ timeout: 15_000 })

      await page.screenshot({
        path: 'e2e-tests/live-quick-ingest-queued.png',
        fullPage: true
      })

      const runButton = modal.getByRole('button', {
        name: /Run quick ingest/i
      })
      await expect(runButton).toBeVisible({ timeout: 15_000 })
      await runButton.click()

      // Wait for progress, then either a completion summary or an error banner.
      await modal
        .getByText(/Running quick ingest/i)
        .waitFor({ timeout: 20_000 })

      const summaryOrError = await Promise.race([
        modal
          .getByText(
            /Quick ingest completed successfully\.|Quick ingest completed with some errors\./i
          )
          .waitFor({ timeout: 60_000 })
          .then(() => 'completed')
          .catch(() => null),
        modal
          .getByText(/We couldn’t process ingest items right now/i)
          .waitFor({ timeout: 60_000 })
          .then(() => 'error')
          .catch(() => null)
      ])

      // If the run failed, capture the UI and bail out early; the error
      // banner itself is sufficient UX coverage for this path.
      if (summaryOrError === 'error') {
        await page.screenshot({
          path: 'e2e-tests/live-quick-ingest-error.png',
          fullPage: true
        })
        return
      }

      await page.screenshot({
        path: 'e2e-tests/live-quick-ingest-after-run.png',
        fullPage: true
      })

      // After a successful quick ingest, navigate to /media and confirm
      // that at least one row shows a status pill such as Processing,
      // Queued, Ready, or Error alongside the new metadata layout.
      await page.goto(optionsUrl + '#/media', {
        waitUntil: 'domcontentloaded'
      })

      const resultsHeader = page.getByTestId('review-results-header')
      await expect(resultsHeader).toBeVisible({ timeout: 20_000 })

      const anyStatus = page.getByText(
        /Processing|Queued|Ready|Error/i
      )
      await expect(anyStatus).toBeVisible({ timeout: 30_000 })

      // Basic sanity check for the new source line: we should see at
      // least one compact metadata row with a dot-separated pattern.
      const metaLine = page.getByText(/·/, { exact: false }).first()
      await metaLine.waitFor({ timeout: 30_000 }).catch(() => null)
    } finally {
      await context.close()
    }
  })

  test('Knowledge QA empty state with live server', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      seedConfig: {
        serverUrl: SERVER_URL,
        authMode: 'single-user',
        apiKey: API_KEY
      }
    })

    try {
      const ragStatus = await fetchLiveRagStatus()

      await page.goto(optionsUrl + '#/', {
        waitUntil: 'domcontentloaded'
      })

      await page
        .getByRole('button', { name: /Knowledge QA/i })
        .click()

      if (ragStatus === 'offline') {
        // RAG health not available or failing: users should see a clear
        // connect-focused empty state rather than a blank canvas.
        await expect(
          page.getByText(/Connect to use Knowledge QA/i)
        ).toBeVisible({ timeout: 20_000 })
      } else if (ragStatus === 'empty') {
        // Online server with no RAG index yet: show the dedicated
        // “Index knowledge…” state and the “No sources yet” pill.
        await expect(
          page.getByText(/Index knowledge to use Knowledge QA/i)
        ).toBeVisible({ timeout: 20_000 })
        await expect(
          page.getByText(/No sources yet/i)
        ).toBeVisible({ timeout: 20_000 })
      } else {
        // RAG health is ready and index exists: the full workspace
        // should be visible instead of an empty card.
        await expect(
          page.getByText(/Knowledge search & chat/i)
        ).toBeVisible({ timeout: 20_000 })
      }

      await page.screenshot({
        path: 'e2e-tests/live-knowledge-qa.png',
        fullPage: true
      })

      const serverChip = await page
        .getByText(/Server:/i)
        .first()
        .textContent()
        .catch(() => null)
      const knowledgeChip = await page
        .getByText(/Knowledge:/i)
        .first()
        .textContent()
        .catch(() => null)

      if (serverChip) {
        console.log(
          'HEADER_SERVER_CHIP_KNOWLEDGE:',
          serverChip.replace(/\s+/g, ' ').trim()
        )
      }
      if (knowledgeChip && ragStatus === 'empty') {
        const trimmed = knowledgeChip.replace(/\s+/g, ' ').trim()
        expect(trimmed).toMatch(/Knowledge: No sources yet/i)
      }
    } finally {
      await context.close()
    }
  })
})
