import { test, expect, Page } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import {
  waitForConnectionStore,
  forceConnected,
  forceErrorUnreachable
} from './utils/connection'

const TEST_EXT_PATH = path.resolve('build/chrome-mv3')

// For onboarding tests we exercise the wizard directly on a dedicated
// /onboarding-test route and optionally enable the offline bypass so
// health checks succeed without a live tldw_server.
async function prepareFirstRun(page: Page, { enableBypass = true } = {}) {
  await page.waitForFunction(
    () =>
      typeof (window as any).__tldw_useConnectionStore === 'function' ||
      typeof (window as any).__tldw_enableOfflineBypass === 'function',
    null,
    { timeout: 10_000 }
  )

  const debugState = await page.evaluate(() => {
    const w = window as any
    const store = w.__tldw_useConnectionStore
    if (store?.getState) {
      try {
        const snapshot = store.getState().state
        return {
          hasCompletedFirstRun: snapshot.hasCompletedFirstRun,
          phase: snapshot.phase,
          configStep: snapshot.configStep,
          mode: snapshot.mode,
          serverUrl: snapshot.serverUrl
        }
      } catch {
        return { error: 'getState-failed' }
      }
    }
    return { error: 'store-missing' }
  })
  // eslint-disable-next-line no-console
  console.log('ONBOARDING_DEBUG_INITIAL', JSON.stringify(debugState))

  if (enableBypass) {
    await page.evaluate(async () => {
      const w: any = window as any
      if (typeof w.__tldw_enableOfflineBypass === 'function') {
        try {
          await w.__tldw_enableOfflineBypass()
        } catch {
          // ignore bypass failures; tests will still check copy
        }
      }
    })
  }
}

