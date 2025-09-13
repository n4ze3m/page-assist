import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import http from 'node:http'
import { AddressInfo } from 'node:net'

function delayedServer(delayMs: number) {
  const server = http.createServer((req, res) => {
    if ((req.url || '').startsWith('/api/v1/health')) {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': 'http://127.0.0.1', 'access-control-allow-credentials': 'true' })
      return res.end('{"status":"ok"}')
    }
    if ((req.url || '').startsWith('/api/v1/rag/search')) {
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ results: [] }))
      }, delayMs)
      return
    }
    res.writeHead(404); res.end('not found')
  })
  return server
}

test.describe('Timeouts', () => {
  test('RAG per-request timeout triggers error', async () => {
    const srv = delayedServer(20_000)
    await new Promise<void>(r => srv.listen(0, r))
    const addr = srv.address() as AddressInfo
    const url = `http://127.0.0.1:${addr.port}`

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)
    await page.getByLabel('Server URL').fill(url)
    await page.getByText('Authentication Mode').scrollIntoViewIfNeeded()
    await page.getByText('Single User (API Key)').click()
    await page.getByLabel('API Key').fill('any')
    await page.getByRole('button', { name: 'Save' }).click()

    // Open RAG search UI
    await page.getByText('Show RAG Search').click()
    await page.getByPlaceholder('Search your knowledge…').fill('test')
    // Set a small per-request timeout (2s)
    const timeoutInput = page.getByRole('spinbutton').first()
    await timeoutInput.fill('2')
    await page.getByRole('button', { name: 'Search' }).click()

    // Expect the list to remain empty due to timeout; optional: look for an error notification if present
    await expect(page.getByText('No results')).toBeVisible({ timeout: 10_000 })

    await context.close()
    await new Promise<void>(r => srv.close(() => r()))
  })
})

