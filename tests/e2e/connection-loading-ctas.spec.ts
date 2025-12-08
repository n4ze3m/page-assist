import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import {
  waitForConnectionStore,
  forceConnectionState
} from './utils/connection'

test.describe('ServerConnectionCard loading CTAs', () => {
  test('shows loading state and opens settings from primary CTA', async () => {
    const extPath = path.resolve('build/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Force a loading/searching state via the shared connection store
    await waitForConnectionStore(page, 'connection-loading-searching')
    await forceConnectionState(
      page,
      {
        phase: 'searching',
        serverUrl: 'http://192.0.2.1:12345',
        lastCheckedAt: null,
        lastError: null,
        lastStatusCode: null,
        isConnected: false,
        isChecking: true,
        knowledgeStatus: 'unknown',
        knowledgeLastCheckedAt: null,
        knowledgeError: null,
        mode: 'normal',
        configStep: 'url',
        errorKind: 'none',
        hasCompletedFirstRun: false
      },
      'connection-loading-searching'
    )

    // Loading state should show a Searching tag and a primary "Checking…" CTA
    await expect(page.getByText(/Searching for your tldw server/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Checking…|Checking...|Checking/i })).toBeVisible()

    // Secondary Configure server/Change server CTA should also be visible
    await expect(
      page.getByRole('button', { name: /Set up server|Configure server|Change server/i })
    ).toBeVisible()

    // Primary CTA should navigate to Settings → tldw
    await page.getByRole('button', { name: /Checking…|Checking...|Checking/i }).click()
    await expect(page).toHaveURL(/options\.html#\/settings\/tldw/i)
    await expect(page.getByText(/tldw Server Configuration/i)).toBeVisible()

    await context.close()
  })
})
