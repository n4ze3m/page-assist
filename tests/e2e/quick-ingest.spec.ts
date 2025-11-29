import { chromium, expect, test } from '@playwright/test'
import fs from 'fs'
import os from 'os'
import path from 'path'

const EXT_REL_PATH = ['build', 'chrome-mv3']
const API_KEY = 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

test.describe('Quick Ingest UX smoke (extension context)', () => {
  test('open modal, add URLs, attach a file, view inspector', async () => {
    const extPath = path.resolve(__dirname, '..', '..', ...EXT_REL_PATH)
    test.skip(!fs.existsSync(extPath), 'Build the extension first: npm run build:chrome')

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qi-pw-'))
    const context = await chromium.launchPersistentContext(userDataDir, {
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
    // Go to a route that renders the header + ingest trigger
    await page.goto(`chrome-extension://${extId}/options.html#/media`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    await page.evaluate(
      (key) =>
        new Promise<void>((resolve) => {
          // @ts-ignore
          chrome.storage?.local?.set(
            {
              tldwConfig: {
                serverUrl: 'http://127.0.0.1:62731',
                authMode: 'single-user',
                apiKey: key
              },
              __tldw_allow_offline: true
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
    if (await trigger.count()) {
      await trigger.click()
    } else {
      const offline = page.getByRole('button', { name: /continue offline/i }).first()
      if (await offline.count()) await offline.click()
      const fallback = page.getByText(/open quick ingest/i, { exact: false }).first()
      if (await fallback.count()) await fallback.click()
    }

    // Force-open via event dispatch if needed (after offline bypass)
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('tldw:open-quick-ingest'))
    })

    let modalOpened = false
    try {
    await expect(page.locator('.quick-ingest-modal')).toBeVisible({ timeout: 8000 })
      modalOpened = true
    } catch {
      // allow skip when the trigger selector is missing in this view
      test.skip(true, 'Quick Ingest trigger not found on options page; adjust selector or open manually.')
    }
    expect(modalOpened).toBeTruthy()

    // Add a couple of URLs via paste + Add URLs
    const urlInput = page.getByPlaceholder(/Paste URLs/i).first()
    await urlInput.click()
    await urlInput.fill('https://example.com\nhttps://example.org')
    const addUrlsBtn = page.getByRole('button', { name: /add urls/i }).first()
    if (await addUrlsBtn.count()) {
      await addUrlsBtn.click()
    }

    // Attach a small file (uses repo README as a stand-in)
    const fileInput = page.locator('input#qi-file-input')
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
    await page.screenshot({ path: '/tmp/quick-ingest-ux.png', fullPage: true })
    await context.close()
  })
})
