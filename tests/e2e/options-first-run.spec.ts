import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { grantHostPermission } from './utils/permissions'
import { MockTldwServer } from './utils/mock-server'

test.describe('Options first-run and connection panel', () => {
  test('shows connection card and inline Set up server link navigates to tldw settings', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // First-run: Waiting panel visible
    await expect(page.getByText(/Waiting for your tldw server/i)).toBeVisible()

    // Inline link button: "Set up server" should navigate to Settings → tldw
    await page.getByRole('button', { name: /Set up server/i }).click()

    // URL should include settings route and the tldw page should render
    await expect(page).toHaveURL(/options\.html#\/settings\/tldw/i)
    await expect(page.getByText(/tldw Server Configuration/i)).toBeVisible()

    await context.close()
  })

  test('Start chatting focuses the composer when connected', async () => {
    const server = new MockTldwServer()
    await server.start()

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = await launchWithExtension(extPath) as any

    // Ensure host permission for the mock server is granted
    const granted = await grantHostPermission(context, extensionId, 'http://127.0.0.1/*')
    if (!granted) {
      test.skip(true, 'Host permission not granted for http://127.0.0.1/*; allow it in chrome://extensions > tldw Assistant > Site access, then re-run')
    }

    // Seed valid config so the card shows connected state
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: server.url, authMode: 'single-user', apiKey: 'test-valid-key' })

    await page.reload()

    // Retry/backoff until connected or timeout
    const waitForConnected = async (timeoutMs = 15000) => {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const connected = await page.getByText(/Connected to/i).isVisible().catch(() => false)
        const startBtn = await page.getByRole('button', { name: /Start chatting/i }).isVisible().catch(() => false)
        if (connected || startBtn) return true
        const retryBtn = page.getByRole('button', { name: /Retry|Check again|Recheck/i })
        if (await retryBtn.isVisible().catch(() => false)) {
          await retryBtn.click()
        }
        await page.waitForTimeout(500)
      }
      return false
    }
    const ok = await waitForConnected()
    expect(ok).toBeTruthy()
    // Connected card shows both Start chatting and Change server
    await expect(page.getByRole('button', { name: /Start chatting/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Change server/i })).toBeVisible()
    // Clicking Start chatting should focus the composer textarea
    await page.getByRole('button', { name: /Start chatting/i }).click()
    await expect(page.locator('#textarea-message')).toBeFocused()

    await context.close()
    await server.stop()
  })
})
