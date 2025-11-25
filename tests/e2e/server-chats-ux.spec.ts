import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'
import { grantHostPermission } from './utils/permissions'

test.describe('Server-backed chats UX', () => {
  test('loads server chats into the playground transcript with assistant labels', async () => {
    const server = new MockTldwServer()

    // Extend the mock server with minimal /chats and /messages handlers
    ;(server as any).setChatFixtures?.({
      chats: [
        {
          id: 'chat-1',
          character_id: 'char-1',
          title: 'Server E2E Chat',
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          message_count: 2,
          version: 1
        }
      ],
      characters: [
        {
          id: 'char-1',
          name: 'Test Character',
          version: 1
        }
      ],
      messagesByChat: {
        'chat-1': [
          {
            id: 'm1',
            role: 'user',
            content: 'Hello from server history',
            created_at: new Date().toISOString(),
            version: 1
          },
          {
            id: 'm2',
            role: 'assistant',
            content: 'Hi there – loaded from server.',
            created_at: new Date().toISOString(),
            version: 1
          }
        ]
      }
    })

    const port = await server.start(0)
    const serverBaseUrl = `http://127.0.0.1:${port}`

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath, {
      seedConfig: {
        tldwConfig: {
          serverUrl: serverBaseUrl,
          authMode: 'single-user',
          apiKey: 'test-valid-key'
        }
      }
    })) as any

    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    const granted = await grantHostPermission(context, extensionId, `${serverBaseUrl}/*`)
    if (!granted) {
      test.skip(true, 'Host permission not granted for mock server; allow it in chrome://extensions > tldw Assistant > Site access, then re-run')
    }

    await page.goto(optionsUrl)
    await page.waitForLoadState('networkidle')

    // Open the chat sidebar
    await page.getByRole('button', { name: /Open chat sidebar/i }).click()

    // Server chats section should appear
    await expect(page.getByText(/Server chats/i)).toBeVisible()

    // Click the first server chat
    const chatButton = page.getByRole('button', { name: /Server E2E Chat/i }).first()
    await chatButton.click()

    // The playground should show user + assistant messages
    await expect(page.getByText(/Hello from server history/i)).toBeVisible()
    await expect(page.getByText(/Hi there – loaded from server\./i)).toBeVisible()

    // Assistant label should reflect the character name
    const assistantLabel = await page.getByText(/Test Character/).first()
    await expect(assistantLabel).toBeVisible()

    // Persistence helper text should make it clear that this chat
    // is saved both locally and on the server.
    await expect(
      page.getByText(/Saved in this browser and on your tldw server/i)
    ).toBeVisible()

    await context.close()
    await server.stop()
  })
})
