import { test, expect, chromium } from "@playwright/test"
import path from "node:path"

const extensionPath = path.join(process.cwd(), "build", "chrome-mv3")

test("sidepanel chat smoke", async () => {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
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
                name: "llama2",
                model: "llama2",
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
            model: "llama2",
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: "Hello" },
            done: false
          }),
          JSON.stringify({
            model: "llama2",
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: " from Page Assist" },
            done: false
          }),
          JSON.stringify({
            model: "llama2",
            created_at: new Date().toISOString(),
            message: { role: "assistant", content: "!" },
            done: true
          })
        ].join("\n")
      })
    })

    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`)

    await expect(page.getByText("Page Assist", { exact: false })).toBeVisible()

    const modelSelect = page.getByRole("combobox")
    await expect(modelSelect).toBeVisible()
    await modelSelect.click()
    await page.getByText("llama2").click()

    const input = page.locator("textarea.pa-textarea")
    await expect(input).toBeVisible()
    await input.fill("Hi there")
    await input.press("Enter")

    await expect(page.getByText("Hi there")).toBeVisible()
    await expect(page.getByText("Hello from Page Assist!")).toBeVisible()
  } finally {
    await context.close()
  }
})
