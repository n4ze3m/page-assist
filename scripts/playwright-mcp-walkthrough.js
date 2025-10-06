#!/usr/bin/env node
const { spawn } = require('child_process')
const fs = require('fs/promises')
const path = require('path')
const http = require('http')

async function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let resolved = false
    const onData = (data) => {
      const text = data.toString()
      if (text.includes('Listening on')) {
        resolved = true
        cleanup()
        resolve(text.match(/Listening on (.*)/)[1].trim())
      }
    }
    const onExit = (code) => {
      if (!resolved) {
        reject(new Error(`Playwright MCP server exited with code ${code}`))
      }
    }
    const onError = (error) => {
      if (!resolved) {
        reject(error)
      }
    }
    const cleanup = () => {
      child.stdout?.off('data', onData)
      child.stderr?.off('data', onData)
      child.off('exit', onExit)
      child.off('error', onError)
    }
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.once('exit', onExit)
    child.once('error', onError)
  })
}

async function stopServer(child, baseUrl) {
  try {
    await new Promise((resolve) => {
      const req = http.get(new URL('/killkillkill', baseUrl), () => resolve())
      req.on('error', () => resolve())
    })
  } catch (_) {}
  try {
    child.kill('SIGINT')
  } catch (_) {}
  await new Promise((resolve) => child.once('exit', resolve))
}

async function resolveMcpBundle() {
  const homeDir = process.env.HOME || process.env.USERPROFILE
  if (!homeDir) {
    throw new Error('Unable to determine home directory for locating Playwright MCP cache')
  }
  const npxRoot = path.join(homeDir, '.npm', '_npx')
  let entries
  try {
    entries = await fs.readdir(npxRoot)
  } catch (error) {
    throw new Error('Playwright MCP cache not found. Run "npx @playwright/mcp@latest --help" once to populate it.')
  }
  entries.sort()
  for (const entry of entries.reverse()) {
    const nodeModulesDir = path.join(npxRoot, entry, 'node_modules')
    const packagePath = path.join(nodeModulesDir, '@playwright', 'mcp', 'package.json')
    try {
      await fs.access(packagePath)
      const bundlePath = path.join(nodeModulesDir, 'playwright', 'lib/mcp/sdk/bundle.js')
      return require(bundlePath)
    } catch (_) {}
  }
  throw new Error('Unable to locate Playwright MCP SDK bundle in npx cache')
}

const BACKEND_PROXY_URL = process.env.MCP_BACKEND_URL || 'http://127.0.0.1:8000'

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

async function startStaticServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost')
      if (url.pathname.startsWith('/api/')) {
        const target = new URL(req.url, BACKEND_PROXY_URL)
        const proxyReq = http.request(target, { method: req.method, headers: req.headers }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
          proxyRes.pipe(res)
        })
        proxyReq.on('error', (error) => {
          res.statusCode = 502
          res.end(`Proxy error: ${error.message}`)
        })
        req.pipe(proxyReq)
        return
      }
      let requestPath = decodeURIComponent(url.pathname)
      if (!requestPath || requestPath === '/') {
        requestPath = '/index.html'
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
        const replacement = `if(!(globalThis.chrome&&globalThis.chrome.runtime&&globalThis.chrome.runtime.id)){console.warn("[mcp-static] mocking chrome runtime for MCP harness");if(typeof globalThis.__mcpEnsureExtensionEnv==='function'){globalThis.__mcpEnsureExtensionEnv();}else{globalThis.chrome=globalThis.chrome||{runtime:{}};globalThis.chrome.runtime.id=globalThis.chrome.runtime.id||'mock-runtime-id';globalThis.browser=globalThis.browser||{runtime:globalThis.chrome.runtime};}}`
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
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to determine static server address')
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve()))
  }
}

