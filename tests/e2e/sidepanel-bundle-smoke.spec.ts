import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('Packaged sidepanel bundle', () => {
  test('renders the header and connection card from the built artifact', async () => {
    const extPath = path.resolve('build/chrome-zip')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)

    await expect(
      page.getByText(/Waiting for your tldw server/i)
    ).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByRole('button', { name: /Open settings|Set up server|Change server/i })
    ).toBeVisible()

    await context.close()
  })
})
