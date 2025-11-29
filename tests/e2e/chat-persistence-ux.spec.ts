import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

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
})
