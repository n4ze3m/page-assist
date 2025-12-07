import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { grantHostPermission } from './utils/permissions'
import { MockTldwServer } from './utils/mock-server'
import {
  waitForConnectionStore,
  forceConnected
} from './utils/connection'

test.describe('Sidepanel first-run and connection panel', () => {
  test('shows connection card and Open/Change settings opens tldw settings in a new tab', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel, extensionId } = await launchWithExtension(extPath) as any
    const page = await openSidepanel()

    // First-run: shared connection card visible in Sidepanel
    await expect(
      page.getByText(/Connect tldw Assistant to your server/i)
    ).toBeVisible()

    // Helper microcopy should set expectations about where Settings opens.
    await expect(
      page.getByText(/Settings open in a new browser tab/i)
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
    // Depending on the browser, this may be either the generic extensions manager
    // or the extension's options.html page. Accept both forms.
    await expect(settingsPage).toHaveURL(
      /chrome:\/\/extensions\/\?options=|options\.html#\/settings\/tldw/i
    )

    await context.close()
  })

  test('Connected sidepanel focuses the composer (no extra Start chatting CTA)', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    // Force connected state via the shared connection store test hook
    await waitForConnectionStore(page, 'sidepanel-connected')
    await forceConnected(
      page,
      { serverUrl: 'http://127.0.0.1:8000' },
      'sidepanel-connected'
    )

    // Composer should be enabled and focused without an extra Start chatting button
    const composer = page.getByPlaceholder('Type a message...')
    await expect(composer).toBeVisible()
    await expect(composer).toBeFocused()

    await context.close()
  })

  test('sidepanel shows the same persistence mode labels as the playground', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    // Composer should be visible even before the server is connected.
    const textarea = page.getByPlaceholder(/Type a message|Connect to tldw/i)
    await expect(textarea).toBeVisible()

    // Default state: local-only persistence.
    await expect(
      page.getByText(/Saved locally in this browser only/i)
    ).toBeVisible()

    // Toggle to temporary chat and confirm the label updates.
    const persistenceSwitch = page.getByRole('switch', {
      name: /Save chat|Save to history|Temporary chat/i
    })
    await expect(persistenceSwitch).toBeVisible()
    await persistenceSwitch.click()

    await expect(
      page.getByText(/Temporary chat: not saved in history/i)
    ).toBeVisible()

    await context.close()
  })

  test('sidepanel header links to Health & diagnostics', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    const [healthPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: /Health & diagnostics/i }).click()
    ])

    await healthPage.waitForLoadState('domcontentloaded')
    await expect(healthPage).toHaveURL(/options\.html#\/settings\/health/i)

    await context.close()
  })
})
