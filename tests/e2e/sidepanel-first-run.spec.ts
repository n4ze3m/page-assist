import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { grantHostPermission } from './utils/permissions'
import { MockTldwServer } from './utils/mock-server'

test.describe('Sidepanel first-run and connection panel', () => {
  test('shows connection card and Open/Change settings opens tldw settings in a new tab', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel, extensionId } = await launchWithExtension(extPath) as any
    const page = await openSidepanel()

    // First-run: shared connection card visible in Sidepanel
    await expect(
      page.getByText(/Connect tldw Assistant to your server/i)
    ).toBeVisible()

    // Clicking any server-config CTA should open the Options page in a new tab
    const [settingsPage] = await Promise.all([
      context.waitForEvent('page'),
      page
        .getByRole('button', {
          name: /Set up server|Change server|Configure server|Open tldw server settings/i
        })
        .click()
    ])
    await settingsPage.waitForLoadState('domcontentloaded')
    // In Chromium, chrome.runtime.openOptionsPage navigates to chrome://extensions/?options=<id>
    await expect(settingsPage).toHaveURL(/chrome:\/\/extensions\/\?options=/i)

    await context.close()
  })

  test('Connected sidepanel focuses the composer (no extra Start chatting CTA)', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    // Force connected state via the shared connection store test hook
    await page.evaluate(() => {
      // @ts-ignore
      const store = (window as any).__tldw_useConnectionStore
      if (store?.setState) {
        const now = Date.now()
        store.setState({
          state: {
            phase: 'connected',
            serverUrl: 'http://127.0.0.1:8000',
            lastCheckedAt: now,
            lastError: null,
            lastStatusCode: null,
            isConnected: true,
            isChecking: false,
            knowledgeStatus: 'ready',
            knowledgeLastCheckedAt: now,
            knowledgeError: null
          },
          checkOnce: async () => {}
        })
      }
    })

    // Composer should be enabled and focused without an extra Start chatting button
    const composer = page.getByPlaceholder('Type a message...')
    await expect(composer).toBeVisible()
    await expect(composer).toBeFocused()

    await context.close()
  })
})