test.describe('Onboarding wizard', () => {

  test('guides first-run config and tests connection', async () => {
    const extPath = TEST_EXT_PATH
    const { context, page, optionsUrl } = await launchWithExtension(extPath)
    try {
      await page.goto(`${optionsUrl}#/onboarding-test`)
      console.log('T1: navigated to /onboarding-test')
      await prepareFirstRun(page, { enableBypass: true })
      console.log('T1: after prepareFirstRun')

      // Wizard visible
      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      // Step 1: server URL – scroll wizard into view first
      const urlInput = page.getByLabel(/Server URL/i)
      await urlInput.scrollIntoViewIfNeeded()
      await urlInput.fill('http://127.0.0.1:8000')
      console.log('T1: filled server URL')

      // Docs link is visible and opens the server docs (href or target may vary by browser)
      const docsLink = page.getByRole('button', { name: /Learn how tldw server works/i })
      await expect(docsLink).toBeVisible()
      await page.getByRole('button', { name: /Next/i }).click()
      console.log('T1: clicked Next from URL step')

      // Step 2: Single user + API key
      await page
        .getByText('Single User (API Key)', { exact: true })
        .click()
      console.log('T1: selected single-user auth mode')
      await page
        .getByPlaceholder(/Enter your API key/i)
        .fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
      console.log('T1: filled API key')
      await page.getByRole('button', { name: /Continue/i }).click()
      console.log('T1: clicked Continue from auth step')
      await waitForConnectionStore(page, 'T1-after-auth')
      await forceConnected(page, {}, 'T1-forceConnected')

      // Step 3: Connection shows Connected
      console.log('T1: waiting for Connection summary')
      await expect(page.getByText(/Connection:/)).toBeVisible()
      await expect(page.getByText(/Connected/)).toBeVisible({ timeout: 10_000 })

      // Finish onboarding, then return to the main Options index where
      // the chat playground/composer lives, and expect the chat UI.
      await page.getByRole('button', { name: /Finish/i }).click()
      console.log('T1: clicked Finish, navigating back to root')
      await page.goto(`${optionsUrl}#/`)
      console.log('T1: navigated to /, waiting for composer')
      await expect(page.getByPlaceholder('Type a message...')).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('does not auto-advance when URL becomes reachable', async () => {
    const extPath = TEST_EXT_PATH
    const { context, page, optionsUrl } = await launchWithExtension(extPath)
    try {
      await page.goto(`${optionsUrl}#/onboarding-test`)
      await prepareFirstRun(page, { enableBypass: true })

      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      const urlInput = page.getByLabel(/Server URL/i)
      await urlInput.scrollIntoViewIfNeeded()
      await urlInput.fill('http://127.0.0.1:8000')

      await expect(
        page.getByText(/Server responded successfully\. You can continue\./i)
      ).toBeVisible()

      await expect(
        page.getByText(/Authentication Mode/i)
      ).toHaveCount(0)

      await page.getByRole('button', { name: /Next/i }).click()
      await expect(
        page.getByText(/Authentication Mode/i)
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('explains knowledge search health in plain language', async () => {
    const extPath = TEST_EXT_PATH
    const { context, page, optionsUrl } = await launchWithExtension(extPath)
    try {
      await page.goto(`${optionsUrl}#/onboarding-test`)
      console.log('T3: navigated to /onboarding-test')
      await prepareFirstRun(page, { enableBypass: true })
      console.log('T3: after prepareFirstRun (connected path)')
      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      const urlInput = page.getByLabel(/Server URL/i)
      await urlInput.scrollIntoViewIfNeeded()
      await urlInput.fill('http://127.0.0.1:8000')
      await page.getByRole('button', { name: /Next/i }).click()
      console.log('T3: connected path — after URL Next')

      await page
        .getByText('Single User (API Key)', { exact: true })
        .click()
      await page
        .getByPlaceholder(/Enter your API key/i)
        .fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
      await page.getByRole('button', { name: /Continue/i }).click()
      console.log('T3: connected path — after auth Continue')
      await waitForConnectionStore(page, 'T3-connected-after-auth')
      await forceConnected(page, {}, 'T3-forceConnected')

      await expect(
        page.getByText(/Connection:/i)
      ).toBeVisible()

      await expect(
        page.getByText(/Knowledge search & retrieval:/i)
      ).toBeVisible()

      await expect(
        page.getByText(
          /search your notes, media, and other connected knowledge sources/i
        )
      ).toBeVisible()
      console.log('T3: connected path — verified RAG help copy')

      // Finish without connecting path uses friendly copy when forced failure.
      // Simulate this entirely client-side via the test bypass and a manual
      // connection store mutation so we don't depend on real network errors.
      await page.reload()
      console.log('T3: reloaded page for offline path')
      await prepareFirstRun(page, { enableBypass: true })
      console.log('T3: after prepareFirstRun (offline path)')
      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      const urlInput2 = page.getByLabel(/Server URL/i)
      await urlInput2.scrollIntoViewIfNeeded()
      await urlInput2.fill('http://127.0.0.1:9999')
      await page.getByRole('button', { name: /Next/i }).click()
      console.log('T3: offline path — after URL Next')

      await page
        .getByText('Single User (API Key)', { exact: true })
        .click()
      await page
        .getByPlaceholder(/Enter your API key/i)
        .fill('THIS-IS-A-SECURE-KEY-123-FAKE-KEY')
      await page.getByRole('button', { name: /Continue/i }).click()
      console.log('T3: offline path — after auth Continue, forcing error state')

      // Force an unreachable/failed state in the connection store without
      // making real /health calls so the wizard shows the friendly offline copy.
      await waitForConnectionStore(page, 'T3-offline-after-auth')
      await forceErrorUnreachable(page, {}, 'T3-forceErrorUnreachable')

      await expect(
        page.getByText(/You can finish setup now and explore the UI without a server/i)
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('can enter demo mode via onboarding path', async () => {
    const extPath = TEST_EXT_PATH
    const { context, page, optionsUrl } = await launchWithExtension(extPath)
    try {
      await page.goto(`${optionsUrl}#/onboarding-test`)
      await prepareFirstRun(page, { enableBypass: false })

      await expect(
        page.getByText(/Let’s get you connected|Let's get you connected/i)
      ).toBeVisible()

      // Choose the demo path from the welcome step
      await page
        .getByText(/Just explore with a local demo/i)
        .click()

      // Confirm demo mode selection
      await page
        .getByRole('button', { name: /Use local demo mode/i })
        .click()

      // Connection store should reflect demo mode + completed first run
      const snapshot = await page.evaluate(() => {
        const w: any = window as any
        const store = w.__tldw_useConnectionStore
        if (!store?.getState) return null
        return store.getState().state
      })

      expect(snapshot?.mode).toBe('demo')
      expect(snapshot?.hasCompletedFirstRun).toBe(true)

      // Navigate to the main Options index where the chat playground lives
      await page.goto(`${optionsUrl}#/`)
      // Demo mode should be visible in the chat empty state
      await expect(
        page.getByText(/You’re in demo mode|You're in demo mode/i)
      ).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
