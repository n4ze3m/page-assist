import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { requireRealServerConfig } from "./utils/real-server"

test.describe("Chat across tldw models (real server)", () => {
  test("lists available tldw models and can chat with a selected model", async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve(".output/chrome-mv3")
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    // Configure server + API key
    await page.goto(optionsUrl + "#/settings/tldw", {
      waitUntil: "domcontentloaded"
    })
    await page.getByLabel("Server URL").fill(serverUrl)
    await page.getByText("Authentication Mode").scrollIntoViewIfNeeded()
    await page.getByText("Single User (API Key)").click()
    await page.getByLabel("API Key").fill(apiKey)
    await page.getByRole("button", { name: "Save" }).click()

    // Open model selector and ensure at least one model is listed
    await page.getByRole("button", { name: /Select a model/i }).click()
    const firstModel = page.getByRole("menuitem").first()
    await expect(firstModel).toBeVisible()

    // Select the first model and send a message
    await firstModel.click()

    const input = page.getByPlaceholder("Type a message...")
    await input.fill("hello from e2e chat-models")
    await input.press("Enter")

    // Streaming indicator appears and then disappears, as in chatStreaming test
    const stopButton = page.getByRole("button", {
      name: /Stop streaming/i
    })
    await expect(stopButton).toBeVisible({ timeout: 10_000 })
    await expect(stopButton).toBeHidden({ timeout: 20_000 })

    await context.close()
  })

  test("error handling for chat failures (requires controllable backend)", async () => {
    test.skip(
      true,
      "This scenario requires forcing server-side 5xx responses; keep covered by backend tests or a dedicated mock-based suite."
    )
  })
})
