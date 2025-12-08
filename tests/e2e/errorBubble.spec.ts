import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { requireRealServerConfig } from "./utils/real-server"

test.describe("Error bubble in chat (real server)", () => {
  test("shows Invalid API key error as assistant message", async () => {
    const { serverUrl } = requireRealServerConfig(test)

    const extPath = path.resolve("build/chrome-mv3")
    const { context, page, optionsUrl } = await launchWithExtension(extPath)

    await page.goto(optionsUrl + "#/settings/tldw", {
      waitUntil: "domcontentloaded"
    })
    await page.getByLabel("Server URL").fill(serverUrl)
    await page.getByText("Authentication Mode").scrollIntoViewIfNeeded()
    await page.getByText("Single User (API Key)").click()
    await page.getByLabel("API Key").fill("wrong-key")
    await page.getByRole("button", { name: "Save" }).click()

    const input = page.getByPlaceholder("Type a message...")
    await input.fill("hello")
    await input.press("Enter")

    // Friendly summary and next-step guidance
    const summary = page.getByText(/couldn.?t reach your tldw server/i)
    await expect(summary).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByText(/open settings .*tldw server/i)
    ).toBeVisible()

    // Error bubble should be announced as an alert
    const alert = page
      .getByRole("alert")
      .filter({ hasText: /couldn.?t reach your tldw server/i })
    await expect(alert).toBeVisible()

    // Technical details remain available behind a toggle
    const toggle = page.getByRole("button", {
      name: /show technical details/i
    })
    await expect(toggle).toBeVisible()
    await toggle.click()
    // Real server error text may vary; assert we surface some technical detail.
    await expect(
      page.getByText(/Invalid|unauthorized|401|forbidden/i)
    ).toBeVisible()

    await context.close()
  })
})
