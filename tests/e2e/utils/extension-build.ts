import { chromium } from '@playwright/test'

export async function launchWithBuiltExtension() {
  const extensionPath = require('path').resolve('build/chrome-mv3')
  const context = await chromium.launchPersistentContext('', {
    headless: !!process.env.CI,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-crash-reporter',
      '--crash-dumps-dir=/tmp'
    ]
  })

  // Wait for SW/background
  const waitForTargets = async () => {
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

  return { context, page, openSidepanel, extensionId, optionsUrl, sidepanelUrl }
}
