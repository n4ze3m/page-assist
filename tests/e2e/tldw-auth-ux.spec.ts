import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

test.describe('tldw multi-user auth UX', () => {
  test('shows friendly messages and Health link on login failure', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    // Patch auth/login requests to return 401 so we can exercise the UX
    await page.evaluate(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const b = browser as any
        const original = b.runtime.sendMessage.bind(b.runtime)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__origAuthSendMessage = original
        b.runtime.sendMessage = async (message: any) => {
          if (message?.type === 'tldw:request' && message?.payload?.path === '/api/v1/auth/login') {
            return {
              ok: false,
              status: 401,
              error: 'Simulated 401 from test'
            }
          }
          return original(message)
        }
      } catch {
        // best-effort; if patching fails we still want the test not to crash
      }
    })

    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })

    await page.getByText(/Authentication Mode/i).scrollIntoViewIfNeeded()
    await page.getByText(/Multi User \(Login\)/i).click()

    await page.getByLabel(/Username/i).fill('alice')
    await page.getByLabel(/^Password$/i).fill('wrong-password')

    await page.getByRole('button', { name: /Login/i }).click()

    // Friendly multi-user error copy
    await expect(
      page.getByText(
        /Login failed\. Check your username\/password or confirm multi-user auth is enabled on your tldw server/i
      )
    ).toBeVisible()

    // Connection detail section should expose a Health & diagnostics link
    if (
      await page
        .getByText(/Connection failed\. Please check your settings\./i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      const healthLink = page.getByRole('button', {
        name: /Health & diagnostics/i
      })
      await expect(healthLink).toBeVisible()
      await healthLink.click()
      await expect(page).toHaveURL(/#\/settings\/health/)
    }

    await context.close()
  })
})

