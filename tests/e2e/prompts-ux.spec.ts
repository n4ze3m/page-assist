import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

test.describe('Prompts workspace UX', () => {
  test('segmented labels, copilot empty state, and use-in-chat affordance', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl + '#/prompts')
    await page.waitForLoadState('networkidle')

    // Segmented labels render human-readable text, not raw keys
    const customTab = page.getByRole('radio', { name: /Custom prompts/i })
    const copilotTab = page.getByRole('radio', { name: /Copilot prompts/i })
    await expect(customTab).toBeVisible()
    await expect(copilotTab).toBeVisible()

    // Helper text under segmented control reflects selected tab
    await expect(page.getByText(/Create and manage reusable prompts/i)).toBeVisible()
    await copilotTab.click()
    await expect(page.getByText(/predefined Copilot prompts/i)).toBeVisible()

    // Copilot empty state: if there are no Copilot prompts, show explainer + Diagnostics CTA
    // (In normal runs this may or may not be empty; only assert text when the heading is present.)
    const copilotEmptyHeading = page.getByRole('heading', { name: /No Copilot prompts available/i })
    if (await copilotEmptyHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(page.getByText(/predefined templates provided by your tldw server/i)).toBeVisible()
      await expect(
        page.getByRole('button', { name: /Diagnostics/i })
      ).toBeVisible()
    }

    // Switch back to Custom prompts
    await customTab.click()
    await expect(page.getByText(/Create and manage reusable prompts/i)).toBeVisible()

    // Use-in-chat action has clear tooltip and accessible name
    const useInChatButton = page.getByRole('button', { name: /Use in chat/i }).first()
    await expect(useInChatButton).toBeVisible()
    await useInChatButton.hover()

    // Tooltip text should describe opening chat and inserting the prompt
    await expect(
      page.getByText(/insert this prompt into the composer/i)
    ).toBeVisible()

    await context.close()
  })
}

