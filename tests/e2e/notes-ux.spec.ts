import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

test.describe('Notes workspace UX', () => {
  test('shows offline empty state and disables editor when not connected', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl + '#/notes')
    await page.waitForLoadState('networkidle')

    const headline = page.getByText(/Connect to use Notes|Explore Notes in demo mode/i)
    await expect(headline).toBeVisible()

    const editorPanel = page.locator('div[aria-disabled="true"]').last()
    await expect(editorPanel).toBeVisible()

    const textarea = page.getByPlaceholder('Write your note here...')
    await expect(textarea).toHaveAttribute('readonly', '')

    await expect(
      page.getByRole('button', { name: /Copy note content/i })
    ).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: /Export note as Markdown/i })
    ).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: /Delete note/i })
    ).toHaveCount(1)

    await context.close()
  })

  test('asks before discarding unsaved editor changes', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl)
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = (window as any).__tldw_useConnectionStore
      if (!store) return
      store.setState((prev: any) => ({
        ...prev,
        state: {
          ...prev.state,
          isConnected: true,
          phase: 'CONNECTED',
          serverUrl: 'http://dummy-tldw'
        },
        checkOnce: async () => {}
      }))
    })

    await page.goto(optionsUrl + '#/notes')
    await page.waitForLoadState('networkidle')

    const textarea = page.getByPlaceholder('Write your note here...')
    await textarea.fill('Unsaved note content')

    const newNoteButton = page.getByRole('button', { name: /New note/i }).first()
    await newNoteButton.click()

    await expect(page.getByText(/Discard changes\?/i)).toBeVisible()

    const cancelButton = page.getByRole('button', { name: /Cancel/i })
    await cancelButton.click()
    await expect(textarea).toHaveValue('Unsaved note content')

    await newNoteButton.click()
    const discardButton = page.getByRole('button', { name: /Discard/i })
    await discardButton.click()
    await expect(textarea).toHaveValue('')

    await context.close()
  })
})

