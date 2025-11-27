import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

// Use the packaged Chrome MV3 build so this matches your real extension.
const EXT_PATH = path.resolve('build/chrome-mv3')

test.describe('Sidepanel chat input screenshot', () => {
  test('captures the sidepanel including chat textarea', async () => {
    const { context, openSidepanel } = (await launchWithExtension(EXT_PATH)) as any
    const page = await openSidepanel()

    // Wait for the app shell to mount (#root child present)
    await page.waitForSelector('#root >> *', { timeout: 15_000 })

    // Try to scroll the main chat textarea into view (best-effort)
    const textarea = page.locator('textarea').first()
    const exists = await textarea.count()
    if (exists > 0) {
      await textarea.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)
    }

    // Take a full-page screenshot of the sidepanel tab.
    await page.screenshot({
      path: 'test-results/sidepanel-chat-input.png',
      fullPage: true
    })

    await context.close()
  })
})
