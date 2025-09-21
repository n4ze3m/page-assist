import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('Sidepanel header actions', () => {
  test('incognito toggle and kebab ingest actions', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, openSidepanel } = await launchWithExtension(extPath)

    // Open sidepanel page
    const sp = await openSidepanel()

    // Toggle temporary chat
    const incognito = sp.getByRole('button', { name: /toggle temporary chat/i })
    await incognito.click()
    await expect(incognito).toHaveAttribute('aria-pressed', 'true')

    // Open kebab menu and click ingest actions
    await sp.getByRole('button', { name: /more options/i }).click()
    await sp.getByText(/Save current page on server/i).click()
    await expect(sp.getByText(/Sent to tldw_server/)).toBeVisible()
    await expect(sp.getByRole('button', { name: /View processed/i })).toBeVisible()

    // Process locally
    await sp.getByRole('button', { name: /more options/i }).click()
    await sp.getByText(/Process current page locally/i).click()
    await expect(sp.getByText(/Processed locally/)).toBeVisible()

    await context.close()
  })
})

