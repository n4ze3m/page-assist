import { defineConfig, devices } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        headless: false
      }
    }
  ],
  // Ensure we build the extension before the test run when CI invokes `playwright test`
  // Locally, prefer: `bun run build` (or `npm run build`) first for faster dev feedback
  globalSetup: path.resolve(__dirname, 'tests/e2e/setup/build-extension.ts'),
})

