import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import {
  waitForConnectionStore,
  forceConnected
} from './utils/connection'

test.describe('Queued messages banners', () => {
  test('Playground shows queued banner when connected with queued messages', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Force connection store into a connected state and seed a queued message
    await waitForConnectionStore(page, 'queued-playground-banner')
    await forceConnected(page, {}, 'queued-playground-banner')
    await page.evaluate(() => {
      const msgStore: any = (window as any).__tldw_useStoreMessageOption
      if (!msgStore) return
      const prevQueued = msgStore.getState().queuedMessages || []
      msgStore.setState({
        queuedMessages: [
          ...prevQueued,
          { message: 'Queued from test', image: '' }
        ]
      })
    })

    // The green queued banner should appear near the Playground composer
    await expect(
      page.getByText(/Queued while offline/i)
    ).toBeVisible({ timeout: 10_000 })
    await expect(
      page.getByRole('button', { name: /Send queued messages/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Clear queue/i })
    ).toBeVisible()

    // Diagnostics link provides a clear fix path
    const diagnosticsLink = page.getByRole('link', {
      name: /Health & diagnostics/i
    })
    await expect(diagnosticsLink).toBeVisible()
    await diagnosticsLink.click()
    await expect(page).toHaveURL(/options\.html#\/settings\/health/i)

    await context.close()
  })

  test('Playground Clear queue empties queue without sending messages', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Force connection store into a connected state and seed a queued message
    await waitForConnectionStore(page, 'queued-playground-clear')
    await forceConnected(page, {}, 'queued-playground-clear')
    await page.evaluate(() => {
      const msgStore: any = (window as any).__tldw_useStoreMessageOption
      if (!msgStore) return
      msgStore.setState({
        messages: [],
        queuedMessages: [{ message: 'Queued from test', image: '' }]
      })
    })

    // The queued banner should appear near the Playground composer
    await expect(
      page.getByText(/Queued while offline/i)
    ).toBeVisible({ timeout: 10_000 })

    // Click Clear queue and ensure the queue is empty and no messages were sent
    await page.getByRole('button', { name: /Clear queue/i }).click()
    await page.waitForTimeout(500)

    const state = await page.evaluate(() => {
      const msgStore: any = (window as any).__tldw_useStoreMessageOption
      if (!msgStore) return { queuedLen: -1, msgLen: -1 }
      const s = msgStore.getState()
      return {
        queuedLen: (s.queuedMessages || []).length,
        msgLen: (s.messages || []).length
      }
    })

    expect(state.queuedLen).toBe(0)
    expect(state.msgLen).toBe(0)

    await context.close()
  })

  test('Sidepanel shows queued banner and clears queue when sending', async () => {
    const extPath = path.resolve('.output/chrome-mv3')
    const { context, openSidepanel } = await launchWithExtension(extPath) as any
    const page = await openSidepanel()

    // Seed connection + queued messages via exposed stores
    await waitForConnectionStore(page, 'queued-sidepanel')
    await forceConnected(page, {}, 'queued-sidepanel')
    await page.evaluate(() => {
      const msgStore: any = (window as any).__tldw_useStoreMessageOption
      if (!msgStore) return
      msgStore.setState({
        queuedMessages: [{ message: 'Queued from sidepanel', image: '' }]
      })
    })

    // Queued banner should appear in the sidepanel composer
    await expect(
      page.getByText(/Queued while offline/i)
    ).toBeVisible({ timeout: 10_000 })
    const sendQueued = page.getByRole('button', { name: /Send queued messages/i })
    await expect(sendQueued).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Health & diagnostics/i })
    ).toBeVisible()

    // Click Send queued messages and ensure the queue is cleared
    await sendQueued.click()
    await page.waitForTimeout(500)
    const remaining = await page.evaluate(() => {
      const msgStore: any = (window as any).__tldw_useStoreMessageOption
      if (!msgStore) return -1
      return (msgStore.getState().queuedMessages || []).length
    })
    expect(remaining).toBe(0)

    await context.close()
  })
})
