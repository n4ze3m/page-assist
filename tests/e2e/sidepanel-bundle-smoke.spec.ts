import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('Packaged sidepanel bundle', () => {
  test('renders the connection card from the built artifact', async () => {
    const extPath = path.resolve('build/chrome-mv3')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2500)

    await expect(
      page.getByRole('button', {
        name: /Open tldw server settings|Open server settings/i
      })
    ).toBeVisible({ timeout: 8000 })

    await context.close()
  })
})
