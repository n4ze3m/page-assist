import { test, expect, chromium } from "@playwright/test"
import path from "node:path"

test("loads the built extension options page", async () => {
  const extensionPath = path.join(process.cwd(), "build", "chrome-mv3")
  const context = await chromium.launchPersistentContext("", {
    headless: true,
    channel: "chromium",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })
  try {
    const background =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"))
    const extensionId = background.url().split("/")[2]
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/options.html`)
    await expect(page.locator("textarea")).toBeVisible()
  } finally {
    await context.close()
  }
})
