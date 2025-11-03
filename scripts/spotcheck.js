/*
 Quick spot-check runner: loads the built extension from build/chrome-mv3
 and captures screenshots of the Options and Sidepanel pages.
 Usage: node scripts/spotcheck.js
 */
const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

async function launchWithExtension(extensionPath) {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
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
      new Promise((r) => setTimeout(r, 12000))
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

  return { context, optionsUrl, sidepanelUrl }
}

async function main() {
  const extPath = path.resolve('build/chrome-mv3')
  const outDir = path.resolve('playwright-mcp-artifacts')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const { context, optionsUrl, sidepanelUrl } = await launchWithExtension(extPath)
  const page = await context.newPage()

  // Options (attempt onboarding automation if present)
  await page.goto(optionsUrl)
  try {
    const serverTitle = page.getByText('Welcome — Let’s get you connected', { exact: false })
    if (await serverTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
      const url = process.env.TLDW_URL || 'http://127.0.0.1:8000'
      const apiKey = process.env.TLDW_API_KEY || ''
      await page.getByPlaceholder('http://localhost:8000').fill(url)
      await page.getByRole('button', { name: 'Next' }).click()
      // Step 2
      await page.getByText('Single User (API Key)', { exact: false }).click()
      if (apiKey) {
        await page.getByPlaceholder('Enter your API key').fill(apiKey)
      }
      await page.getByRole('button', { name: 'Continue' }).click()
      // Step 3: attempt recheck then finish
      await page.getByRole('button', { name: /Recheck/i }).click({ trial: true }).catch(() => {})
      await page.getByRole('button', { name: /Finish/ }).click()
      await page.waitForLoadState('networkidle')
    }
  } catch {}
  await page.screenshot({ path: path.join(outDir, 'options-spotcheck.png'), fullPage: true })

  // Sidepanel
  const sp = await context.newPage()
  await sp.goto(sidepanelUrl)
  await sp.screenshot({ path: path.join(outDir, 'sidepanel-spotcheck.png'), fullPage: true })

  await context.close()
  console.log('Saved screenshots to', outDir)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
