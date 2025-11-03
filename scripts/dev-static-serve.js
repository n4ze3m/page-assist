#!/usr/bin/env node
// Minimal static server for built extension assets with a small patch
// to tolerate running outside an extension context (mocks chrome.runtime.id).
// Usage: node scripts/dev-static-serve.js build/chrome-mv3 [port]
const http = require('http')
const fs = require('fs/promises')
const path = require('path')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip'
}

async function startStaticServer(rootDir, desiredPort) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1')
      let requestPath = decodeURIComponent(url.pathname)
      if (!requestPath || requestPath === '/') {
        requestPath = '/options.html'
      } else if (requestPath.endsWith('/')) {
        requestPath = `${requestPath}index.html`
      }
      const filePath = path.join(rootDir, requestPath)
      const relative = path.relative(rootDir, filePath)
      if (relative.startsWith('..')) {
        res.statusCode = 403
        res.end('Forbidden')
        return
      }
      let data = await fs.readFile(filePath)
      const ext = path.extname(filePath).toLowerCase()
      if (ext === '.js' || ext === '.mjs') {
        const guard = 'if(!(globalThis.chrome&&globalThis.chrome.runtime&&globalThis.chrome.runtime.id))throw new Error("This script should only be loaded in a browser extension.");'
        const replacement = `if(!(globalThis.chrome&&globalThis.chrome.runtime&&globalThis.chrome.runtime.id)){console.warn("[dev-static] mocking chrome runtime for static serve");globalThis.chrome=globalThis.chrome||{runtime:{}};globalThis.chrome.runtime.id=globalThis.chrome.runtime.id||'mock-runtime-id';globalThis.browser=globalThis.browser||{runtime:globalThis.chrome.runtime};}`
        let text = data.toString('utf8')
        if (text.includes('This script should only be loaded in a browser extension.')) {
          text = text.split(guard).join(replacement)
          data = Buffer.from(text, 'utf8')
        }
      }
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
      res.end(data)
    } catch (error) {
      res.statusCode = error?.code === 'ENOENT' ? 404 : 500
      res.end(error?.code === 'ENOENT' ? 'Not found' : 'Error')
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(desiredPort || 0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine server address')
  }
  const url = `http://127.0.0.1:${address.port}`
  console.log(`[dev-static] Serving ${rootDir} at ${url}`)
  return { url, close: () => new Promise((r) => server.close(() => r())) }
}

async function main() {
  const rootDir = path.resolve(process.argv[2] || 'build/chrome-mv3')
  const port = process.argv[3] ? Number(process.argv[3]) : undefined
  const { url } = await startStaticServer(rootDir, port)
  console.log(`[dev-static] Ready. Open ${new URL('/options.html', url)}`)
  // Keep running
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

