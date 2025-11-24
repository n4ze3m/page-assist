import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import { grantHostPermission } from './utils/permissions'
import { MockTldwServer } from './utils/mock-server'
const DEFAULT_TLDW_API_KEY = 'THIS-IS-A-SECURE-KEY-123-REPLACE-ME'

test.describe('Options first-run and connection panel', () => {
  test('shows connection card and inline Set up server link navigates to tldw settings', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed default config so the card deterministically shows the connection error state.
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        // @ts-ignore
        chrome.storage.local.clear(() => resolve())
      })
      // @ts-ignore
      await new Promise<void>((resolve) => {
        chrome.storage.local.set(
          {
            tldwConfig: {
              serverUrl: 'http://127.0.0.1:8000',
              authMode: 'single-user',
              apiKey: DEFAULT_TLDW_API_KEY
            }
          },
          () => resolve()
        )
      })
    })
    await page.reload()

    // Expect deterministic error card copy
    await expect(page.getByText(/Can.?t reach your tldw server/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Open tldw server settings/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Change server/i })).toBeVisible()

    // Inline link button: "Set up server" should navigate to Settings → tldw
    await page.getByRole('button', { name: /Change server/i }).click()

    // URL should include settings route and the tldw page should render
    await expect(page).toHaveURL(/options\.html#\/settings\/tldw/i)
    await expect(page.getByText(/tldw Server Configuration/i)).toBeVisible()

    await context.close()
  })

  test('Start chatting focuses the composer when connected', async () => {
    const server = new MockTldwServer()
    server.setApiKey(DEFAULT_TLDW_API_KEY)
    const serverPort = await server.start(0)
    const serverBaseUrl = `http://127.0.0.1:${serverPort}`
    const hostPermissionOrigin = `${serverBaseUrl}/*`

    const extPath = path.resolve('.output/chrome-mv3')
    const seed = {
      tldwConfig: {
        serverUrl: serverBaseUrl,
        authMode: 'single-user',
        apiKey: DEFAULT_TLDW_API_KEY
      }
    }
    const { context, page: initialPage, extensionId } = await launchWithExtension(extPath, { seedConfig: seed }) as any
    let page = initialPage
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    // Ensure host permission for the mock server is granted
    const granted = await grantHostPermission(context, extensionId, hostPermissionOrigin)
    if (!granted) {
      test.skip(true, `Host permission not granted for ${hostPermissionOrigin}; allow it in chrome://extensions > tldw Assistant > Site access, then re-run`)
    }

    // Seed valid config so the card shows connected state
    await page.evaluate((cfg) => new Promise<void>((resolve) => {
      // @ts-ignore
      chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
    }), { serverUrl: serverBaseUrl, authMode: 'single-user', apiKey: DEFAULT_TLDW_API_KEY })
    await page.reload()
    page = await context.newPage()
    page.on('console', (msg) => console.log('console', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.log('pageerror', err.message))
    await page.goto(optionsUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#root', { state: 'attached', timeout: 5000 })
    // Ensure the connection card renders (error or connected)
    const cardHeadline = page.locator('body').getByText(/Can.?t reach your tldw server|Connected to/i)
    await expect(cardHeadline).toBeVisible()

    // Force connected state via test hook to avoid network flakiness
    await page.evaluate((url) => {
      // @ts-ignore
      const store = window.__tldw_useConnectionStore
      if (store?.setState) {
        const now = Date.now()
        store.setState({
          state: {
            phase: 'connected',
            serverUrl: url,
            lastCheckedAt: now,
            lastError: null,
            lastStatusCode: null,
            isConnected: true,
            isChecking: false,
            knowledgeStatus: 'ready',
            knowledgeLastCheckedAt: now,
            knowledgeError: null
          },
          checkOnce: async () => {}
        })
      }
    }, serverBaseUrl)

    // Connected card shows Start chatting; clicking focuses the composer
    await expect(page.getByRole('button', { name: /Start chatting/i })).toBeVisible()
    await page.getByRole('button', { name: /Start chatting/i }).click()
    await expect(page.locator('#textarea-message')).toBeFocused()

    await context.close()
    await server.stop()
  })
})
