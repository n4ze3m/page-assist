import { BrowserContext, Page, chromium } from '@playwright/test'
import path from 'path'

export async function launchWithExtension(extensionPath: string) {
  const context = await chromium.launchPersistentContext('', {
    headless: !!process.env.CI,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  // Wait for background targets to appear (service worker or background page)
  const waitForTargets = async () => {
    // Already present?
    if (context.serviceWorkers().length || context.backgroundPages().length) return
    await Promise.race([
      context.waitForEvent('serviceworker').catch(() => null),
      context.waitForEvent('backgroundpage').catch(() => null),
      new Promise((r) => setTimeout(r, 7000))
    ])
  }
  await waitForTargets()

  const pages = context.backgroundPages()
  const workers = context.serviceWorkers()
  const targetUrl = pages[0]?.url() || workers[0]?.url() || ''
  const match = targetUrl.match(/chrome-extension:\/\/([a-p]{32})/)
  if (!match) throw new Error(`Could not determine extension id from ${targetUrl}`)
  const extensionId = match[1]
  const optionsUrl = `chrome-extension://${extensionId}/options.html`
  const sidepanelUrl = `chrome-extension://${extensionId}/sidepanel.html`

  const page = await context.newPage()
  await page.goto(optionsUrl)

  async function openSidepanel() {
    const p = await context.newPage()
    await p.goto(sidepanelUrl)
    return p
  }

  return { context, page, extensionId, openSidepanel }
}
