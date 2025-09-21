import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    trace: 'on-first-retry',
    headless: !!process.env.CI,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        headless: !!process.env.CI
      }
    }
  ],
  // Ensure we build the extension before the test run when CI invokes `playwright test`
  // Locally, prefer: `bun run build` (or `npm run build`) first for faster dev feedback
  globalSetup: path.resolve(__dirname, 'tests/e2e/setup/build-extension.ts'),
})
