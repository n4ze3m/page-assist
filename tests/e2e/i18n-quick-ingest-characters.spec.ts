import { test, expect } from "@playwright/test"
import { launchWithBuiltExtension } from "./utils/extension-build"
import { grantHostPermission } from "./utils/permissions"
import { requireRealServerConfig } from "./utils/real-server"

test.describe('i18n smoke test for Quick Ingest & Characters', () => {
  test('non-English locale loads Quick Ingest hint and None character option', async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const { context, page, extensionId, optionsUrl } =
      await launchWithBuiltExtension({
        seedConfig: {
          serverUrl,
          authMode: 'single-user',
          apiKey
        }
      })

    const granted = await grantHostPermission(
      context,
      extensionId,
      new URL(serverUrl).origin + "/*"
    )
    if (!granted) {
      test.skip(
        true,
        "Host permission not granted for tldw_server origin"
      )
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

    // Open the Playground and verify the Characters selector shows localized search
    // and a "None" option without missing-key literals.
    await page.goto(`${optionsUrl}#/playground`)

    const trigger = page
      .getByRole('button', { name: /Select character/i })
      .first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    // Search input placeholder should resolve for the non-English locale.
    const searchInput = page.getByPlaceholder(/Search characters by name/i)
    await expect(searchInput).toBeVisible()

    // Missing-key literal for search placeholder should not appear.
    await expect(
      page.getByText(/option:characters\.searchPlaceholder/i)
    ).toHaveCount(0)

    const noneOption = page.getByText(/None \(no character\)/i).first()
    await expect(noneOption).toBeVisible()

    await context.close()
  })
})
