import http from 'node:http'
import { AddressInfo } from 'node:net'

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void

type MockDeck = {
  id: number
  name: string
  description?: string | null
  deleted: boolean
  client_id: string
  version: number
  created_at?: string | null
  last_modified?: string | null
}

type MockFlashcard = {
  uuid: string
  deck_id?: number | null
  front: string
  back: string
  notes?: string | null
  extra?: string | null
  is_cloze: boolean
  tags?: string[] | null
  ef: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at?: string | null
  last_reviewed_at?: string | null
  last_modified?: string | null
  deleted: boolean
  client_id: string
  version: number
  model_type: 'basic' | 'basic_reverse' | 'cloze'
  reverse: boolean
}

type MockCharacter = {
  id: string
  name: string
  description?: string | null
  avatar_url?: string | null
  tags?: string[] | null
  system_prompt?: string | null
  greeting?: string | null
  deleted?: boolean
  version: number
}

export class MockTldwServer {
  private server: http.Server
  public url!: string
  private apiKey = 'test-valid-key'

  // Minimal in-memory flashcards/decks for UX tests
  private decks: MockDeck[] = []
  private cards: MockFlashcard[] = []
  private characters: MockCharacter[] = []
  private nextDeckId = 1
  private nextCharacterId = 1

  constructor(private handlers?: Partial<Record<string, Handler>>) {
    this.server = http.createServer(this.route.bind(this))
  }

  async start(port = 0) {
    await new Promise<void>((resolve) =>
      this.server.listen(port, '127.0.0.1', resolve)
    )
    const addr = this.server.address() as AddressInfo
    this.url = `http://127.0.0.1:${addr.port}`
  }

  async stop() {
    await new Promise<void>((resolve) => this.server.close(() => resolve()))
  }

  setApiKey(key: string) {
    this.apiKey = key
  }

