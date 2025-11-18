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
  let nextNoteId = 2
  let notes: any[] = [
    { id: 1, title: 'Test note', content: 'Note body', updated_at: new Date().toISOString(), metadata: { keywords: ['test'] } }
  ]
  let prompts: any[] = [{ id: 'p1', title: 'Prompt', content: 'Do something' }]
  let worldBooks: any[] = [
    { id: 1, name: 'WB', description: 'World book', enabled: true, entry_count: 0 }
  ]
  let worldBookEntries: Record<number, any[]> = { 1: [] }

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

    // Notes: search, CRUD
    if (url.startsWith('/api/v1/notes/search/') && method === 'GET') {
      return json(200, notes)
    }
    if (url === '/api/v1/notes/search/' && method === 'POST') {
      return json(200, notes)
    }
    if (url === '/api/v1/notes/' && method === 'GET') {
      return json(200, notes)
    }
    if (url === '/api/v1/notes/' && method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const parsed = body ? JSON.parse(body) : {}
        const created = {
          id: nextNoteId++,
          title: parsed.title || 'New note',
          content: parsed.content || '',
          updated_at: new Date().toISOString(),
          metadata: parsed.metadata || {}
        }
        notes.push(created)
        json(200, created)
      })
      return
    }
    if (url.startsWith('/api/v1/notes/') && method === 'GET') {
      const idStr = url.split('/').pop() || ''
      const id = Number(idStr)
      const note = notes.find((n) => n.id === id)
      return json(200, note || notes[0])
    }
    if (url.startsWith('/api/v1/notes/') && (method === 'PUT' || method === 'DELETE')) {
      return json(200, { ok: true })
    }

    // Prompts: list + search
    if (url === '/api/v1/prompts/' && method === 'GET') {
      return json(200, { items: prompts })
    }
    if (url === '/api/v1/prompts/search' && method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => json(200, { items: prompts }))
      return
    }
    if (url === '/api/v1/prompts/' && method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const parsed = body ? JSON.parse(body) : {}
        const created = { id: 'p2', title: parsed.title || 'New prompt', content: parsed.content || '' }
        prompts.push(created)
        json(200, created)
      })
      return
    }
    if (url.startsWith('/api/v1/prompts/') && method === 'PUT') {
      return json(200, { ok: true })
    }

    // World books
    if (url === '/api/v1/characters/world-books' && method === 'GET') {
      return json(200, { world_books: worldBooks })
    }
    if (url === '/api/v1/characters/world-books' && method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const parsed = body ? JSON.parse(body) : {}
        const id = worldBooks.length + 1
        const wb = { id, name: parsed.name || `WB-${id}`, description: parsed.description || '', enabled: !!parsed.enabled, entry_count: 0 }
        worldBooks.push(wb)
        worldBookEntries[id] = []
        json(200, wb)
      })
      return
    }
    if (url.startsWith('/api/v1/characters/world-books/') && url.endsWith('/entries') && method === 'GET') {
      const parts = url.split('/')
      const id = Number(parts[4])
      return json(200, { entries: worldBookEntries[id] || [] })
    }
    if (url.startsWith('/api/v1/characters/world-books/') && url.endsWith('/entries') && method === 'POST') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const parsed = body ? JSON.parse(body) : {}
        const parts = url.split('/')
        const id = Number(parts[4])
        const entries = worldBookEntries[id] || (worldBookEntries[id] = [])
        const entry = { entry_id: entries.length + 1, keywords: (parsed.keywords || '').split(',').map((s: string) => s.trim()).filter(Boolean), content: parsed.content || '', enabled: !!parsed.enabled }
        entries.push(entry)
        json(200, entry)
      })
      return
    }
    if (url === '/api/v1/characters/world-books/import' && method === 'POST') {
      return json(200, { imported: true })
    }
    if (url.startsWith('/api/v1/characters/world-books/') && url.endsWith('/statistics') && method === 'GET') {
      const parts = url.split('/')
      const id = Number(parts[4])
      const entries = worldBookEntries[id] || []
      return json(200, {
        world_book_id: id,
        name: worldBooks.find((w) => w.id === id)?.name || 'WB',
        total_entries: entries.length,
        enabled_entries: entries.filter((e) => e.enabled).length,
        disabled_entries: entries.filter((e) => !e.enabled).length,
        total_keywords: entries.reduce((acc, e) => acc + (e.keywords || []).length, 0),
        regex_entries: 0,
        case_sensitive_entries: 0,
        average_priority: 0,
        total_content_length: entries.reduce((acc, e) => acc + String(e.content || '').length, 0),
        estimated_tokens: 0
      })
    }

    if (url === '/api/v1/characters/' && method === 'GET') {
      return json(200, [])
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

    // World books: open the manager and confirm it loads the mock list.
    await page.goto(page.url().replace(/#.*$/, '') + '#/settings/world-books')
    await expect(page.getByText(/World book/i)).toBeVisible({ timeout: 10_000 })

    // Call tldwClient endpoints directly inside the extension to exercise
    // server-side Notes, Prompts, and World Books APIs.
    const apiResults = await page.evaluate(async () => {
      const { tldwClient } = await import('@/services/tldw/TldwApiClient')
      await tldwClient.initialize()

      // Notes: search + create
      const notes = await tldwClient.searchNotes('Test')
      const createdNote = await tldwClient.createNote('Created from test', { keywords: ['e2e'] })
      const notesAfter = await tldwClient.searchNotes('Created')

      // Prompts: search
      const prompts = await tldwClient.searchPrompts('Prompt')

      // World books: list + create + entries + stats
      const wbList = await tldwClient.listWorldBooks(false)

      const firstWbId = (wbList as any)?.world_books?.[0]?.id ?? 1
      const stats = await tldwClient.worldBookStatistics(firstWbId)

      const createdWb = await tldwClient.createWorldBook({ name: 'WB-from-test', description: 'From e2e' })
      await tldwClient.addWorldBookEntry(createdWb.id, { keywords: 'e2e', content: 'entry from test', enabled: true })
      const entries = await tldwClient.listWorldBookEntries(createdWb.id, false)

      return {
        notesCount: Array.isArray(notes) ? notes.length : 0,
        notesAfterCount: Array.isArray(notesAfter) ? notesAfter.length : 0,
        createdNoteId: createdNote?.id ?? null,
        promptsCount: Array.isArray(prompts?.items || prompts) ? (prompts.items || prompts).length : 0,
        worldBooksCount: Array.isArray((wbList as any)?.world_books) ? (wbList as any).world_books.length : 0,
        statsName: stats?.name,
        createdWorldBookId: createdWb?.id ?? null,
        createdWorldBookEntries: Array.isArray(entries) ? entries.length : 0
      }
    })

    expect(apiResults.notesCount).toBeGreaterThan(0)
    expect(apiResults.notesAfterCount).toBeGreaterThan(0)
    expect(apiResults.createdNoteId).toBeTruthy()
    expect(apiResults.promptsCount).toBeGreaterThan(0)
    expect(apiResults.worldBooksCount).toBeGreaterThan(0)
    expect(apiResults.statsName).toBeTruthy()
    expect(apiResults.createdWorldBookId).toBeTruthy()
    expect(apiResults.createdWorldBookEntries).toBeGreaterThan(0)

    await context.close()
    await new Promise<void>((r) => srv.close(() => r()))
  })
})
