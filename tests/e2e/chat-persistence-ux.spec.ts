import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'

test.describe('Chat persistence UX', () => {
  test('exposes clear labels for temporary vs local-only chats', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Ensure the playground composer is rendered
    const textarea = page.getByPlaceholder(/Waiting for your server|Type a message/i)
    await expect(textarea).toBeVisible()

    // By default, chats should be saved locally only.
    await expect(
      page.getByText(/Saved locally in this browser only/i)
    ).toBeVisible()

    // Toggling the switch enables a temporary (not saved) chat.
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

  test('shows a connect hint when server save is unavailable', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    const textarea = page.getByPlaceholder(
      /Waiting for your server|Type a message/i
    )
    await expect(textarea).toBeVisible()

    await expect(
      page.getByText(/Saved locally in this browser only/i)
    ).toBeVisible()

    const connectHint = page.getByRole('button', {
      name: /Connect your server to save chats there/i
    })
    await expect(connectHint).toBeVisible()

    await connectHint.click()
    await expect(page.locator('#server-connection-card')).toBeVisible()

    await context.close()
  })

  test('explains benefits when promoting a chat to server-backed mode', async () => {
    const server = new MockTldwServer()
    await server.start()

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed a valid connection config so server save is available.
    await page.evaluate(([serverUrl]) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set(
        {
          tldwConfig: {
            serverUrl,
            authMode: 'single-user',
            apiKey: 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'
          }
        },
        () => resolve()
      )
    }), [server.url])

    await page.reload()

    const textarea = page.getByPlaceholder(/Waiting for your server|Type a message/i)
    await expect(textarea).toBeVisible()

    // Ensure we are in non-temporary (local) mode first.
    const persistenceSwitch = page.getByRole('switch', {
      name: /Save chat|Save to history|Temporary chat/i
    })
    await expect(persistenceSwitch).toBeVisible()
    // If switch is already on temporary, click once to go back to local-only.
    if (await page.getByText(/Temporary chat: not saved in history/i).count()) {
      await persistenceSwitch.click()
    }

    // The local-only label should be visible.
    await expect(
      page.getByText(/Saved locally in this browser only/i)
    ).toBeVisible()

    // Trigger server-backed promotion.
    const saveToServerButton = page.getByRole('button', {
      name: /Also save this chat to server/i
    })
    await expect(saveToServerButton).toBeVisible()
    await saveToServerButton.click()

    // Inline explainer should appear once, describing Locally+Server.
    await expect(
      page.getByText(/Saved locally \+ on your server/i)
    ).toBeVisible()
    await expect(
      page.getByText(/reopen it from server history/i)
    ).toBeVisible()

    // Main persistence label transitions to the server-backed wording.
    await expect(
      page.getByText(/Saved Locally\+Server/i)
    ).toBeVisible()

    await context.close()
    await server.stop()
  })
})
