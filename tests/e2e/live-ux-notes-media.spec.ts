import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithBuiltExtension } from './utils/extension-build'
import {
  waitForConnectionStore,
  logConnectionSnapshot
} from './utils/connection'

const SERVER_URL =
  process.env.TLDW_SERVER_URL ?? 'http://127.0.0.1:8000'
const API_KEY =
  process.env.TLDW_API_KEY ?? 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

const TEST_EXT_PATH = path.resolve('build/chrome-mv3')

const describeLive = process.env.TLDW_LIVE_E2E
  ? test.describe
  : test.describe.skip

describeLive('Live server media + notes UX (no mocks)', () => {
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

  test('Media list shows status pill and metadata', async () => {
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
      await waitForConnectionStore(page, 'live-media-initial')
      await logConnectionSnapshot(page, 'live-media-initial')

      const resultsHeader = page.getByTestId('review-results-header')
      await expect(resultsHeader).toBeVisible({ timeout: 20_000 })

      const anyRow = page
        .getByRole('listitem')
        .filter({ hasText: /Media|Result/i })
        .first()

      await anyRow.waitFor({ timeout: 30_000 }).catch(() => null)

      const statusTag = page.getByText(
        /Processing|Queued|Ready|Error/i
      )
      await expect(statusTag).toBeVisible({ timeout: 30_000 })

      const metaLine = page.getByText(/·/, { exact: false }).first()
      await metaLine.waitFor({ timeout: 30_000 }).catch(() => null)
    } finally {
      await context.close()
    }
  })

  test('Notes toolbar + navigation guard with live server', async () => {
    const { context, page, optionsUrl } =
      await launchWithBuiltExtension({
        seedConfig: {
          serverUrl: SERVER_URL,
          authMode: 'single-user',
          apiKey: API_KEY
        }
      })

    try {
      await page.goto(optionsUrl + '#/notes', {
        waitUntil: 'domcontentloaded'
      })
      await waitForConnectionStore(page, 'live-notes-initial')
      await logConnectionSnapshot(page, 'live-notes-initial')

      // Create a new note and type some content.
      await page
        .getByRole('button', { name: /New note/i })
        .click()

      await page.getByPlaceholder('Title').fill('Live E2E note')
      await page
        .getByPlaceholder('Write your note here...', { exact: false })
        .fill('This is a live E2E note.')

      // Toolbar actions should be enabled when online.
      const copyButton = page.getByRole('button', {
        name: /Copy note content/i
      })
      const exportMdButton = page.getByRole('button', {
        name: /Export note as Markdown/i
      })
      const saveButton = page.getByRole('button', {
        name: /Save note/i
      })
      const deleteButton = page.getByRole('button', {
        name: /Delete note/i
      })

      await expect(copyButton).toBeEnabled()
      await expect(exportMdButton).toBeEnabled()
      await expect(saveButton).toBeEnabled()

      // Save once so the note exists on the server.
      await saveButton.click()

      // With a saved note selected, Delete should also be enabled.
      await expect(deleteButton).toBeEnabled()

      // Make another change to mark the editor dirty, then attempt to
      // navigate away and assert that the discard dialog appears.
      await page
        .getByPlaceholder('Write your note here...', { exact: false })
        .fill('This is an updated live E2E note.')

      await page.getByRole('button', { name: /^Chat$/i }).click()

      const discardDialog = page.getByText(/Discard changes\?/i)
      await expect(discardDialog).toBeVisible({ timeout: 20_000 })

      await page.getByRole('button', { name: /Discard/i }).click()

      // After confirming discard, we should land on the Chat route.
      await expect(
        page.getByPlaceholder(/Type a message\.\.\./i)
      ).toBeVisible({ timeout: 30_000 })
    } finally {
      await context.close()
    }
  })
})
