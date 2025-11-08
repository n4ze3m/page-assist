import http from 'node:http'
import { AddressInfo } from 'node:net'

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void

export class MockTldwServer {
  private server: http.Server
  public url!: string
  private apiKey = 'test-valid-key'

  constructor(private handlers?: Partial<Record<string, Handler>>) {
    this.server = http.createServer(this.route.bind(this))
  }

  async start(port = 0) {
    await new Promise<void>((resolve) => this.server.listen(port, resolve))
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
    res.writeHead(401, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' })
    res.end(JSON.stringify({ detail: msg }))
  }

  private ok(res: http.ServerResponse, body: any, headers: Record<string, string> = {}) {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers })
    res.end(typeof body === 'string' ? body : JSON.stringify(body))
  }

  private sse(res: http.ServerResponse, lines: string[], { tokenDelayMs = 100, heartbeatMs = 2000 } = {}) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })

    let closed = false
    res.on('close', () => { closed = true })

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
      `data: ${JSON.stringify({ conversation_id: 'conv', model: 'openai/gpt-4.1-2025-04-14', timestamp: new Date().toISOString() })}`
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
    const method = (req.method || 'GET').toUpperCase()
    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': 'http://127.0.0.1',
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type, x-api-key, authorization'
      })
      return res.end()
    }

    // Custom handlers override
    if (this.handlers && this.handlers[url]) return this.handlers[url]!(req, res)

    if (url === '/api/v1/health') {
      return this.ok(res, { status: 'ok' })
    }
    if (url === '/api/v1/llm/models') {
      const key = String(req.headers['x-api-key'] || '')
      if (key !== this.apiKey) return this.unauthorized(res)
      return this.ok(res, ['openai/gpt-4.1-2025-04-14'])
    }
    if (url === '/api/v1/chat/completions') {
      const key = String(req.headers['x-api-key'] || '')
      if (key !== this.apiKey) return this.unauthorized(res)
      // Minimal SSE stream
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
    if (url === '/api/v1/rag/search') {
      const key = String(req.headers['x-api-key'] || '')
      if (key !== this.apiKey) return this.unauthorized(res)
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => this.ok(res, { results: [{ content: 'doc', metadata: { url: 'http://example.com' } }] }))
      return
    }

    res.writeHead(404)
    res.end('not found')
  }
}
