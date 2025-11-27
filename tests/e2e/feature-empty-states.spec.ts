import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'
import { grantHostPermission } from './utils/permissions'

test.describe('Feature empty states (connected vs not connected)', () => {
  test('Notes view shows connection-focused empty state when server is offline', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    await page.goto(`${optionsUrl}#/notes`)

    await expect(
      page.getByText(/Connect to use Notes/i)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Connect to server/i })
    ).toBeVisible()

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

  test('Knowledge settings shows “No knowledge sources yet” when connected with no data', async () => {
    const server = new MockTldwServer()
    await server.start()

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    // Ensure host permission for the mock server is granted
    const granted = await grantHostPermission(context, extensionId, 'http://127.0.0.1/*')
    if (!granted) {
      test.skip(
        true,
        'Host permission not granted for http://127.0.0.1/*; allow it in chrome://extensions > tldw Assistant > Site access, then re-run'
      )
    }

    // Seed valid config so the shared connection store treats the server as connected
    await page.goto(optionsUrl)
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: server.url, authMode: 'single-user', apiKey: 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY' })

    // Navigate directly to Knowledge settings; once connected and with an empty DB,
    // the per-feature empty state should be visible.
    await page.goto(`${optionsUrl}#/settings/knowledge`)

    await expect(
      page.getByText(/No knowledge sources yet/i)
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: /Add knowledge/i })
    ).toBeVisible()

    await context.close()
    await server.stop()
  })
})
