import { test, expect } from "@playwright/test"
import path from "path"
import { launchWithExtension } from "./utils/extension"
import { requireRealServerConfig } from "./utils/real-server"

test.describe('API smoke test for notes, prompts, and world-books', () => {
  test('hits notes search, prompts search, and world-books endpoints without path errors', async () => {
    const { serverUrl, apiKey } = requireRealServerConfig(test)

    const extPath = path.resolve('build/chrome-mv3')
    const { context, page } = await launchWithExtension(extPath, {
      seedConfig: {
        serverUrl,
        authMode: 'single-user',
        apiKey
      }
    })

    // Allow offline bypass so connection store reports connected instantly.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          // @ts-ignore
          chrome.storage.local.set({ __tldw_allow_offline: true }, () => resolve())
        })
    )
    await page.reload()

    // Quick UI navigation smoke: hit Notes and World Books routes (no strict UI assertions needed here).
    await page.goto(page.url().replace(/#.*$/, '') + '#/notes')
    await page.waitForLoadState('networkidle')
    await page.goto(page.url().replace(/#.*$/, '') + '#/settings/world-books')
    await page.waitForLoadState('networkidle')

    // Call tldwClient endpoints directly inside the extension to exercise
    // server-side Notes, Prompts, and World Books APIs.
    const apiResults = await page.evaluate(async ({ baseUrl, apiKey }) => {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
      const getJson = async (path, opts = {}) =>
        fetch(`${baseUrl}${path}`, opts as any).then((r) => r.json())

      // Notes: search + create
      const notes = await getJson('/api/v1/notes/')
      const createdNote = await getJson('/api/v1/notes/', {
        method: 'POST',
        body: JSON.stringify({ title: 'Created from test', content: '', metadata: { keywords: ['e2e'] } }),
        headers
      })
      const notesAfter = await getJson('/api/v1/notes/search/', {
        method: 'POST',
        body: JSON.stringify({ query: 'Created' }),
        headers
      })

      // Prompts: search
      const prompts = await getJson('/api/v1/prompts/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'Prompt' }),
        headers
      })

      // World books: list + create + entries + stats
      const wbList = await getJson('/api/v1/characters/world-books')
      const firstWbId = (wbList as any)?.world_books?.[0]?.id ?? 1
      const stats = await getJson(`/api/v1/characters/world-books/${firstWbId}/statistics`)

      const createdWb = await getJson('/api/v1/characters/world-books', {
        method: 'POST',
        body: JSON.stringify({ name: 'WB-from-test', description: 'From e2e', enabled: true }),
        headers
      })
      await getJson(`/api/v1/characters/world-books/${createdWb.id}/entries`, {
        method: 'POST',
        body: JSON.stringify({ keywords: 'e2e', content: 'entry from test', enabled: true }),
        headers
      })
      const entries = await getJson(`/api/v1/characters/world-books/${createdWb.id}/entries`)

      return {
        createdNoteId: createdNote?.id ?? null,
        statsName: stats?.name,
        createdWorldBookId: createdWb?.id ?? null,
        createdWorldBookEntries: Array.isArray(entries?.entries || entries) ? (entries.entries || entries).length : 0
      }
    }, { baseUrl: serverUrl, apiKey })

    expect(apiResults.createdNoteId).toBeTruthy()
    expect(apiResults.statsName).toBeTruthy()
    expect(apiResults.createdWorldBookId).toBeTruthy()
    expect(apiResults.createdWorldBookEntries).toBeGreaterThan(0)

    await context.close()
  })
})
