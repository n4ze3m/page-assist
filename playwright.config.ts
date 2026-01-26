import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "test/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    headless: true, // Set to true for CI
    viewport: { width: 1280, height: 800 }
  },
  webServer: undefined, // No web server for extension
  outputDir: "test-results"
})
