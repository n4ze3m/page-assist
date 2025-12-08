// Minimal Playwright runner to open the built Chrome extension
// and capture basic screenshots of the Options UI.

const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')
const { spawn } = require('child_process')

function makeTempProfileDirs() {
  const root = path.resolve('tmp-playwright-profile')
  fs.mkdirSync(root, { recursive: true })
  const homeDir = fs.mkdtempSync(path.join(root, 'ux-home-'))
  const userDataDir = fs.mkdtempSync(path.join(root, 'ux-user-data-'))
  return { homeDir, userDataDir }
}

async function waitForExtensionId(context, timeoutMs = 10000) {
  const start = Date.now()
  // MV3 uses service workers; poll until one appears
  while (Date.now() - start < timeoutMs) {
    const workers = context.serviceWorkers()
    for (const w of workers) {
      const url = w.url()
      const match = url.match(/^chrome-extension:\/\/([a-p]{32})\//)
      if (match) return match[1]
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('Timed out waiting for extension service worker')
}

async function main() {
  const extensionPath = path.resolve(__dirname, '..', 'build', 'chrome-mv3')
  if (!fs.existsSync(extensionPath)) {
    throw new Error(`Extension build not found at: ${extensionPath}`)
  }

  const { homeDir, userDataDir } = makeTempProfileDirs()

  // Start a lightweight mock tldw_server so health/model calls succeed
  const mock = spawn(process.execPath, [path.resolve(__dirname, 'mock-tldw.js')], {
    stdio: 'ignore', detached: true
  })

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: !!process.env.CI,
    env: {
      ...process.env,
      HOME: homeDir
    },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-crash-reporter',
      '--crash-dumps-dir=/tmp'
    ]
  })

  try {
    // Obtain the extension id from the registered service worker
    const extensionId = await waitForExtensionId(context)
    const base = `chrome-extension://${extensionId}`
    const apiKey =
      process.env.TLDW_E2E_API_KEY ||
      process.env.TLDW_WALKTHROUGH_API_KEY ||
      'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'

    const page = await context.newPage()
    await page.goto(`${base}/options.html`, { waitUntil: 'load' })
    await page.waitForSelector('#root', { timeout: 10000 })
    // Preconfigure server URL + auth in extension storage
    await page.evaluate(async (apiKeyValue) => {
      // Request host permissions so background fetches are allowed
      try {
        await new Promise((resolve) => chrome.permissions.request({ origins: ['http://127.0.0.1/*'] }, resolve))
      } catch {}

      await chrome.storage.local.set({
        tldwConfig: {
          serverUrl: 'http://127.0.0.1:8000',
          authMode: 'single-user',
          apiKey: apiKeyValue
        },
        tldwServerUrl: 'http://127.0.0.1:8000'
      })
    }, apiKey)
    await page.reload({ waitUntil: 'load' })
    // Give background time to start and health check to settle
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'options.png')
    })

    // Try navigating to Settings
    try {
      // Navigate to Settings via route directly to avoid brittle clicks
      await page.goto(`${base}/options.html#/settings`, { waitUntil: 'load' })
      await page.waitForSelector('#root', { timeout: 10000 })
      await page.screenshot({
        path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'settings-general.png')
      })
    } catch {}

    // Also capture the sidepanel UI
    const sp = await context.newPage()
    await sp.goto(`${base}/sidepanel.html`, { waitUntil: 'load' })
    await sp.waitForSelector('#root', { timeout: 10000 })
    await sp.screenshot({
      path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'sidepanel.png')
    })

    // Capture extra screens in a healthy state
    try {
      await page.goto(`${base}/options.html#/`, { waitUntil: 'load' })
      await page.waitForSelector('text=Playground', { timeout: 10000 }).catch(() => {})
      await page.getByPlaceholder('Type a message...').waitFor({ timeout: 15000 })
      await page.screenshot({
        path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'playground.png')
      })
    } catch {}

    try {
      await page.goto(`${base}/options.html#/settings/tldw`, { waitUntil: 'load' })
      await page.waitForSelector('#root', { timeout: 10000 })
      await page.screenshot({
        path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'settings-tldw.png')
      })
    } catch {}

    try {
      await page.goto(`${base}/options.html#/settings/prompt`, { waitUntil: 'load' })
      await page.waitForSelector('#root', { timeout: 10000 })
      await page.screenshot({
        path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'prompts.png')
      })
    } catch {}

    // Workspace routes
    const routes = [
      { hash: '#/review', out: 'review.png' },
      { hash: '#/flashcards', out: 'flashcards.png' },
      { hash: '#/media', out: 'media.png' },
      { hash: '#/media-multi', out: 'media-multi.png' },
      { hash: '#/notes', out: 'notes.png' },
      { hash: '#/settings/knowledge', out: 'knowledge.png' }
    ]
    for (const r of routes) {
      try {
        await page.goto(`${base}/options.html${r.hash}`, { waitUntil: 'load' })
        await page.waitForSelector('#root', { timeout: 10000 })
        await page.waitForTimeout(500)
        await page.screenshot({ path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', r.out) })
      } catch {}
    }

    // E2E assertion: onboarding auto-finish works when enabled
    const assert = { autoFinish: { started: false, finished: false, error: null } }
    try {
      assert.autoFinish.started = true
      // Force an unreachable config to trigger the wizard
      await page.evaluate(async () => {
        await chrome.storage.local.set({
          tldwConfig: { serverUrl: 'http://127.0.0.1:59999', authMode: 'single-user', apiKey: 'x' },
          onboardingAutoFinish: true
        })
      })
      await page.goto(`${base}/options.html#/`, { waitUntil: 'load' })
      await page.waitForSelector('input[type="text"]', { timeout: 15000 })
      const urlInput = page.locator('input[type="text"]').first()
      await urlInput.fill('http://127.0.0.1:8000')
      // Reachability should become OK and auto-advance to step 2; click Continue to trigger auto-finish
      // Try explicit Continue text, else fall back to the primary button
      try {
        await page.waitForSelector('button:has-text("Continue")', { timeout: 10000 })
        await page.click('button:has-text("Continue")')
      } catch {
        await page.click('button.ant-btn-primary')
      }
      // Wait for reachability -> auto-advance -> test -> auto-finish
      await page.waitForSelector('#textarea-message', { timeout: 20000 })
      assert.autoFinish.finished = true
      await page.screenshot({ path: path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'wizard-auto-finish.png') })
    } catch (e) {
      assert.autoFinish.error = String(e?.message || e)
    }
    fs.writeFileSync(
      path.resolve(__dirname, '..', 'playwright-mcp-artifacts', 'assertions.json'),
      JSON.stringify(assert, null, 2)
    )

    console.log('Screenshots saved to playwright-mcp-artifacts/*.png')
  } finally {
    await context.close()
    try { process.kill(-mock.pid) } catch {}
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
