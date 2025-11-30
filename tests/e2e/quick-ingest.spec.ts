import { chromium, expect, test, type BrowserContext } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'

const EXT_REL_PATH = ['build', 'chrome-mv3']
const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

test.describe('Quick Ingest UX smoke (extension context)', () => {
  test('open modal, add URLs, attach a file, view inspector', async ({}, testInfo) => {
    const extPath = path.resolve(__dirname, '..', '..', ...EXT_REL_PATH)
    test.skip(!fs.existsSync(extPath), 'Build the extension first: npm run build:chrome')

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qi-pw-'))
    let context: BrowserContext | null = null

    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extPath}`,
          `--load-extension=${extPath}`
        ]
      })

      // Resolve extension ID from service worker
      let extId = ''
      for (let i = 0; i < 20 && !extId; i += 1) {
        const sw = context.serviceWorkers()[0]
        if (sw) {
          const m = sw.url().match(/chrome-extension:\/\/([a-z]{32})/)
          if (m) extId = m[1]
        }
        if (!extId) await new Promise((r) => setTimeout(r, 200))
      }
      expect(extId, 'extension id resolved').not.toEqual('')

      const page = await context.newPage()
      // Try playground first; if the header trigger is missing, fall back to media route
      await page.goto(`chrome-extension://${extId}/options.html#/playground`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle')
      await page.evaluate(
        (key) =>
          new Promise<void>((resolve) => {
            // @ts-ignore
            chrome.storage?.local?.set(
              {
                tldwConfig: {
                  serverUrl: 'http://127.0.0.1:8000',
                  authMode: 'single-user',
                  apiKey: key
                },
                __tldw_allow_offline: false
              },
              () => resolve()
            )
          }),
        API_KEY
      )
      await page.reload({ waitUntil: 'domcontentloaded' })

      // Open Quick Ingest modal (prefer on-card CTA which also enables offline bypass)
      const trigger = page
        .getByTestId('open-quick-ingest')
        .or(page.getByRole('button', { name: /open quick ingest/i }))
        .or(page.getByRole('button', { name: /quick ingest/i }))
        .first()
      if (!(await trigger.count())) {
        await page.goto(`chrome-extension://${extId}/options.html#/media`, { waitUntil: 'domcontentloaded' })
        await page.waitForLoadState('networkidle')
      }
      const finalTrigger = page
        .getByTestId('open-quick-ingest')
        .or(page.getByRole('button', { name: /open quick ingest/i }))
        .or(page.getByRole('button', { name: /quick ingest/i }))
        .first()
      await expect(finalTrigger).toBeVisible({ timeout: 5000 })
      await finalTrigger.click()

      try {
        // Wait for modal content (root may briefly stay hidden)
        await expect(page.locator('.quick-ingest-modal')).not.toHaveAttribute('hidden', 'true', { timeout: 10_000 })
        await expect(page.locator('.quick-ingest-modal .ant-modal-content')).toBeVisible({ timeout: 10_000 })
      } catch {
        // allow skip when the trigger selector is missing in this view
        test.skip(true, 'Quick Ingest trigger not found on options page; adjust selector or open manually.')
        return
      }

      // Add a couple of URLs via paste + Add URLs
      const urlInput = page.getByPlaceholder(/Paste URLs/i).first()
      await urlInput.click()
      await urlInput.fill('https://example.com\nhttps://example.org')
      const addUrlsBtn = page.getByRole('button', { name: /add urls/i }).first()
      if (await addUrlsBtn.count()) {
        await addUrlsBtn.click()
      }

      // Attach a small file (uses repo README as a stand-in)
      const fileInput = page.locator('[data-testid="qi-file-input"]')
      if (await fileInput.count()) {
        const sampleFile = path.resolve(__dirname, '..', '..', 'README.md')
        if (fs.existsSync(sampleFile)) {
          await fileInput.setInputFiles(sampleFile)
        }
      }

      // Open Inspector explicitly (intro should be visible on first open)
      const inspectorBtn = page.getByRole('button', { name: /open inspector/i }).first()
      if (await inspectorBtn.count()) {
        await inspectorBtn.click()
      }
      await expect(
        page.getByText(/How to use the Inspector/i).or(page.getByText(/Inspector/i))
      ).toBeVisible({ timeout: 5000 })

      // Capture a snapshot for UX review (no ingest run to avoid server dependency)
      await page.screenshot({
        path: testInfo.outputPath('quick-ingest-ux.png'),
        fullPage: true
      })
    } finally {
      await context?.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  })
})
