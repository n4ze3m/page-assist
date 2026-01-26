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

    const trigger = page.getByTestId("model-select-trigger")
    await expect(trigger).toBeVisible()
    await trigger.click()

    // The dropdown is a portal; wait for any option containing text
    const option = page
      .locator(
        ".ant-dropdown .ant-dropdown-menu-item, .ant-dropdown .ant-dropdown-menu-title-content"
      )
      .filter({ hasText: /mock_model/i })
    await expect(option.first()).toBeVisible()
    await option.first().click()

    const input = page.locator("textarea.pa-textarea")
    await expect(input).toBeVisible()
    await input.fill("Hi there")
    await input.press("Enter")

    // Message may be rendered progressively; wait for either echo or assistant
    await expect(
      page
        .locator("text=Hi there")
        .or(page.locator("text=Hello from Page Assist!"))
    ).toBeVisible({ timeout: 30000 })

    await expect(page.getByText("Hello from Page Assist!")).toBeVisible({
      timeout: 50000
    })
  } finally {
    await context.close()
  }
})