  private unauthorized(res: http.ServerResponse, msg = 'Invalid X-API-KEY') {
    res.writeHead(401, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true'
    })
    res.end(JSON.stringify({ detail: msg }))
  }

  private ok(
    res: http.ServerResponse,
    body: any,
    headers: Record<string, string> = {}
  ) {
    res.writeHead(200, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      ...headers
    })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  }

  private sse(
    res: http.ServerResponse,
    lines: string[],
    { tokenDelayMs = 100, heartbeatMs = 2000 } = {}
  ) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })

    let closed = false
    res.on('close', () => {
      closed = true
    })

    // Proper SSE framing: each event block ends with an empty line
    const writeBlock = (block: string[]) => {
      for (const l of block) res.write(l + '\n')
      res.write('\n')
    }

    // Heartbeat comments
    const heartbeat = setInterval(() => {
      if (closed) return
      res.write(`: ping\n\n`)
    }, heartbeatMs)

    // Send initial event
    writeBlock([
      'event: stream_start',
      `data: ${JSON.stringify({
        conversation_id: 'conv',
        model: 'openai/gpt-4.1-2025-04-14',
        timestamp: new Date().toISOString()
      })}`
    ])

    // Send tokens with delay
    const sendTokens = async () => {
      for (const l of lines) {
        if (closed) break
        writeBlock([`data: ${l}`])
        await new Promise((r) => setTimeout(r, tokenDelayMs))
      }
      if (!closed) writeBlock(['data: [DONE]'])
      clearInterval(heartbeat)
      if (!closed) res.end()
    }
    // Fire and forget
    void sendTokens()
  }

  private route(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = req.url || ''
    const urlObj = new URL(url, 'http://127.0.0.1')
    const pathname = urlObj.pathname
    const method = (req.method || 'GET').toUpperCase()

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers':
          'content-type, x-api-key, authorization'
      })
      return res.end()
    }

    // Custom handlers override
    if (this.handlers && this.handlers[url]) return this.handlers[url]!(req, res)

    const requireApiKey = () => {
      const key = String(req.headers['x-api-key'] || '')
      if (key !== this.apiKey) {
        this.unauthorized(res)
        return false
      }
      return true
    }

    const defaultOpenApi = () => {
      this.ok(res, {
        openapi: '3.0.0',
        info: { version: 'test' },
        paths: {
          '/api/v1/health': { get: {} },
          '/api/v1/characters': { get: {}, post: {} },
          '/api/v1/characters/': { get: {}, post: {} },
          '/api/v1/flashcards': { get: {}, post: {} },
          '/api/v1/flashcards/': { get: {}, post: {} },
          '/api/v1/flashcards/decks': { get: {}, post: {} },
          '/api/v1/llm/models': { get: {} }
        }
      })
    }

    const readJsonBody = (cb: (body: any) => void) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        let parsed: any = {}
        try {
          parsed = body ? JSON.parse(body) : {}
        } catch {
          parsed = {}
        }
        cb(parsed)
      })
    }

    const nowIso = () => new Date().toISOString()

    const listDecks = () => {
      const items = this.decks.filter((d) => !d.deleted)
      this.ok(res, items)
    }

    const listFlashcards = () => {
      let items = this.cards.filter((c) => !c.deleted)

      const deckIdRaw = urlObj.searchParams.get('deck_id')
      if (deckIdRaw != null) {
        const deckId = Number(deckIdRaw)
        if (!Number.isNaN(deckId)) {
          items = items.filter((c) => c.deck_id === deckId)
        }
      }

      const tag = urlObj.searchParams.get('tag')
      if (tag) {
        const needle = tag.toLowerCase()
        items = items.filter((c) =>
          (c.tags || []).some((t) => t.toLowerCase().includes(needle))
        )
      }

      const q = urlObj.searchParams.get('q')
      if (q) {
        const needle = q.toLowerCase()
        items = items.filter(
          (c) =>
            c.front.toLowerCase().includes(needle) ||
            c.back.toLowerCase().includes(needle) ||
            (c.notes || '').toLowerCase().includes(needle)
        )
      }

      const total = items.length
      const limit = Number(urlObj.searchParams.get('limit') || '50')
      const offset = Number(urlObj.searchParams.get('offset') || '0')
      const start = Math.max(0, offset)
      const end = Math.max(start, start + (Number.isNaN(limit) ? 50 : limit))
      const pageItems = items.slice(start, end)

      this.ok(res, { items: pageItems, count: total })
    }

    const getCardByUuid = (uuid: string) =>
      this.cards.find((c) => c.uuid === uuid && !c.deleted)

    const ensureDeck = (name: string): number => {
      const existing = this.decks.find(
        (d) => !d.deleted && d.name.toLowerCase() === name.toLowerCase()
      )
      if (existing) return existing.id
      const id = this.nextDeckId++
      const deck: MockDeck = {
        id,
        name,
        description: null,
        deleted: false,
        client_id: 'mock-client',
        version: 1,
        created_at: nowIso(),
        last_modified: nowIso()
      }
      this.decks.push(deck)
      return id
    }

    const newCardUuid = () =>
      `fc-${Date.now().toString(36)}-${Math.random()
        .toString(16)
        .slice(2)}`

    // Health is unauthenticated so connection checks can run before config
    if (pathname === '/api/v1/health') {
      return this.ok(res, { status: 'ok' })
    }

    if (pathname === '/openapi.json') {
      return defaultOpenApi()
    }

    // Models
    if (pathname === '/api/v1/llm/models') {
      if (!requireApiKey()) return
      return this.ok(res, [
        'openai/gpt-4.1-mini',
        'anthropic/claude-3.5-sonnet',
        'mistral/mistral-small'
      ])
    }

    // Chat completions (streaming)
    if (pathname === '/api/v1/chat/completions') {
      if (!requireApiKey()) return
      return this.sse(
        res,
        [
          JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
          JSON.stringify({ choices: [{ delta: { content: '!' } }] }),
          JSON.stringify({ choices: [{ delta: { content: ' How' } }] })
        ],
        { tokenDelayMs: 120, heartbeatMs: 1500 }
      )
    }

    // RAG search
    if (pathname === '/api/v1/rag/search') {
      if (!requireApiKey()) return
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () =>
        this.ok(res, {
          results: [{ content: 'doc', metadata: { url: 'http://example.com' } }]
        })
      )
      return
    }

    // Characters
    const isCharactersCollection =
      pathname === '/api/v1/characters' || pathname === '/api/v1/characters/'
    const isCharacterItem = pathname.startsWith('/api/v1/characters/')
    if (isCharactersCollection && method === 'GET') {
      if (!requireApiKey()) return
      const items = this.characters.filter((c) => !c.deleted)
      return this.ok(res, items)
    }
    if (isCharactersCollection && method === 'POST') {
      if (!requireApiKey()) return
      return readJsonBody((body) => {
        const now = nowIso()
        const id = `char-${this.nextCharacterId++}`
        const character: MockCharacter = {
          id,
          name: String(body?.name || `Character ${this.nextCharacterId}`),
          description: body?.description ?? null,
          avatar_url: body?.avatar_url ?? null,
          tags: Array.isArray(body?.tags)
            ? body.tags.map((t: any) => String(t))
            : [],
          system_prompt: body?.system_prompt ?? null,
          greeting: body?.greeting ?? null,
          version: 1,
          deleted: false
        }
        this.characters.push(character)
        this.ok(res, character, { location: `/api/v1/characters/${id}` })
      })
    }
    if (isCharacterItem) {
      if (!requireApiKey()) return
      const cid = pathname.replace('/api/v1/characters/', '').replace(/\/$/, '')
      const character = this.characters.find((c) => c.id === cid)
      if (!character || character.deleted) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      if (method === 'GET') {
        return this.ok(res, character)
      }
      if (method === 'PUT') {
        return readJsonBody((body) => {
          if ('name' in body) character.name = String(body.name)
          if ('description' in body) character.description = body.description ?? null
          if ('avatar_url' in body) character.avatar_url = body.avatar_url ?? null
          if ('tags' in body) {
            character.tags = Array.isArray(body.tags)
              ? body.tags.map((t: any) => String(t))
              : []
          }
          if ('system_prompt' in body) character.system_prompt = body.system_prompt ?? null
          if ('greeting' in body) character.greeting = body.greeting ?? null
          character.version += 1
          this.ok(res, character)
        })
      }
      if (method === 'DELETE') {
        character.deleted = true
        character.version += 1
        res.writeHead(204)
        res.end()
        return
      }
    }

    // Flashcards: decks
    if (pathname === '/api/v1/flashcards/decks' && method === 'GET') {
      if (!requireApiKey()) return
      return listDecks()
    }
    if (pathname === '/api/v1/flashcards/decks' && method === 'POST') {
      if (!requireApiKey()) return
      return readJsonBody((body) => {
        const name = String(body?.name || 'Deck')
        const id = this.nextDeckId++
        const now = nowIso()
        const deck: MockDeck = {
          id,
          name,
          description: body?.description ?? null,
          deleted: false,
          client_id: 'mock-client',
          version: 1,
          created_at: now,
          last_modified: now
        }
        this.decks.push(deck)
        this.ok(res, deck)
      })
    }

    // Flashcards: list + create
    if (
      (pathname === '/api/v1/flashcards' ||
        pathname === '/api/v1/flashcards/') &&
      method === 'GET'
    ) {
      if (!requireApiKey()) return
      return listFlashcards()
    }
    if (
      (pathname === '/api/v1/flashcards' ||
        pathname === '/api/v1/flashcards/') &&
      method === 'POST'
    ) {
      if (!requireApiKey()) return
      return readJsonBody((body) => {
        const uuid = newCardUuid()
        const deckId =
          typeof body?.deck_id === 'number'
            ? body.deck_id
            : body?.deck
            ? ensureDeck(String(body.deck))
            : undefined
        const now = nowIso()
        const card: MockFlashcard = {
          uuid,
          deck_id: deckId ?? null,
          front: String(body?.front || ''),
          back: String(body?.back || ''),
          notes: body?.notes ?? null,
          extra: body?.extra ?? null,
          is_cloze: Boolean(body?.is_cloze),
          tags: Array.isArray(body?.tags)
            ? body.tags.map((t: any) => String(t))
            : null,
          ef: 2.5,
          interval_days: 0,
          repetitions: 0,
          lapses: 0,
          due_at: now,
          last_reviewed_at: null,
          last_modified: now,
          deleted: false,
          client_id: 'mock-client',
          version: 1,
          model_type:
            body?.model_type === 'basic_reverse' || body?.model_type === 'cloze'
              ? body.model_type
              : 'basic',
          reverse: Boolean(body?.reverse)
        }
        this.cards.push(card)
        this.ok(res, card)
      })
    }

    // Flashcards: individual card CRUD
    if (
      pathname.startsWith('/api/v1/flashcards/') &&
      !pathname.endsWith('/review')
    ) {
      if (!requireApiKey()) return
      const uuid = decodeURIComponent(pathname.split('/').pop() || '')
      const card = getCardByUuid(uuid)
      if (!card) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      if (method === 'GET') {
        return this.ok(res, card)
      }
      if (method === 'PATCH') {
        return readJsonBody((body) => {
          if (body.front !== undefined) card.front = String(body.front)
          if (body.back !== undefined) card.back = String(body.back)
          if ('notes' in body) card.notes = body.notes ?? null
          if ('extra' in body) card.extra = body.extra ?? null
          if ('is_cloze' in body) card.is_cloze = Boolean(body.is_cloze)
          if ('tags' in body) {
            card.tags = Array.isArray(body.tags)
              ? body.tags.map((t: any) => String(t))
              : null
          }
          if ('deck_id' in body) {
            card.deck_id =
              body.deck_id == null ? null : Number(body.deck_id) || null
          }
          if ('model_type' in body) {
            const mt = body.model_type
            if (mt === 'basic' || mt === 'basic_reverse' || mt === 'cloze') {
              card.model_type = mt
            }
          }
          if ('reverse' in body) card.reverse = Boolean(body.reverse)
          card.version += 1
          card.last_modified = nowIso()
          res.writeHead(204)
          res.end()
        })
      }
      if (method === 'DELETE') {
        card.deleted = true
        card.last_modified = nowIso()
        res.writeHead(204)
        res.end()
        return
      }
    }

    // Flashcards: review endpoint
    if (pathname === '/api/v1/flashcards/review' && method === 'POST') {
      if (!requireApiKey()) return
      return readJsonBody((body) => {
        const uuid = String(body?.card_uuid || '')
        const rating = Number(body?.rating || 0)
        const card = getCardByUuid(uuid)
        if (!card) {
          res.writeHead(404)
          res.end('not found')
          return
        }

        const clamped = Math.max(
          0,
          Math.min(5, Number.isFinite(rating) ? rating : 0)
        )
        card.repetitions += 1
        if (clamped <= 1) {
          card.lapses += 1
          card.interval_days = 1
        } else {
          card.interval_days = Math.max(1, card.interval_days + clamped)
        }
        card.ef = Math.max(1.3, card.ef + (clamped - 3) * 0.05)
        const nextDue = new Date()
        nextDue.setDate(nextDue.getDate() + card.interval_days)
        card.due_at = nextDue.toISOString()
        card.last_reviewed_at = nowIso()
        card.last_modified = card.last_reviewed_at
        card.version += 1

        this.ok(res, {
          uuid: card.uuid,
          ef: card.ef,
          interval_days: card.interval_days,
          repetitions: card.repetitions,
          lapses: card.lapses,
          due_at: card.due_at,
          last_reviewed_at: card.last_reviewed_at,
          last_modified: card.last_modified,
          version: card.version
        })
      })
    }

    // Minimal import limits endpoint used by ImportPanel
    if (
      pathname === '/api/v1/config/flashcards-import-limits' &&
      method === 'GET'
    ) {
      if (!requireApiKey()) return
      return this.ok(res, {
        max_lines: 1000,
        max_line_length: 4096,
        max_field_length: 2048
      })
    }

    res.writeHead(404)
    res.end('not found')
  }
}
