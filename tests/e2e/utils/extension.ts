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

async function resolveExtensionId(context: BrowserContext): Promise<string> {
  let targetUrl =
    context.backgroundPages()[0]?.url() ||
    context.serviceWorkers()[0]?.url() ||
    ''

  if (!targetUrl) {
    try {
      const page =
        context.backgroundPages()[0] ||
        context.pages()[0] ||
        (await context.newPage())
      const session = await context.newCDPSession(page)
      const { targetInfos } = await session.send('Target.getTargets')
      const extTarget =
        targetInfos.find(
          (t: any) =>
            typeof t.url === 'string' &&
            t.url.startsWith('chrome-extension://') &&
            (t.type === 'background_page' || t.type === 'service_worker')
        ) ||
        targetInfos.find(
          (t: any) =>
            typeof t.url === 'string' &&
            t.url.startsWith('chrome-extension://')
        )

      if (extTarget?.url) {
        targetUrl = extTarget.url
      }
    } catch {
      // Best-effort only; fall through to error below if we still
      // cannot determine the extension id.
    }
  }

  const match = targetUrl.match(/chrome-extension:\/\/([a-p]{32})/)
  if (!match) {
    throw new Error(
      `Could not determine extension id from ${targetUrl || '[no extension targets]'}`
    )
  }
  return match[1]
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

  const extensionId = await resolveExtensionId(context)
  const optionsUrl = `chrome-extension://${extensionId}/options.html`
  const sidepanelUrl = `chrome-extension://${extensionId}/sidepanel.html`

  // Ensure each test run starts from a clean extension storage state so
  // first-run onboarding and connection flows behave deterministically.
  await context.addInitScript(() => {
    try {
      // @ts-ignore
      chrome?.storage?.local?.clear?.()
    } catch {
      // ignore if not available
    }
  })

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
