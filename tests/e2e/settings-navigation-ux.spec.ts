import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

async function launchOnTldwSettings() {
  const { context, page, optionsUrl } = await launchWithBuiltExtension()
  await page.goto(optionsUrl + '#/settings/tldw')
  await page.waitForLoadState('networkidle')
  return { context, page }
}

test.describe('Settings navigation UX', () => {
  test('left navigation highlights the current settings page', async () => {
    const { context, page } = await launchOnTldwSettings()

    const tldwLink = page.getByRole('link', { name: /tldw Server/i })
    await expect(tldwLink).toBeVisible()
    await expect(tldwLink).toHaveAttribute('aria-current', 'page')

    const knowledgeLink = page.getByRole('link', {
      name: /Knowledge|Manage Knowledge/i
    })
    await knowledgeLink.click()
    await page.waitForLoadState('networkidle')

    await expect(knowledgeLink).toHaveAttribute('aria-current', 'page')
    await expect(tldwLink).not.toHaveAttribute('aria-current', 'page')

    await context.close()
  })

  test('Health page Back to chat returns to previous settings view', async () => {
    const { context, page } = await launchOnTldwSettings()

    // Open Health from the tldw settings header controls.
    const healthButton = page.getByRole('button', { name: /Health/i }).first()
    await healthButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)
    await expect(
      page.getByText(/Health & diagnostics/i)
    ).toBeVisible()

    // Back to chat should navigate back to the previous settings page.
    const backButton = page.getByRole('button', { name: /Back to chat/i })
    await expect(backButton).toBeVisible()
    await backButton.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/options\.html#\/settings\/tldw/i)
    await expect(
      page.getByText(/tldw Server Configuration/i)
    ).toBeVisible()

    await context.close()
  })
})
