import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('Chat Dictionaries page', () => {
  test('renders Dictionaries manager and actions', async () => {
    const extPath = path.resolve('build/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Navigate to Chat Dictionaries
    await page.goto(page.url() + '#/settings/chat-dictionaries')

    // Basic UI presence
    await expect(page.getByRole('button', { name: /New Dictionary/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible()

    // Table renders (may be empty; just check headers)
    await expect(page.getByText(/Entries/i)).toBeVisible()

    await context.close()
  })
})
