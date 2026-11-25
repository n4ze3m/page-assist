import { expect, test } from "bun:test"
import vm from "node:vm"
import { fileURLToPath } from "node:url"
import { Storage } from "@plasmohq/storage"

const build = await Bun.build({
  entrypoints: [
    fileURLToPath(new URL("../src/entries/background.ts", import.meta.url))
  ],
  target: "node",
  format: "cjs",
  external: ["*"]
})
if (!build.success) throw new Error("Could not compile background entry")
const source = await build.outputs[0].text()

function startWorker(savedAction) {
  const tabs = []
  const panels = []
  const callbacks = []
  const errors = []
  let clicked
  let finishInitialization
  const data = {}
  const event = () => ({ addListener() {} })
  const api = {
    runtime: {
      onMessage: event(),
      onConnect: event(),
      getURL: (path) => `chrome-extension://test${path}`,
      lastError: undefined
    },
    storage: {
      onChanged: event(),
      local: {
        async set(items) {
          Object.assign(data, items)
        },
        get(key, callback) {
          const keys = Array.isArray(key) ? key : [key]
          const read = () =>
            Object.fromEntries(
              keys.filter((k) => k in data).map((k) => [k, data[k]])
            )
          if (callback) callbacks.push(() => callback(read()))
          else return Promise.resolve(read())
        }
      }
    },
    action: {
      onClicked: {
        addListener(fn) {
          clicked = fn
        }
      }
    },
    tabs: { create: ({ url }) => tabs.push(url) },
    sidePanel: { open: ({ tabId }) => panels.push(tabId) },
    contextMenus: { ...event(), onClicked: event(), create() {}, remove() {} },
    commands: { onCommand: event() },
    i18n: { getMessage: (key) => key }
  }
  const globals = globalThis
  const previousChrome = globals.chrome
  const previousBrowser = globals.browser
  globals.chrome = api
  globals.browser = api
  const modules = {
    "wxt/browser": { browser: api },
    "@plasmohq/storage": { Storage },
    "@/services/action": {
      getInitialConfig: () =>
        new Promise((resolve) => {
          finishInitialization = resolve
        })
    },
    "@/services/application": {
      getCopilotPromptsEnabledState: async () => ({}),
      getCustomCopilotPrompts: async () => []
    }
  }
  const output = { exports: {} }
  try {
    if (savedAction !== undefined) {
      void new Storage({ area: "local" }).set("actionIconClick", savedAction)
    }
    vm.runInNewContext(source, {
      module: output,
      exports: output.exports,
      require: (id) => modules[id] || {},
      defineBackground: (config) => config,
      chrome: api,
      console: { ...console, error: (...args) => errors.push(args) },
      setTimeout
    })
    output.exports.default.main()
  } finally {
    globals.chrome = previousChrome
    globals.browser = previousBrowser
  }
  return {
    tabs,
    panels,
    api,
    errors,
    setRawAction: (value) => {
      data.actionIconClick = value
    },
    click: () => clicked({ id: 42 }),
    flushRead: () => callbacks.shift()?.(),
    changeAction(value) {
      if (value === undefined) delete data.actionIconClick
      else data.actionIconClick = JSON.stringify(value)
    },
    async finishInit(actionIconClick) {
      finishInitialization({ actionIconClick, contextMenuClick: "sidePanel" })
      await new Promise((resolve) => setImmediate(resolve))
    }
  }
}

test("first click uses the saved side panel action before initialization finishes", () => {
  const worker = startWorker("sidePanel")
  worker.click()
  expect(worker.tabs).toEqual([])
  expect(worker.panels).toEqual([])
  worker.flushRead()
  expect(worker.tabs).toEqual([])
  expect(worker.panels).toEqual([42])
})

test.each(["webui", undefined])(
  "web UI action/default stays unchanged: %s",
  (value) => {
    const worker = startWorker(value)
    worker.click()
    worker.flushRead()
    expect(worker.tabs).toEqual(["chrome-extension://test/options.html"])
    expect(worker.panels).toEqual([])
  }
)

test("a changed preference wins over a stale initialization result", async () => {
  const worker = startWorker("webui")
  await worker.finishInit("webui")
  worker.changeAction("sidePanel")
  worker.click()
  worker.flushRead()
  expect(worker.panels).toEqual([42])
  expect(worker.tabs).toEqual([])
})

test("switching back to web UI and removing the setting take effect on the next click", async () => {
  const worker = startWorker("sidePanel")
  await worker.finishInit("sidePanel")
  worker.changeAction("webui")
  worker.click()
  worker.flushRead()
  worker.changeAction()
  worker.click()
  worker.flushRead()
  expect(worker.panels).toEqual([])
  expect(worker.tabs).toHaveLength(2)
})

test("a restarted worker uses the preference on its first click", () => {
  for (let i = 0; i < 2; i++) {
    const worker = startWorker("sidePanel")
    worker.click()
    worker.flushRead()
    expect(worker.panels).toEqual([42])
    expect(worker.tabs).toEqual([])
  }
})

test("a failed storage read does not guess an action", () => {
  const worker = startWorker("sidePanel")
  worker.click()
  worker.api.runtime.lastError = { message: "Storage unavailable" }
  worker.flushRead()
  expect(worker.tabs).toEqual([])
  expect(worker.panels).toEqual([])
  expect(worker.errors).toHaveLength(1)
})

test("malformed serialized data retains the library's default behavior", () => {
  const worker = startWorker()
  worker.setRawAction("not JSON")
  worker.click()
  worker.flushRead()
  expect(worker.tabs).toEqual(["chrome-extension://test/options.html"])
  expect(worker.panels).toEqual([])
  expect(worker.errors).toHaveLength(1)
})
