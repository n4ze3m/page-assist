import type { BrowserContext, Page } from '@playwright/test'

export async function grantHostPermission(context: BrowserContext, extensionId: string, origin: string) {
  // Open an extension page (options) so we can call chrome.permissions APIs
  const page: Page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/options.html`)
  await page.waitForLoadState('domcontentloaded')

  // If already granted, return early
  const already = await page.evaluate((o) => new Promise<boolean>((resolve) => {
    try {
      // @ts-ignore
      chrome.permissions.contains({ origins: [o] }, (result: boolean) => resolve(!!result))
    } catch {
      resolve(false)
    }
  }), origin)
  if (already) {
    await page.close()
    return true
  }

  // Install a button and click it to satisfy the user-gesture requirement
  await page.exposeFunction('__setResult', (granted: boolean) => granted)
  await page.evaluate(() => {
    const btn = document.createElement('button')
    btn.id = 'grant-host-permission'
    btn.textContent = 'Grant host permission'
    // @ts-ignore
    btn.addEventListener('click', () => chrome.permissions.request({ origins: (window as any).__origins || [] }, (granted: boolean) => {
      ;(window as any).__granted = granted
    }))
    document.body.appendChild(btn)
  })
  await page.evaluate((o) => { (window as any).__origins = [o] }, origin)
  await page.click('#grant-host-permission')

  // Wait up to ~3s for the result to be set; if prompt is blocked, this may remain undefined
  const start = Date.now()
  while (Date.now() - start < 3000) {
    const result = await page.evaluate(() => (window as any).__granted)
    if (typeof result === 'boolean') {
      await page.close()
      return result
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  await page.close()
  return false
}

