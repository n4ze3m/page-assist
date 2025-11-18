import { test, expect } from '@playwright/test'
import path from 'path'
import { launchWithExtension } from './utils/extension'
import http from 'node:http'
import { AddressInfo } from 'node:net'

// Minimal mock server that supports a few key API endpoints used by
// Notes, Prompts, and World Books. This is a smoke test: it only
// verifies that the extension can successfully call these endpoints
// via the background proxy without path errors.
function apiSmokeServer() {
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

    const json = (code: number, body: any) => {
      res.writeHead(code, {
        'content-type': 'application/json',
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true'
      })
      res.end(JSON.stringify(body))
    }

    if (url === '/api/v1/health' && method === 'GET') {
      return json(200, { status: 'ok' })
    }

    if (url.startsWith('/api/v1/notes/search/') && method === 'GET') {
      return json(200, [
        { id: 1, title: 'Test note', content: 'Note body', updated_at: new Date().toISOString() }
      ])
    }

    if (url.startsWith('/api/v1/notes/') && method === 'GET') {
      return json(200, { id: 1, title: 'Test note', content: 'Note body', metadata: { keywords: ['test'] } })
    }

    if (url === '/api/v1/prompts/search' && method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => json(200, { items: [{ id: 'p1', title: 'Prompt', content: 'Do something' }] }))
      return
    }

    if (url === '/api/v1/characters/world-books' && method === 'GET') {
      return json(200, { world_books: [{ id: 1, name: 'WB', description: 'World book', enabled: true, entry_count: 0 }] })
    }

    if (url.startsWith('/api/v1/characters') && url.endsWith('/world-books') && method === 'GET') {
      return json(200, [])
    }

    if (url === '/api/v1/characters/' && method === 'GET') {
      return json(200, [])
    }

    // Generic OK for other POST/PUT/DELETE requests on our tested resources
    if (
      url.startsWith('/api/v1/notes/') ||
      url.startsWith('/api/v1/prompts') ||
      url.startsWith('/api/v1/characters/world-books')
    ) {
      return json(200, { ok: true })
    }

    res.writeHead(404)
    res.end('not found')
  })
  return server
}

test.describe('API smoke test for notes, prompts, and world-books', () => {
  test('hits notes search, prompts search, and world-books endpoints without path errors', async () => {
    const srv = apiSmokeServer()
    await new Promise<void>((r) => srv.listen(0, r))
    const addr = srv.address() as AddressInfo
    const url = `http://127.0.0.1:${addr.port}`

    const extPath = path.resolve('.output/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath)

    // Seed tldwConfig for the extension so bgRequest has a server URL.
    await page.evaluate(
      (cfg) =>
        new Promise<void>((resolve) => {
          // @ts-ignore
          chrome.storage.local.set({ tldwConfig: cfg }, () => resolve())
        }),
      {
        serverUrl: url,
        authMode: 'single-user',
        apiKey: 'any'
      }
    )

    await page.reload()

    // Notes search: navigate to Notes manager and wait for the mock note title.
    await page.goto(page.url().replace(/#.*$/, '') + '#/notes')
    await expect(page.getByText(/Test note/)).toBeVisible({ timeout: 10_000 })

    // Prompts search: navigate to Prompts page and trigger a search via UI.
    await page.goto(page.url().replace(/#.*$/, '') + '#/prompts')
    const searchInput = page.getByPlaceholder(/Search prompts/i)
    await searchInput.fill('Prompt')
    await searchInput.press('Enter')
    await expect(page.getByText(/Prompt/i)).toBeVisible({ timeout: 10_000 })

    // World books: open the manager and confirm it loads the mock list.
    await page.goto(page.url().replace(/#.*$/, '') + '#/settings/world-books')
    await expect(page.getByText(/World book/i)).toBeVisible({ timeout: 10_000 })

    await context.close()
    await new Promise<void>((r) => srv.close(() => r()))
  })
})

