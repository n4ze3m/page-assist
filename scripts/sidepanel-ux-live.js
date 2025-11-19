#!/usr/bin/env node
// Small helper to launch the built extension in Chromium via Playwright,
// open the sidepanel, and capture a screenshot + accessibility snapshot.

const path = require('path')
const fs = require('fs/promises')
const { chromium } = require('@playwright/test')

async function ensureExtensionPath() {
  const extensionPath = path.resolve('build', 'chrome-zip')
  const manifestPath = path.join(extensionPath, 'manifest.json')
  await fs.access(manifestPath)
  return extensionPath
}

async function launchWithExtension(extensionPath) {
  const context = await chromium.launchPersistentContext('', {
    headless: !!process.env.CI,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  const waitForTargets = async () => {
    if (context.serviceWorkers().length || context.backgroundPages().length) return
    await Promise.race([
      context.waitForEvent('serviceworker').catch(() => null),
      context.waitForEvent('backgroundpage').catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 7000))
    ])
  }
  await waitForTargets()

  const pages = context.backgroundPages()
  const workers = context.serviceWorkers()
  const targetUrl = pages[0]?.url() || workers[0]?.url() || ''
  const match = targetUrl.match(/chrome-extension:\/\/([a-p]{32})/)
  if (!match) {
    throw new Error(`Could not determine extension id from ${targetUrl}`)
  }
  const extensionId = match[1]
  const sidepanelUrl = `chrome-extension://${extensionId}/sidepanel.html`

  return { context, sidepanelUrl }
}

async function main() {
  const extensionPath = await ensureExtensionPath()
  const { context, sidepanelUrl } = await launchWithExtension(extensionPath)

  try {
    const page = await context.newPage()
    await page.goto(sidepanelUrl)
    await page.waitForLoadState('domcontentloaded')

    // Give React time to bootstrap and render the connection card.
    await page.waitForTimeout(2000)
    try {
      await page.getByText(/Waiting for your tldw server/i).waitFor({ timeout: 5000 })
    } catch {
      // Ignore if the connection card is not visible in this state.
    }

    const artifactsDir = path.resolve('playwright-mcp-artifacts')
    await fs.mkdir(artifactsDir, { recursive: true })

    const screenshotPath = path.join(artifactsDir, 'sidepanel-live.png')
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const a11y = await page.accessibility.snapshot({ interestingOnly: false })
    const a11yPath = path.join(artifactsDir, 'sidepanel-live-a11y.json')
    await fs.writeFile(a11yPath, JSON.stringify(a11y, null, 2), 'utf8')

    console.log(JSON.stringify({ screenshotPath, a11yPath, sidepanelUrl }, null, 2))
  } finally {
    await context.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

