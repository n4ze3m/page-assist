import { test, expect } from '@playwright/test'
import { launchWithBuiltExtension } from './utils/extension-build'
import { MockTldwServer } from './utils/mock-server'
import { grantHostPermission } from './utils/permissions'

test.describe('i18n smoke test for Quick Ingest & Characters', () => {
  test('non-English locale loads Quick Ingest hint and None character option', async () => {
    const server = new MockTldwServer()
    await server.start()

    const { context, page, extensionId, optionsUrl } =
      await launchWithBuiltExtension({
        seedConfig: {
          serverUrl: server.url,
          authMode: 'single-user',
          apiKey: 'THIS-IS-A-SECURE-KEY-123-FAKE-KEY'
        }
      })

    const granted = await grantHostPermission(
      context,
      extensionId,
      `${server.url}/*`
    )
    if (!granted) {
      test.skip(true, 'Host permission not granted for mock server')
    }

    await page.goto(optionsUrl)

    // Force a non-English locale (German) and reload so i18next picks it up.
    await page.evaluate(() => {
      window.localStorage.setItem('i18nextLng', 'de')
    })
    await page.reload()

    // Connection card: Quick Ingest inline hint should resolve to a real string,
    // not a missing key literal.
    const inlineHint = page.getByText(
      /Quick Ingest can queue URLs and files while your server is offline so you can process them once you reconnect\./i
    )
    await expect(inlineHint).toBeVisible()

    // Sanity check: the missing-key literal should not be present.
    await expect(
      page.getByText(/option:connectionCard\.quickIngestInlineHint/i)
    ).toHaveCount(0)

    // Open the Playground and verify the Characters selector shows a "None" option.
    await page.goto(`${optionsUrl}#/playground`)

    const trigger = page
      .getByRole('button', { name: /Select character/i })
      .first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    const noneOption = page.getByText(/None \(no character\)/i).first()
    await expect(noneOption).toBeVisible()

    await context.close()
    await server.stop()
  })
})

