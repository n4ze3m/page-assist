import { test, expect } from '@playwright/test'
import http from 'node:http'
import { AddressInfo } from 'node:net'
import { launchWithBuiltExtension } from './utils/extension-build'

function startMediaMockServer() {
  const items = [
    { id: 1, title: 'Demo recording', snippet: 'Transcript', type: 'video' },
    { id: 2, title: 'Demo doc', snippet: 'PDF content', type: 'document' }
  ]
  const details: Record<number, any> = {
    1: { id: 1, title: 'Demo recording', type: 'video', content: 'Transcript body' },
    2: { id: 2, title: 'Demo doc', type: 'document', content: 'Document body' }
  }

  const server = http.createServer((req, res) => {
    const url = req.url || ''
    const method = (req.method || 'GET').toUpperCase()

    const writeJson = (code: number, body: any) => {
      res.writeHead(code, {
        'content-type': 'application/json',
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true'
      })
      res.end(JSON.stringify(body))
    }

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type, x-api-key, authorization'
      })
      return res.end()
    }

    if (url === '/api/v1/health' && method === 'GET') {
      return writeJson(200, { status: 'ok' })
    }

    if (url === '/api/v1/llm/models' && method === 'GET') {
      return writeJson(200, ['mock/model'])
    }

    if (url.startsWith('/api/v1/media/') && method === 'GET') {
      const idStr = url.split('/').filter(Boolean).pop() || ''
      const id = Number(idStr)
      const d = details[id]
      if (d) return writeJson(200, d)
      return writeJson(404, { detail: 'not found' })
    }

    if (url.startsWith('/api/v1/media/search') && method === 'POST') {
      return writeJson(200, { items })
    }

    if (url.startsWith('/api/v1/media/') && method === 'GET') {
      return writeJson(200, { items })
    }

    if (url.startsWith('/api/v1/media') && method === 'GET') {
      return writeJson(200, { items })
    }

    if (url === '/openapi.json' && method === 'GET') {
      return writeJson(200, {
        openapi: '3.0.0',
        paths: {
          '/api/v1/media/': {},
          '/api/v1/media/search': {},
          '/api/v1/health': {},
          '/api/v1/llm/models': {}
        }
      })
    }

    writeJson(404, { detail: 'not found' })
  })

  return server
}

test.describe('Review page UX', () => {
  test('shows helpful offline empty state', async () => {
    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      allowOffline: false
    })

    await page.goto(optionsUrl + '#/review')
    await page.waitForLoadState('networkidle')

    // Offline/unauthenticated: show the inline connect prompt.
    const headline = page.getByText(/Connect to use Media|Connect to use Review/i)
    await expect(headline).toBeVisible()

    const connectCta = page.getByRole('button', { name: /Connect to server/i })
    await expect(connectCta).toBeVisible()

    await context.close()
  })

  test('exposes core search and a11y affordances when connected', async () => {
    const server = startMediaMockServer()
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve)
    )
    const addr = server.address() as AddressInfo
    const baseUrl = `http://127.0.0.1:${addr.port}`

    const { context, page, optionsUrl } = await launchWithBuiltExtension({
      allowOffline: true,
      seedConfig: {
        serverUrl: baseUrl,
        authMode: 'single-user',
        apiKey: 'test-key'
      }
    })

    // Seed the connection store so useServerOnline() reports "online"
    await page.goto(optionsUrl)
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => {
      const store = (window as any).__tldw_useConnectionStore
      if (!store) return
      const prev = store.getState()
      // Disable active network checks for this test run
      store.setState({
        ...prev,
        checkOnce: async () => {}
      })
      store.setState({
        ...store.getState(),
        state: {
          ...store.getState().state,
          isConnected: true
        }
      })
    })

    await page.goto(optionsUrl + '#/review')
    await page.waitForLoadState('networkidle')

    // Left column: search input and Filters toggle
    const searchInput = page.getByPlaceholder(/Search media \(title\/content\)|Search media, notes/i)
    await expect(searchInput).toBeVisible()

    // Result types and generation mode labels should be present
    await expect(page.getByText('Types', { exact: true })).toBeVisible()
    await expect(page.getByText('Keywords', { exact: true })).toBeVisible()

    // Results header shows a count string like "0 items"
    await expect(page.getByText(/results$/i)).toBeVisible()

    await context.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})
