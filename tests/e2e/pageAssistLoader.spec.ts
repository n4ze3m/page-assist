import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('PageAssistLoader accessibility', () => {
  test('has dialog/progressbar roles and manages focus', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Snapshot current active element tag before loader steals focus
    const preFocusTag = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.tagName || null)

    // Loader should attach quickly on first render while initialization runs
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'attached', timeout: 5000 })

    // Roles present
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('progressbar')).toBeVisible()

    // Loader takes focus while visible
    await expect(dialog).toBeFocused()

    // Loader eventually dismisses
    await dialog.waitFor({ state: 'detached', timeout: 15000 })

    // Focus is restored away from the overlay (ideally to what was focused before)
    const postFocusTag = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.tagName || null)
    expect(postFocusTag).toBe(preFocusTag)

    await context.close()
  })
})

