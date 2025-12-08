/**
 * Manual UX Walkthrough - Senior UX Designer Perspective
 *
 * This script walks through the actual application UI and captures
 * screenshots and observations about the real user experience.
 */

import { test, expect } from "@playwright/test"
import { launchWithExtension } from "./utils/extension"
import path from "path"

const TEST_EXT_PATH = path.resolve("build/chrome-mv3")

const API_KEY = process.env.TLDW_E2E_API_KEY || "THIS-IS-A-SECURE-KEY-123-FAKE-KEY"
const SERVER_URL = process.env.TLDW_E2E_SERVER_URL || "http://localhost:8000"

test.describe("Manual UX Walkthrough", () => {

  test("1. First-run experience - what does a new user see?", async () => {
    const { context, page, optionsUrl } = await launchWithExtension(TEST_EXT_PATH)

    try {
      // Listen for console errors
      page.on("console", msg => {
        if (msg.type() === "error") {
          console.log("CONSOLE ERROR:", msg.text())
        }
      })
      page.on("pageerror", err => {
        console.log("PAGE ERROR:", err.message)
      })

      await page.goto(optionsUrl)
      await page.waitForLoadState("domcontentloaded")
      await page.waitForTimeout(5000)

      // Capture what the user actually sees on first run
      await page.screenshot({
        path: "test-results/ux-walkthrough/01-first-run-options.png",
        fullPage: true
      })

      // Log all visible text to understand the UI
      const bodyText = await page.locator("body").innerText()
      console.log("=== FIRST RUN OPTIONS PAGE ===")
      console.log(bodyText.substring(0, 3000))

      // Check what buttons/actions are visible
      const buttons = await page.locator("button").allTextContents()
      console.log("\n=== VISIBLE BUTTONS ===")
      console.log(buttons.filter(b => b.trim()).join(", "))

      // Check for any inputs
      const inputs = await page.locator("input").count()
      console.log(`\n=== INPUT FIELDS: ${inputs} ===`)

    } finally {
      await context.close()
    }
  })

  test("2. Sidepanel first-run experience", async () => {
    const { context, openSidepanel } = await launchWithExtension(TEST_EXT_PATH)

    try {
      const sidepanel = await openSidepanel()
      await sidepanel.waitForLoadState("networkidle")
      await sidepanel.waitForTimeout(2000)

      await sidepanel.screenshot({
        path: "test-results/ux-walkthrough/02-first-run-sidepanel.png",
        fullPage: true
      })

      const bodyText = await sidepanel.locator("body").innerText()
      console.log("=== FIRST RUN SIDEPANEL ===")
      console.log(bodyText.substring(0, 2000))

      const buttons = await sidepanel.locator("button").allTextContents()
      console.log("\n=== SIDEPANEL BUTTONS ===")
      console.log(buttons.filter(b => b.trim()).join(", "))

    } finally {
      await context.close()
    }
  })

  test("3. Options page with server configured", async () => {
    const { context, page, optionsUrl } = await launchWithExtension(TEST_EXT_PATH, {
      seedConfig: {
        serverUrl: SERVER_URL,
        authMode: "single-user",
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(2000)

      await page.screenshot({
        path: "test-results/ux-walkthrough/03-options-configured.png",
        fullPage: true
      })

      const bodyText = await page.locator("body").innerText()
      console.log("=== OPTIONS PAGE (CONFIGURED) ===")
      console.log(bodyText.substring(0, 3000))

    } finally {
      await context.close()
    }
  })

  test("4. Sidepanel with server configured", async () => {
    const { context, openSidepanel } = await launchWithExtension(TEST_EXT_PATH, {
      seedConfig: {
        serverUrl: SERVER_URL,
        authMode: "single-user",
        apiKey: API_KEY
      }
    })

    try {
      const sidepanel = await openSidepanel()
      await sidepanel.waitForLoadState("networkidle")
      await sidepanel.waitForTimeout(2000)

      await sidepanel.screenshot({
        path: "test-results/ux-walkthrough/04-sidepanel-configured.png",
        fullPage: true
      })

      const bodyText = await sidepanel.locator("body").innerText()
      console.log("=== SIDEPANEL (CONFIGURED) ===")
      console.log(bodyText.substring(0, 2000))

      // Check if chat input exists
      const textareas = await sidepanel.locator("textarea").count()
      const inputs = await sidepanel.locator("input[type='text']").count()
      console.log(`\n=== CHAT INPUTS: textareas=${textareas}, text inputs=${inputs} ===`)

    } finally {
      await context.close()
    }
  })

  test("5. Navigate through main sections", async () => {
    const { context, page, optionsUrl } = await launchWithExtension(TEST_EXT_PATH, {
      seedConfig: {
        serverUrl: SERVER_URL,
        authMode: "single-user",
        apiKey: API_KEY
      }
    })

    try {
      // Check each main route
      const routes = [
        { hash: "", name: "home" },
        { hash: "#/media", name: "media" },
        { hash: "#/notes", name: "notes" },
        { hash: "#/review", name: "review" },
        { hash: "#/flashcards", name: "flashcards" },
        { hash: "#/settings", name: "settings" }
      ]

      for (const route of routes) {
        await page.goto(optionsUrl + route.hash)
        await page.waitForLoadState("networkidle")
        await page.waitForTimeout(1000)

        await page.screenshot({
          path: `test-results/ux-walkthrough/05-route-${route.name}.png`,
          fullPage: true
        })

        const bodyText = await page.locator("body").innerText()
        console.log(`\n=== ROUTE: ${route.name} ===`)
        console.log(bodyText.substring(0, 1500))
      }

    } finally {
      await context.close()
    }
  })

  test("6. Settings sub-pages", async () => {
    const { context, page, optionsUrl } = await launchWithExtension(TEST_EXT_PATH, {
      seedConfig: {
        serverUrl: SERVER_URL,
        authMode: "single-user",
        apiKey: API_KEY
      }
    })

    try {
      await page.goto(optionsUrl + "#/settings")
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(1000)

      // Find all links in the settings nav
      const navLinks = await page.locator("nav a, aside a, [role='navigation'] a").allTextContents()
      console.log("=== SETTINGS NAV LINKS ===")
      console.log(navLinks.filter(l => l.trim()).join("\n"))

      await page.screenshot({
        path: "test-results/ux-walkthrough/06-settings-main.png",
        fullPage: true
      })

    } finally {
      await context.close()
    }
  })

  test("7. Error state - unreachable server", async () => {
    const { context, page, optionsUrl, openSidepanel } = await launchWithExtension(TEST_EXT_PATH, {
      seedConfig: {
        serverUrl: "http://localhost:9999",
        authMode: "single-user",
        apiKey: "fake-key"
      }
    })

    try {
      await page.goto(optionsUrl)
      await page.waitForLoadState("networkidle")
      await page.waitForTimeout(3000)

      await page.screenshot({
        path: "test-results/ux-walkthrough/07-error-options.png",
        fullPage: true
      })

      const bodyText = await page.locator("body").innerText()
      console.log("=== ERROR STATE - OPTIONS ===")
      console.log(bodyText.substring(0, 2000))

      // Also check sidepanel error state
      const sidepanel = await openSidepanel()
      await sidepanel.waitForLoadState("networkidle")
      await sidepanel.waitForTimeout(2000)

      await sidepanel.screenshot({
        path: "test-results/ux-walkthrough/07-error-sidepanel.png",
        fullPage: true
      })

      const spText = await sidepanel.locator("body").innerText()
      console.log("\n=== ERROR STATE - SIDEPANEL ===")
      console.log(spText.substring(0, 1500))

    } finally {
      await context.close()
    }
  })

})
