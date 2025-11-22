import { test, expect } from "@playwright/test"
import { launchWithBuiltExtension } from "./utils/extension-build"

test.describe("Media multi page", () => {
  test("renders offline empty state (no crash)", async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    await page.goto(optionsUrl + "#/media-multi")
    await page.waitForLoadState("networkidle")

    const offlineHeadline = page.getByText(/Connect to use Media/i)
    await expect(offlineHeadline).toBeVisible()

    await context.close()
  })

  test("list mode shows dropdown selector", async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension()

    // Seed connection as connected so the page renders controls
    await page.goto(optionsUrl)
    await page.waitForLoadState("networkidle")
    await page.evaluate(() => {
      const store = (window as any).__tldw_useConnectionStore
      if (!store) return
      const prev = store.getState()
      store.setState({
        ...prev,
        state: { ...prev.state, phase: "connected", isConnected: true, serverUrl: "http://127.0.0.1:0" },
        checkOnce: async () => {}
      })
    })

    await page.goto(optionsUrl + "#/media-multi")
    await page.waitForLoadState("networkidle")

    // Switch to List and assert dropdown appears
    const listToggle = page.getByRole("radio", { name: /List/i })
    await listToggle.click({ force: true })

    const picker = page.getByRole("combobox")
    await expect(picker).toBeVisible()

    await context.close()
  })
})
