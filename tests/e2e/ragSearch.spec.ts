import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { MockTldwServer } from './utils/mock-server'
import {
  waitForConnectionStore,
  forceConnected
} from './utils/connection'

test.describe('RAG search in sidepanel', () => {
  let server: MockTldwServer
  test.beforeAll(async () => { server = new MockTldwServer(); await server.start() })
  test.afterAll(async () => { await server.stop() })

  test('search, insert and ask from results', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, openSidepanel, optionsUrl } = await launchWithExtension(extPath)

    // Configure server + key on Settings → tldw page
    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })
    await page.getByLabel('Server URL').fill(server.url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
    await page.getByRole('button', { name: 'Save' }).click()

    // Open sidepanel UI
    const sp = await openSidepanel()

    // Open RAG Search
    await sp.getByRole('button', { name: /More options/i }).click()
    await sp.keyboard.press('Escape') // close menu
    await sp.getByText('Show RAG Search').click()

    // Enter query and tag
    const q = sp.getByPlaceholder('Search your knowledge…')
    await q.fill('hello')
    await sp.getByPlaceholder('Add tag (Enter)').fill('docs')
    await sp.keyboard.press('Enter')
    await sp.getByRole('button', { name: 'Search' }).click()

    // Expect at least one result, then Insert
    await expect(sp.getByText(/Source:/)).toBeVisible({ timeout: 10_000 })
    await sp.getByRole('link', { name: 'Insert' }).first().click()

    // Message textarea should contain inserted text
    const ta = sp.getByRole('textbox')
    await expect(ta).toContainText('Source:')

    // Ask directly
    await sp.getByRole('link', { name: 'Ask' }).first().click()
    await expect(sp.getByText(/Hello!?/)).toBeVisible({ timeout: 10_000 })

    await context.close()
  })

  test('Playground shows context summary when knowledge + tabs are active', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed connection + a selected tab via exposed stores
    await waitForConnectionStore(page, 'rag-context-connected')
    await forceConnected(page, {}, 'rag-context-connected')
    await page.evaluate(() => {
      const msgStore: any = (window as any).__tldw_useStoreMessageOption
      if (!msgStore) return
      msgStore.setState({
        selectedDocuments: [
          { id: 'tab-1', title: 'Example tab', url: 'https://example.com', favIconUrl: '' }
        ]
      })
    })

    // Context label should be visible above the composer
    const contextLabel = page.getByText(/Context:/i)
    await expect(contextLabel).toBeVisible()

    // Clicking the knowledge chip should focus and open the Knowledge control
    const knowledgeChip = page.getByRole('button', { name: /No knowledge selected|Knowledge/i }).first()
    await knowledgeChip.click()
    // After clicking, the Knowledge menu/button should be focused (via data attribute)
    const knowledgeTrigger = page.locator('[data-playground-knowledge-trigger="true"]').first()
    await expect(knowledgeTrigger).toBeFocused()

    await context.close()
  })
})
