import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { grantHostPermission } from "./utils/permissions"
import { requireRealServerConfig } from "./utils/real-server"

test.describe('Composer readiness based on connection state', () => {
  test('sidepanel composer is disabled and shows connection helper when server is not configured', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel } = (await launchWithExtension(extPath)) as any
    const page = await openSidepanel()

    // Composer placeholder should reflect disconnected state
    const textarea = page.getByPlaceholder(/Waiting for your server/i)
    await expect(textarea).toBeVisible()

    // Send button should be disabled while disconnected
    const sendButton = page.getByRole('button', { name: /Send/i }).first()
    await expect(sendButton).toBeDisabled()

    // Inline helper copy explains that messages cannot be sent
    await expect(
      page.getByText(/Connect to your tldw server in Settings to send messages\./i)
    ).toBeVisible()

    // Connection chip makes the disconnected state obvious
    await expect(
      page.getByText(/Server: Not connected/i)
    ).toBeVisible()

    // Focusing the composer should reveal the connect banner with CTAs
    await textarea.focus()
    await expect(
      page.getByText(/Connect to your tldw server in Settings to send messages\./i)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Set up server/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Health & diagnostics/i })
    ).toBeVisible()

    await context.close()
  })

  test('options Playground composer shows connection chip when connection is not ready', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Force the shared connection state into a "connected phase but not ready" state
    await page.evaluate(() => {
      const conn: any = (window as any).__tldw_useConnectionStore
      if (!conn) return
      const prev = conn.getState().state
      conn.setState({
        state: {
          ...prev,
          phase: 'connected',
          isConnected: false,
          isChecking: false,
          mode: 'normal',
          configStep: prev.configStep || 'health',
          errorKind: 'none'
        }
      })
    })

    await page.reload()

    // Playground composer should show the disconnected placeholder
    const textarea = page.getByPlaceholder(/Waiting for your server/i)
    await expect(textarea).toBeVisible()

    // Send button should be disabled
    const sendButton = page.getByRole('button', { name: /Send/i }).first()
    await expect(sendButton).toBeDisabled()

    // Connection chip and helper text should be visible near the composer
    await expect(
      page.getByText(/Server: Not connected/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Connect to your tldw server in Settings to send messages\./i)
    ).toBeVisible()

    await context.close()
  })

  test("sidepanel composer is enabled with normal placeholder when connected", async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve(".output/chrome-mv3")
    const { context, openSidepanel, extensionId } =
      (await launchWithExtension(extPath)) as any

    // Ensure host permission for the mock server is granted
    const granted = await grantHostPermission(
      context,
      extensionId,
      new URL(serverUrl).origin + "/*"
    )
    if (!granted) {
      test.skip(
        true,
        "Host permission not granted for tldw_server origin; allow it in chrome://extensions > tldw Assistant > Site access, then re-run"
      )
    }

    const page = await openSidepanel()

    // Seed a valid config so the shared connection store can reach the mock server
    await page.evaluate(
      (cfg) =>
        new Promise<void>((resolve) => {
          // @ts-ignore
          chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
        }),
      {
        serverUrl,
        authMode: "single-user",
        apiKey
      }
    )

    await page.reload()

    // Once connected, composer should use the normal chat placeholder
    const textarea = page.getByPlaceholder(/Type a message/i)
    await expect(textarea).toBeVisible({ timeout: 15_000 })

    // Send button should be enabled when the server is connected
    const sendButton = page.getByRole("button", { name: /Send/i }).first()
    await expect(sendButton).toBeEnabled()

    await context.close()
  })
})
