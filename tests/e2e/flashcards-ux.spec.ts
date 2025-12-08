import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { grantHostPermission } from "./utils/permissions"
import { requireRealServerConfig } from "./utils/real-server"

test.describe('Flashcards workspace UX', () => {
  test('shows connection-focused empty state when server is offline', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, extensionId } = (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    await page.goto(`${optionsUrl}#/flashcards`)

    // When not connected or misconfigured, the Flashcards workspace should
    // surface clear connection messaging (either the global connection card
    // or the feature-specific empty state).
    const headline = page.getByText(
      /Connect to use Flashcards|Explore Flashcards in demo mode|Can.?t reach your tldw server/i
    )
    await expect(headline).toBeVisible()

    const actionButton = page.getByRole('button', {
      name: /Go to server card|Retry connection|Set up server/i
    })
    await expect(actionButton).toBeVisible()

    // Clicking the workspace CTA should bring the server connection card into view.
    await actionButton.click()
    const card = page.locator('#server-connection-card')
    await expect(card).toBeVisible()
    await expect(
      card.getByRole('button', { name: /Back to workspace/i })
    ).toBeVisible()

    await context.close()
  })

  test("connected workspace shows tabbed UX and helpful empty states or content", async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve(".output/chrome-mv3")
    const { context, page, extensionId } =
      (await launchWithExtension(extPath)) as any
    const optionsUrl = `chrome-extension://${extensionId}/options.html`

    // Ensure host permission for the real server is granted
    const granted = await grantHostPermission(
      context,
      extensionId,
      new URL(serverUrl).origin + "/*"
    )
    if (!granted) {
      test.skip(
        true,
        "Host permission not granted for tldw_server origin; allow it in chrome://extensions > tldw Assistant > Site access, then re-run"
      )
    }

    // Seed valid config so the shared connection store treats the server as connected
    await page.goto(optionsUrl)
    await page.evaluate(
      (cfg) =>
        new Promise<void>((resolve) => {
          // @ts-ignore
          chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
        }),
      { serverUrl, authMode: "single-user", apiKey }
    )

    // Navigate directly to Flashcards workspace
    await page.goto(`${optionsUrl}#/flashcards`)
    await page.waitForLoadState("networkidle")

    // Tabs for core workflows should be visible
    await expect(page.getByRole("tab", { name: /Review/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Create/i })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Manage/i })).toBeVisible()
    await expect(
      page.getByRole("tab", { name: /Import \/ Export/i })
    ).toBeVisible()

    // Review tab: either the "no cards due" empty state or some cards being due
    const reviewState = page.getByText(
      /No cards due for review|cards due for review/i
    )
    await expect(reviewState).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Create a new card/i })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Import a deck/i })
    ).toBeVisible()

    // Create tab: helper copy and template guidance
    await page.getByRole("tab", { name: /Create/i }).click()
    await expect(
      page.getByText(/Create flashcards from your notes/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Use the front for the question and the back for the answer/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Card template/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Basic shows a question on the front and answer on the back/i)
    ).toBeVisible()

    // Manage tab: empty state and bulk actions helper text
    await page.getByRole("tab", { name: /Manage/i }).click()
    await expect(
      page.getByText(/No flashcards yet|No cards match your filters/i)
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Bulk actions/i })
    ).toBeVisible()
    await expect(
      page.getByText(/applies actions to every card that matches your filters/i)
    ).toBeVisible()

    // Import / Export tab: import example + export helper copy
    await page.getByRole("tab", { name: /Import \/ Export/i }).click()
    await expect(
      page.getByText(/Paste TSV\/CSV lines: Deck, Front, Back, Tags, Notes/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Deck\s+Front\s+Back\s+Tags\s+Notes/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Column mapping/i)
    ).toBeVisible()
    await expect(
      page.getByText(/Filter by deck, tag, or search, then export as CSV\/TSV/i)
    ).toBeVisible()

    await context.close()
    await server.stop()
  })
})
