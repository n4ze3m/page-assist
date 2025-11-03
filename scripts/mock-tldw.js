// Minimal local mock for tldw_server endpoints used in UX review.
// Serves health and models so the extension renders the happy path.

const http = require('http')

const PORT = Number(process.env.PORT || 8000)

const send = (res, code, body, headers = {}) => {
  const data = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    ...headers
  })
  res.end(data)
}

const server = http.createServer((req, res) => {
  const { method, url } = req
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS'
    })
    return res.end()
  }

  if (method === 'GET' && url === '/api/v1/health') {
    return send(res, 200, { status: 'ok' })
  }
  if (method === 'GET' && url === '/api/v1/llm/models') {
    return send(res, 200, [
      'openai/gpt-4o-mini',
      'mistral/mistral-small-2407',
      'anthropic/claude-3-haiku'
    ])
  }
  if (method === 'GET' && url === '/openapi.json') {
    return send(res, 200, { openapi: '3.1.0', info: { title: 'mock', version: '0.0.0' } })
  }

  // Default
  return send(res, 200, { ok: true, path: url })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`mock tldw_server listening on http://127.0.0.1:${PORT}`)
})

process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('SIGINT', () => server.close(() => process.exit(0)))

