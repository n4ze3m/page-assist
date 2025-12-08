import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { requireRealServerConfig } from "./utils/real-server"

test.describe("Chat streaming", () => {
  test("streams tokens to chat (real server)", async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve("build/chrome-mv3")
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

    // Open the chat (already on options page with chat input)
    const input = page.getByPlaceholder("Type a message...")
    await input.fill("hello from e2e")
    await input.press("Enter")

    // While streaming, the Stop Streaming button should appear on the latest assistant message
    const stopButton = page.getByRole("button", {
      name: /Stop streaming/i
    })
    await expect(stopButton).toBeVisible({ timeout: 10_000 })

    // After the stream finishes, the Stop button should disappear, indicating completion.
    await expect(stopButton).toBeHidden({ timeout: 20_000 })

    await context.close()
  })
})