async function main() {
  const mcp = await resolveMcpBundle()
  const projectRoot = process.cwd()
  const buildDir = path.join(projectRoot, 'build', 'chrome-mv3')
  await fs.access(path.join(buildDir, 'options.html'))

  const staticServer = await startStaticServer(buildDir)
  const artifactsDir = path.join(projectRoot, 'playwright-mcp-artifacts')
  await fs.mkdir(artifactsDir, { recursive: true })

  const initScriptPath = path.join(artifactsDir, 'mcp-init.js')
  const initScript = `
    (() => {
      console.info('[mcp-init] injected init script');

      const createEventDispatcher = () => {
        const listeners = new Set();
        return {
          addListener(listener) {
            if (typeof listener === 'function') {
              listeners.add(listener);
            }
          },
          removeListener(listener) {
            listeners.delete(listener);
          },
          hasListener(listener) {
            return listeners.has(listener);
          },
          emit(...args) {
            for (const listener of listeners) {
              try {
                listener(...args);
              } catch (error) {
                console.error('[mcp-init] listener error', error);
              }
            }
          }
        };
      };

      const createStorageArea = (areaName, globalChangedEvent) => {
        const store = new Map();
        const onChanged = createEventDispatcher();
        const emitChanges = (changes) => {
          if (!changes || Object.keys(changes).length === 0) return;
          onChanged.emit(changes, areaName);
          globalChangedEvent?.emit(changes, areaName);
        };
        const normalizeKeys = (keys) => {
          if (keys === null || keys === undefined) return [];
          if (Array.isArray(keys)) return keys;
          if (typeof keys === 'string') return [keys];
          if (typeof keys === 'object') return Object.keys(keys);
          return [];
        };
        const get = (keys, callback) => {
          const keyList = normalizeKeys(keys);
          let result;
          if (keyList.length === 0) {
            result = Object.fromEntries(store.entries());
          } else {
            result = {};
            for (const key of keyList) {
              if (typeof keys === 'object' && !Array.isArray(keys)) {
                result[key] = store.has(key) ? store.get(key) : keys[key];
              } else {
                result[key] = store.get(key);
              }
            }
          }
          callback?.(result);
          return Promise.resolve(result);
        };
        const set = (items, callback) => {
          const entries = Object.entries(items || {});
          const changes = {};
          for (const [key, value] of entries) {
            const oldValue = store.has(key) ? store.get(key) : undefined;
            store.set(key, value);
            changes[key] = { oldValue, newValue: value };
          }
          emitChanges(changes);
          callback?.();
          return Promise.resolve();
        };
        const remove = (keys, callback) => {
          const keyList = normalizeKeys(keys);
          const changes = {};
          for (const key of keyList) {
            if (store.has(key)) {
              changes[key] = { oldValue: store.get(key), newValue: undefined };
              store.delete(key);
            }
          }
          emitChanges(changes);
          callback?.();
          return Promise.resolve();
        };
        const clear = (callback) => {
          const changes = {};
          for (const [key, value] of store.entries()) {
            changes[key] = { oldValue: value, newValue: undefined };
          }
          store.clear();
          emitChanges(changes);
          callback?.();
          return Promise.resolve();
        };
        return { get, set, remove, clear, onChanged };
      };

      const makeEvent = () => ({
        addListener() {},
        removeListener() {},
        hasListener() { return false; }
      });

      const ensureExtensionEnv = () => {
        const runtime = globalThis.chrome?.runtime || {
          id: 'mock-runtime-id',
          getURL(path) {
            try {
              return new URL(path, location.origin).toString();
            } catch {
              return path;
            }
          },
          sendMessage(message, responseCallback) {
            responseCallback?.();
            return Promise.resolve();
          },
          connect() {
            return {
              onMessage: makeEvent(),
              onDisconnect: makeEvent(),
              postMessage() {},
              disconnect() {}
            };
          },
          onMessage: makeEvent(),
          onConnect: makeEvent(),
          onInstalled: makeEvent()
        };
        runtime.onMessage = runtime.onMessage || makeEvent();
        runtime.onConnect = runtime.onConnect || makeEvent();
        runtime.onInstalled = runtime.onInstalled || makeEvent();
        runtime.reload = runtime.reload || function () {
          console.info('[mcp-init] Mocking chrome.runtime.reload in MCP harness');
        };
        runtime.connect = runtime.connect || (function () {
          return {
            onMessage: makeEvent(),
            onDisconnect: makeEvent(),
            postMessage() {},
            disconnect() {}
          };
        });
        runtime.sendMessage = runtime.sendMessage || function (_message, responseCallback) {
          responseCallback?.();
          return Promise.resolve();
        };
        runtime.getURL = runtime.getURL || function (path) {
          try {
            return new URL(path, location.origin).toString();
          } catch {
            return path;
          }
        };

        const storageChanged = globalThis.chrome?.storage?.onChanged || createEventDispatcher();
        const storage = globalThis.chrome?.storage || {
          local: createStorageArea('local', storageChanged),
          sync: createStorageArea('sync', storageChanged),
          session: createStorageArea('session', storageChanged),
          onChanged: storageChanged
        };
        storage.onChanged = storage.onChanged || storageChanged;
        storage.local.onChanged = storage.local.onChanged || createEventDispatcher();
        storage.sync.onChanged = storage.sync.onChanged || createEventDispatcher();
        storage.session.onChanged = storage.session.onChanged || createEventDispatcher();

        const i18n = globalThis.chrome?.i18n || {
          getMessage(name) {
            return name;
          }
        };

        globalThis.chrome = {
          runtime: runtime,
          storage,
          i18n
        };

        if (!globalThis.chrome.runtime.id) {
          globalThis.chrome.runtime.id = 'mock-runtime-id';
        }

        globalThis.browser = globalThis.browser || {};
        globalThis.browser.runtime = globalThis.browser.runtime || globalThis.chrome.runtime;
        if (!globalThis.browser.runtime.onMessage) {
          globalThis.browser.runtime.onMessage = runtime.onMessage;
        }
        if (!globalThis.browser.runtime.onConnect) {
          globalThis.browser.runtime.onConnect = runtime.onConnect;
        }
        if (!globalThis.browser.runtime.onInstalled) {
          globalThis.browser.runtime.onInstalled = runtime.onInstalled;
        }
        if (!globalThis.browser.runtime.connect) {
          globalThis.browser.runtime.connect = runtime.connect;
        }
        if (!globalThis.browser.runtime.sendMessage) {
          globalThis.browser.runtime.sendMessage = runtime.sendMessage;
        }
        if (!globalThis.browser.runtime.reload) {
          globalThis.browser.runtime.reload = runtime.reload;
        }
        globalThis.browser.storage = globalThis.browser.storage || globalThis.chrome.storage;
        globalThis.browser.i18n = globalThis.browser.i18n || globalThis.chrome.i18n;
        globalThis.browser.tabs = globalThis.browser.tabs || {
          create() {
            return Promise.resolve({});
          }
        };
      };

      ensureExtensionEnv();

      globalThis.__mcpEnsureExtensionEnv = ensureExtensionEnv;
    })();
  `
  await fs.writeFile(initScriptPath, initScript)

  const server = spawn('npx', [
    '@playwright/mcp@latest',
    '--headless',
    '--browser=chromium',
    '--host=127.0.0.1',
    '--port',
    '0',
    '--viewport-size=1440x900',
    '--timeout-action',
    '600000',
    '--timeout-navigation',
    '600000',
    '--init-script',
    initScriptPath
  ], { stdio: ['ignore', 'pipe', 'pipe'] })

  const baseUrl = await waitForServer(server)
  const transport = new mcp.StreamableHTTPClientTransport(new URL('/mcp', baseUrl))
  const client = new mcp.Client({ name: 'codex-cli', version: '0.1.0' }, { capabilities: { roots: {} } })
  client.setRequestHandler(mcp.PingRequestSchema, () => ({}))
  client.setRequestHandler(mcp.ListRootsRequestSchema, () => ({ roots: [] }))
  await client.connect(transport)

  try {
    const optionsUrl = new URL('/options.html', staticServer.url)
    console.log('Navigating to', optionsUrl.toString())
    await client.callTool({ name: 'browser_navigate', arguments: { url: optionsUrl.toString() } })
    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { text: 'Welcome — Let’s get you connected', time: 10 } })
    } catch (error) {
      console.warn('Initial onboarding wait timed out, continuing', error.message)
    }

    const fillServer = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          const input = document.querySelector('input');
          if (!input) return 'no-input';
          const value = 'http://127.0.0.1:8000';
          const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          native?.set?.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return value;
        }`
      }
    })
    console.log('Server URL set:', fillServer)

    const nextClick = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const target = buttons.find((btn) => btn.textContent?.trim() === 'Next');
          if (!target) return 'no-next-button';
          target.click();
          return 'clicked-next';
        }`
      }
    })
    console.log('Next click result:', nextClick)
    await client.callTool({ name: 'browser_wait_for', arguments: { time: 1 } })
    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { text: 'Authentication Mode' } })
    } catch (error) {
      console.error('Step 2 wait failed, capturing context', error)
      const html = await client.callTool({ name: 'browser_evaluate', arguments: { function: '() => document.body.innerText' } })
      await fs.writeFile(path.join(artifactsDir, 'step1-after-click.txt'), html.content?.[0]?.text ?? '', 'utf8')
      await client.callTool({
        name: 'browser_take_screenshot',
        arguments: { filename: path.join(artifactsDir, 'step1-after-click.png'), fullPage: true }
      })
      console.error('Captured step1-after-click artifacts for debugging')
      throw error
    }

    console.log('Filling API key')
    const apiKeyResult = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          const input = document.querySelector('input[type="password"]');
          if (!input) return 'no-api-key';
          const value = 'test-api-key-12345';
          const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
          native?.set?.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return value;
        }`
      }
    })
    console.log('API key fill result:', apiKeyResult)

    console.log('Clicking Continue')
    const continueResult = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const target = buttons.find((btn) => btn.textContent?.trim() === 'Continue');
          if (!target) return 'no-continue-button';
          target.click();
          return 'clicked-continue';
        }`
      }
    })
    console.log('Continue click result:', continueResult)

    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { time: 8 } })
    } catch (error) {
      console.warn('Timed wait after continue encountered an error, proceeding', error.message)
    }

    const statusHtml = await client.callTool({
      name: 'browser_evaluate',
      arguments: { function: '() => document.querySelector("main").innerText' }
    })
    await fs.writeFile(path.join(artifactsDir, 'onboarding-status.txt'), statusHtml.content?.[0]?.text ?? '', 'utf8')

    // Open media settings for further inspection
    const settingsUrl = new URL('/options.html#/settings/tldw', staticServer.url)
    await client.callTool({ name: 'browser_navigate', arguments: { url: settingsUrl.toString() } })
    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { text: 'Advanced Timeouts', time: 5 } })
    } catch (error) {
      console.warn('Settings wait timed out, continuing with snapshot', error.message)
    }
    const settingsSnapshot = await client.callTool({ name: 'browser_snapshot' })
    await fs.writeFile(path.join(artifactsDir, 'settings-tldw-snapshot.json'), JSON.stringify(settingsSnapshot, null, 2), 'utf8')

    // Navigate to sidepanel mock to ensure empty state renders post-config
    const sidepanelUrl = new URL('/sidepanel.html', staticServer.url)
    await client.callTool({ name: 'browser_navigate', arguments: { url: sidepanelUrl.toString() } })
    await client.callTool({ name: 'browser_wait_for', arguments: { text: 'Waiting for your tldw server' } })
    const sidepanelSnapshot = await client.callTool({ name: 'browser_snapshot' })
    await fs.writeFile(path.join(artifactsDir, 'sidepanel-post-config-snapshot.json'), JSON.stringify(sidepanelSnapshot, null, 2), 'utf8')

    await client.callTool({
      name: 'browser_take_screenshot',
      arguments: { filename: path.join(artifactsDir, 'walkthrough.png'), fullPage: true }
    })

    // Capture additional option routes for UX review
    const playgroundUrl = new URL('/options.html#/playground', staticServer.url)
    await client.callTool({ name: 'browser_navigate', arguments: { url: playgroundUrl.toString() } })
    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { text: 'Playground', time: 5 } })
    } catch (error) {
      console.warn('Playground wait timed out, capturing anyway', error.message)
    }
    const playgroundSnapshot = await client.callTool({ name: 'browser_snapshot' })
    await fs.writeFile(path.join(artifactsDir, 'playground-snapshot.json'), JSON.stringify(playgroundSnapshot, null, 2), 'utf8')

    const promptsUrl = new URL('/options.html#/prompts', staticServer.url)
    await client.callTool({ name: 'browser_navigate', arguments: { url: promptsUrl.toString() } })
    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { text: 'Prompts', time: 5 } })
    } catch (error) {
      console.warn('Prompts wait timed out, capturing anyway', error.message)
    }
    const promptsSnapshot = await client.callTool({ name: 'browser_snapshot' })
    await fs.writeFile(path.join(artifactsDir, 'prompts-snapshot.json'), JSON.stringify(promptsSnapshot, null, 2), 'utf8')

    const historyUrl = new URL('/options.html#/history', staticServer.url)
    await client.callTool({ name: 'browser_navigate', arguments: { url: historyUrl.toString() } })
    try {
      await client.callTool({ name: 'browser_wait_for', arguments: { text: 'History', time: 5 } })
    } catch (error) {
      console.warn('History wait timed out, capturing anyway', error.message)
    }
    const historySnapshot = await client.callTool({ name: 'browser_snapshot' })
    await fs.writeFile(path.join(artifactsDir, 'history-snapshot.json'), JSON.stringify(historySnapshot, null, 2), 'utf8')
  } finally {
    await client.callTool({ name: 'browser_close' }).catch(() => undefined)
    await client.close()
    if (transport.terminateSession) {
      await transport.terminateSession().catch(() => undefined)
    }
    await stopServer(server, baseUrl)
    await staticServer.close().catch(() => undefined)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
