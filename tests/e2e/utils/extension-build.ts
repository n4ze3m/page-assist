import { chromium, type BrowserContext } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

type LaunchOptions = {
  seedConfig?: Record<string, any>
  allowOffline?: boolean
}

function makeTempProfileDirs() {
  const root = path.resolve('tmp-playwright-profile')
  fs.mkdirSync(root, { recursive: true })
  const homeDir = fs.mkdtempSync(path.join(root, 'home-'))
  const userDataDir = fs.mkdtempSync(path.join(root, 'user-data-'))
  return { homeDir, userDataDir }
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

export async function launchWithBuiltExtension(
  { seedConfig, allowOffline }: LaunchOptions = {}
) {
  const extensionPath = path.resolve('build/chrome-mv3')
  const { homeDir, userDataDir } = makeTempProfileDirs()
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

  // Seed storage before any extension pages load to bypass connection checks
  await context.addInitScript(
    (cfg, allowOfflineFlag) => {
      try {
        const set = (data: Record<string, any>) =>
          // @ts-ignore
          chrome?.storage?.local?.set?.(data, () => {})
        if (allowOfflineFlag) {
          set({ __tldw_allow_offline: true })
        }
        if (cfg) {
          set({ tldwConfig: cfg })
        }
      } catch {
        // ignore storage write failures in isolated contexts
      }
    },
    seedConfig || null,
    allowOffline || false
  )

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

  const extensionId = await resolveExtensionId(context)
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
