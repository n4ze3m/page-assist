import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'

test.describe('Knowledge RAG workspace UX', () => {
  test('shows RAG workspace and (when available) allows toggling per-reply RAG', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    // Pretend the server is connected so the Knowledge workspace renders
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
        // Avoid background health checks from flipping the state during the test
        checkOnce: async () => {}
      }))
    })

    await page.goto(optionsUrl + '#/settings/knowledge')
    await page.waitForLoadState('networkidle')

    // RAG workspace header should be present
    await expect(
      page.getByText(/RAG search & knowledge chat/i)
    ).toBeVisible()

    // If the bundled OpenAPI spec does not advertise RAG endpoints,
    // the workspace shows a capability callout instead of full controls.
    const ragUnsupportedCallout = page.getByText(
      /RAG search is not available on this server/i
    )
    const calloutVisible = await ragUnsupportedCallout
      .isVisible()
      .catch(() => false)

    if (!calloutVisible) {
      // Auto-RAG toggle should be visible and wired to chatMode
      const autoRagSwitch = page.getByRole('switch', {
        name: /Use RAG for every reply/i
      })
      await expect(autoRagSwitch).toBeVisible()

      const initialMode = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const store = (window as any).__tldw_useStoreMessageOption
        return store ? store.getState().chatMode : null
      })
      expect(initialMode).toBe('normal')

      await autoRagSwitch.click()

      const ragMode = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const store = (window as any).__tldw_useStoreMessageOption
        return store ? store.getState().chatMode : null
      })
      expect(ragMode).toBe('rag')

      await autoRagSwitch.click()

      const backMode = await page.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const store = (window as any).__tldw_useStoreMessageOption
        return store ? store.getState().chatMode : null
      })
      expect(backMode).toBe('normal')
    } else {
      // When RAG is unsupported, we at least show a Diagnostics CTA
      await expect(
        page.getByRole('button', { name: /Health & diagnostics/i })
      ).toBeVisible()
    }

    await context.close()
  })
})
