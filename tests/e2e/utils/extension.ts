import { BrowserContext, Page, chromium, test, expect } from '@playwright/test'
import path from 'path'

export async function launchWithExtension(extensionPath: string) {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })
  // Find the extension id by inspecting service workers/background pages
  const background = context.serviceWorkers()[0] || context.backgroundPages()[0]
  if (!background) {
    // Wait briefly for background to appear
    await context.waitForEvent('serviceworker', { timeout: 5000 }).catch(() => null)
  }
  // Heuristic: extension id is part of the background url: chrome-extension://<id>/_generated_background_page.html
  const pages = context.backgroundPages()
  const workers = context.serviceWorkers()
  const targetUrl = pages[0]?.url() || workers[0]?.url() || ''
  const match = targetUrl.match(/chrome-extension:\/\/([a-p]{32})/)
  if (!match) throw new Error(`Could not determine extension id from ${targetUrl}`)
  const extensionId = match[1]
  const optionsUrl = `chrome-extension://${extensionId}/options.html`

  const page = await context.newPage()
  await page.goto(optionsUrl)
  return { context, page, extensionId }
}

