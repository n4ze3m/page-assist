import { test } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'

const EXT_PATH = path.resolve('build/chrome-mv3')

async function dumpSidepanelState(label: string, page: any) {
  const info = await page.evaluate((innerLabel) => {
    const root = document.getElementById('root')
    return {
      label: innerLabel,
      href: window.location.href,
      readyState: document.readyState,
      hasRoot: !!root,
      rootChildren: root ? root.children.length : 0,
      bodySnippet: document.body.innerHTML.slice(0, 400)
    }
  }, label)
  // eslint-disable-next-line no-console
  console.log('[sidepanel-debug]', JSON.stringify(info, null, 2))
}

test.describe('Sidepanel render debug', () => {
  test('first open vs reload vs reopen', async () => {
    const { context, openSidepanel } = (await launchWithExtension(EXT_PATH)) as any

    // First open
    const page1 = await openSidepanel()
    await page1.waitForLoadState('domcontentloaded')
    await dumpSidepanelState('first-open', page1)

    // Soft reload inside the same tab
    await page1.reload()
    await page1.waitForLoadState('domcontentloaded')
    await dumpSidepanelState('after-reload', page1)

    // Close and reopen a fresh sidepanel tab
    await page1.close()
    const page2 = await openSidepanel()
    await page2.waitForLoadState('domcontentloaded')
    await dumpSidepanelState('reopen', page2)

    await context.close()
  })
})
