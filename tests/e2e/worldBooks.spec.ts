import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

test.describe('World Books page', () => {
  test('renders World Books manager and actions', async () => {
    const extPath = path.resolve('build/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Navigate to World Books
    await page.goto(page.url() + '#/settings/world-books')

    // Basic UI presence
    await expect(page.getByRole('button', { name: /New World Book/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible()

    // Table renders (may be empty; just check headers)
    await expect(page.getByText(/Entries/i)).toBeVisible()

    await context.close()
  })
})
