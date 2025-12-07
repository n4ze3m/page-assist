import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import http from 'node:http'
import { AddressInfo } from 'node:net'

function delayedServer(delayMs: number) {
  const server = http.createServer((req, res) => {
    const url = req.url || ''
    const method = (req.method || 'GET').toUpperCase()

    // Minimal CORS for tests
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type, x-api-key, authorization'
      })
      return res.end()
    }

    if (url.startsWith('/api/v1/health')) {
      res.writeHead(200, {
        'content-type': 'application/json',
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true'
      })
      return res.end('{"status":"ok"}')
    }
    if (url.startsWith('/api/v1/rag/search')) {
      setTimeout(() => {
        res.writeHead(200, {
          'content-type': 'application/json',
          'access-control-allow-origin': 'http://127.0.0.1',
          'access-control-allow-credentials': 'true'
        })
        res.end(JSON.stringify({ results: [] }))
      }, delayMs)
      return
    }
    res.writeHead(404)
    res.end('not found')
  })
  return server
}

function chatIdleServer() {
  const server = http.createServer((req, res) => {
    const url = req.url || ''
    const method = (req.method || 'GET').toUpperCase()

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type, x-api-key, authorization'
      })
      return res.end()
    }

    if (url === '/api/v1/health') {
      res.writeHead(200, {
        'content-type': 'application/json',
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true'
      })
      return res.end('{"status":"ok"}')
    }

    if (url === '/api/v1/llm/models') {
      res.writeHead(200, {
        'content-type': 'application/json',
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true'
      })
      return res.end(JSON.stringify(['openai/gpt-4.1-mini']))
    }

    if (url === '/api/v1/chat/completions') {
      // Simulate a streaming endpoint that never sends any body bytes,
      // so the background stream idle timeout fires.
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true'
      })
      // Intentionally do not write any SSE data; keep the connection open.
      return
    }

    res.writeHead(404)
    res.end('not found')
  })
  return server
}

test.describe('Timeouts', () => {
  test('RAG per-request timeout triggers error', async () => {
    const srv = delayedServer(20_000)
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
    const addr = srv.address() as AddressInfo
    const url = `http://127.0.0.1:${addr.port}`

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page, optionsUrl } = await launchWithExtension(extPath)
    await page.goto(optionsUrl + '#/settings/tldw', {
      waitUntil: 'domcontentloaded'
    })
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

  test('Chat stream idle timeout triggers assistant error', async () => {
    const srv = chatIdleServer()
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
    const addr = srv.address() as AddressInfo
    const url = `http://127.0.0.1:${addr.port}`

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed tldwConfig with a short chat stream idle timeout
    await page.evaluate(
      (cfg) =>
        new Promise<void>((resolve) => {
          // @ts-ignore
          chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
        }),
      {
        serverUrl: url,
        authMode: 'single-user',
        apiKey: 'any',
        // 2s idle timeout for chat streams
        chatStreamIdleTimeoutMs: 2000
      }
    )

    await page.reload()

    const input = page.getByPlaceholder('Type a message...')
    await input.fill('hello (should timeout)')
    await input.press('Enter')

    // Error from background stream idle handler should be rendered as a friendly assistant error bubble
    await expect(
      page.getByText(/Your chat timed out/i)
    ).toBeVisible({ timeout: 15_000 })

    const toggle = page.getByRole('button', {
      name: /show technical details/i
    })
    await toggle.click()
    await expect(
      page.getByText(/Stream timeout: no updates received/i)
    ).toBeVisible()

    await context.close()
    await new Promise<void>((r) => srv.close(() => r()))
  })
})
