import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { requireRealServerConfig } from "./utils/real-server"

test.describe("API Key validation", () => {
  test("rejects invalid key and accepts valid key (real server)", async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve("build/chrome-mv3")
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    await page.goto(optionsUrl + "#/settings/tldw", {
      waitUntil: "domcontentloaded"
    })

    await page.getByLabel("Server URL").fill(serverUrl)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()

    // Invalid key: use an obviously wrong value and expect some failure hint.
    await page.getByLabel("API Key").fill("invalid-key-for-test")
    await page.getByRole("button", { name: "Test Connection" }).click()
    await expect(
      page.getByText(/Connection failed|Invalid API key|Unauthorized/i)
    ).toBeVisible()

    // Valid key from env
    await page.getByLabel("API Key").fill(apiKey)
    await page.getByRole("button", { name: "Test Connection" }).click()
    await expect(page.getByText(/Connected/i)).toBeVisible()

    await context.close()
  })
})
