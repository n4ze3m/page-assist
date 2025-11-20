import { test, expect } from "@playwright/test"
import { launchWithBuiltExtension } from "./utils/extension-build"

test.describe("Media workspace UX", () => {
  test("media mode shows media-focused copy and hides review controls", async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl + "#/media")
    await page.waitForLoadState("networkidle")

    // Search placeholder is media-focused (media-only wording)
    const mediaSearch = page.getByPlaceholder(/Search media \(title\/content\)/i)
    await expect(mediaSearch).toBeVisible()

    // Review-specific analysis mode controls should not be visible in Media view
    await expect(page.getByRole("radio", { name: /Use Review/i })).toHaveCount(0)
    await expect(page.getByRole("radio", { name: /Use Summary/i })).toHaveCount(0)

    await context.close()
  })
})

