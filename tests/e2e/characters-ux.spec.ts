import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'
import { MockTldwServer } from './utils/mock-server'
import { grantHostPermission } from './utils/permissions'

const seedConfig = (page: any, serverUrl: string) =>
  page.evaluate(
    (cfg) =>
      new Promise<void>((resolve) => {
        // @ts-ignore
        chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
      }),
    { serverUrl, authMode: 'single-user', apiKey: 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY' }
  )

test.describe('Characters workspace UX', () => {
  test('empty state, CRUD toasts, accessible actions, and focus handling', async () => {
    const server = new MockTldwServer()
    await server.start()

    const { context, page, extensionId, optionsUrl } =
      await launchWithBuiltExtension()

    const granted = await grantHostPermission(
      context,
      extensionId,
      `${server.url}/*`
    )
    if (!granted) {
      test.skip(true, 'Host permission not granted for mock server')
    }

    await page.goto(optionsUrl)
    await seedConfig(page, server.url)

    await page.goto(`${optionsUrl}#/characters`)

    await expect(
      page.getByRole('heading', { name: /No characters yet/i })
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: /Create character/i })
    ).toBeVisible()

    // Create
    await page.getByRole('button', { name: /New character/i }).click()
    await page.getByLabel(/Name/i).fill('Test Character')
    await page.getByLabel(/Description/i).fill('A helpful test persona')
    await page.getByLabel(/Tags/i).click()
    await page.keyboard.type('writer')
    await page.keyboard.press('Enter')
    await page.getByLabel(/Greeting message/i).fill('Hello from test!')
    await page.getByLabel(/Behavior \/ instructions/i).fill(
      'You are a cheerful helper.'
    )
    await page.getByRole('button', { name: /Create character/i }).click()
    await expect(
      page.getByText(/Character created/i)
    ).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('button', { name: /New character/i })
    ).toBeFocused()

    // Accessible action buttons
    await expect(
      page.getByRole('button', { name: /Chat as Test Character/i })
    ).toBeVisible()
    const editBtn = page.getByRole('button', {
      name: /Edit character Test Character/i
    })
    await expect(editBtn).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Delete character Test Character/i })
    ).toBeVisible()

    // Edit
    await editBtn.click()
    await page.getByLabel(/Name/i).fill('Test Character')
    await page.getByLabel(/Description/i).fill('Updated description')
    await page.getByRole('button', { name: /Save changes/i }).click()
    await expect(
      page.getByText(/Character updated/i)
    ).toBeVisible({ timeout: 10_000 })
    await expect(editBtn).toBeFocused()

    // Delete
    await page
      .getByRole('button', { name: /Delete character Test Character/i })
      .click()
    await page
      .getByRole('button', { name: /Delete/i })
      .click()
    await expect(
      page.getByText(/Character deleted/i)
    ).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('heading', { name: /No characters yet/i })
    ).toBeVisible({ timeout: 10_000 })

    await context.close()
    await server.stop()
  })

  test('shows capability empty state when Characters API missing', async () => {
    const server = new MockTldwServer({
      '/openapi.json': (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            openapi: '3.0.0',
            info: { version: 'test' },
            paths: {
              '/api/v1/health': { get: {} }
            }
          })
        )
      }
    })
    await server.start()

    const { context, page, extensionId, optionsUrl } =
      await launchWithBuiltExtension()

    const granted = await grantHostPermission(
      context,
      extensionId,
      `${server.url}/*`
    )
    if (!granted) {
      test.skip(true, 'Host permission not granted for mock server')
    }

    await page.goto(optionsUrl)
    await seedConfig(page, server.url)

    await page.goto(`${optionsUrl}#/characters`)

    await expect(
      page.getByText(/Characters API not available on this server/i)
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: /Open Diagnostics/i })
    ).toBeVisible()

    await context.close()
    await server.stop()
  })
})
