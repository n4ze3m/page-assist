import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { grantHostPermission } from "./utils/permissions"
import { requireRealServerConfig } from "./utils/real-server"

test.describe('Feature empty states (connected vs not connected)', () => {
  test('Notes view shows connection-focused empty state when server is offline', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    await page.goto(`${optionsUrl}#/notes`)

    await expect(
      page.getByText(/Connect to use Notes/i)
    ).toBeVisible()
    const cta = page.getByRole('button', {
      name: /Go to server card/i
    })
    await expect(cta).toBeVisible()

    await cta.click()
    await expect(page.locator('#server-connection-card')).toBeVisible()

    await context.close()
  })

  test('Knowledge settings shows connection-focused empty state when server is offline', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    await page.goto(`${optionsUrl}#/settings/knowledge`)

    await expect(
      page.getByText(/Connect to use Knowledge/i)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Connect to server/i })
    ).toBeVisible()

    await context.close()
  })

  test('Knowledge settings shows connected state and knowledge UI when server is configured', async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    // Ensure host permission for the real server is granted
    const granted = await grantHostPermission(
      context,
      extensionId,
      new URL(serverUrl).origin + '/*'
    )
    if (!granted) {
      test.skip(
        true,
        'Host permission not granted for tldw_server origin; allow it in chrome://extensions > tldw Assistant > Site access, then re-run'
      )
    }

    // Seed valid config so the shared connection store treats the server as connected
    await page.goto(optionsUrl)
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl, authMode: 'single-user', apiKey })

    // Navigate directly to Knowledge settings; once connected, the Knowledge UI
    // (either an empty state or a populated list) should be visible.
    await page.goto(`${optionsUrl}#/settings/knowledge`)

    // Either an empty state or some knowledge list content should be rendered.
    const emptyOrContent = page.getByText(
      /No knowledge sources yet|Knowledge/i
    )
    await expect(emptyOrContent).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: /Add knowledge/i })
    ).toBeVisible()

    await context.close()
  })
})
