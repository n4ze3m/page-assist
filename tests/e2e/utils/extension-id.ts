import type { BrowserContext } from '@playwright/test'

export async function resolveExtensionId(
  context: BrowserContext
): Promise<string> {
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
      `Could not determine extension id from ${
        targetUrl || '[no extension targets]'
      }`
    )
  }
  return match[1]
}

