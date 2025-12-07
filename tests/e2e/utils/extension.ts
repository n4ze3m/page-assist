import { BrowserContext, Page, chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

function makeTempProfileDirs() {
  const root = path.resolve('tmp-playwright-profile')
  fs.mkdirSync(root, { recursive: true })
  const homeDir = fs.mkdtempSync(path.join(root, 'home-'))
  const userDataDir = fs.mkdtempSync(path.join(root, 'user-data-'))
  return { homeDir, userDataDir }
}

export interface LaunchWithExtensionResult {
  context: BrowserContext
  page: Page
  extensionId: string
  optionsUrl: string
  sidepanelUrl: string
  openSidepanel: () => Promise<Page>
}

export async function launchWithExtension(
  extensionPath: string,
  {
    seedConfig
  }: { seedConfig?: Record<string, any> } = {}
): Promise<LaunchWithExtensionResult> {
  // Pick the first existing extension build so tests work whether dev output or prod build is present.
  const candidates = [
    extensionPath,
    path.resolve('.output/chrome-mv3'),
    path.resolve('build/chrome-mv3')
  ]
  const extPath = candidates.find((p) => fs.existsSync(p))
  if (!extPath) {
    throw new Error(
      `No extension build found. Tried: ${candidates.join(
        ', '
      )}. Run "bun run build:chrome" first.`
    )
  }

  const { homeDir, userDataDir } = makeTempProfileDirs()

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: !!process.env.CI,
    env: {
      ...process.env,
      HOME: homeDir
    },
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--disable-crash-reporter',
      '--crash-dumps-dir=/tmp'
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

  if (seedConfig) {
    // Pre-seed storage before any pages load so the extension picks it up immediately.
    await context.addInitScript((cfg) => {
      try {
        // @ts-ignore
        chrome?.storage?.local?.set?.(cfg, () => {})
      } catch {
        // ignore if not available
      }
    }, seedConfig)
  }

  const page = await context.newPage()
  // Ensure the extension is ready before navigating
  await page.waitForTimeout(250)
  await page.goto(optionsUrl)

  async function openSidepanel() {
    const p = await context.newPage()
    await p.goto(sidepanelUrl)
    return p
  }

  return { context, page, extensionId, optionsUrl, sidepanelUrl, openSidepanel }
}
