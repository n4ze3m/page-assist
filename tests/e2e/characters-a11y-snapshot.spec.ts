import { test } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

import { launchWithBuiltExtension } from "./utils/extension-build"
import { grantHostPermission } from "./utils/permissions"
import { requireRealServerConfig } from "./utils/real-server"

const seedConfig = (page: any, serverUrl: string, apiKey: string) =>
  page.evaluate(
    (cfg) =>
      new Promise<void>((resolve) => {
        // @ts-ignore
        chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
      }),
    { serverUrl, authMode: "single-user", apiKey }
  )

test.describe('Characters workspace snapshots', () => {
  test('capture a11y tree and full-page screenshot', async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const { context, page, extensionId, optionsUrl } =
      await launchWithBuiltExtension()

    const consoleMessages: string[] = []
    page.on('console', (msg) => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`)
    })

    const granted = await grantHostPermission(
      context,
      extensionId,
      new URL(serverUrl).origin + "/*"
    )
    if (!granted) {
      test.skip(
        true,
        "Host permission not granted for tldw_server origin"
      )
    }

    await page.goto(optionsUrl)
    await seedConfig(page, serverUrl, apiKey)

    await page.goto(`${optionsUrl}#/characters`)

    // Wait for the empty state to ensure UI is ready
    await page
      .getByRole('heading', { name: /No characters yet/i })
      .waitFor({ timeout: 15000 })

    const snapshot = await page.accessibility.snapshot()

    const artifactsDir = path.resolve('playwright-mcp-artifacts')
    fs.mkdirSync(artifactsDir, { recursive: true })

    fs.writeFileSync(
      path.join(artifactsDir, 'characters-a11y.json'),
      JSON.stringify(snapshot, null, 2),
      'utf8'
    )

    fs.writeFileSync(
      path.join(artifactsDir, 'characters-console.txt'),
      consoleMessages.join('\n'),
      'utf8'
    )

    await page.screenshot({
      path: path.join(artifactsDir, 'characters-page.png'),
      fullPage: true
    })

    await context.close()
  })
})
