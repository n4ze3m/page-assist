import { test, expect, chromium } from "@playwright/test"
import path from "node:path"

const extensionPath = path.join(process.cwd(), "build", "chrome-mv3")

test("sidepanel chat smoke", async () => {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    bypassCSP: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  try {
    // Wait for extension to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const background =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"))
    const extensionId = background.url().split("/")[2]
    const page = await context.newPage()

    await page.route(/http:\/\/127\.0\.0\.1:11434\/?$/, async (route) => {
      await route.fulfill({ status: 200, body: "ok" })
    })

    await page.route(
      /http:\/\/127\.0\.0\.1:11434\/api\/tags$/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            models: [
              {
                name: "mock_model",
                model: "mock_model",
                modified_at: new Date().toISOString(),
                size: 0,
                digest: "",
                details: {
                  parent_model: "",
                  format: "",
                  family: "",
                  families: [],
                  parameter_size: "",
                  quantization_level: ""
                }
              }
            ]
          })
        })
      }
    )

    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: [
          JSON.stringify({
            model: "mock_model",
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: "Hello from Page Assist!" },
            done: false
          }),
          JSON.stringify({
            done: true
          })
        ].join("\n")
      })
    })

    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)
    await page.waitForLoadState("networkidle")

    await expect(page.getByText("Page Assist", { exact: false })).toBeVisible()

    const modelSelect = page.getByRole("combobox")
    await expect(modelSelect).toBeVisible()
    await modelSelect.click()

    await modelSelect.type("mock_model")
    await modelSelect.press("Enter")

    const input = page.locator("textarea.pa-textarea")
    await expect(input).toBeVisible()
    await input.fill("Hi there")
    await input.press("Enter")

    await expect(page.getByText("Hi there")).toBeVisible()
    // Verify visibility after wait
    await expect(page.getByText("Hello from Page Assist!")).toBeVisible({ timeout: 50000 });

  } finally {
    await context.close()
  }
})
