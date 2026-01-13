// Minimal webextension API mocks for tests
// Provides both browser.* (Promise-based) and chrome.* (callback-based) facades

// Simple event emitter for onMessage-like APIs
class SimpleEvent<T extends (...args: any[]) => void> {
  private listeners = new Set<T>()
  addListener = (cb: T) => this.listeners.add(cb)
  removeListener = (cb: T) => this.listeners.delete(cb)
  hasListener = (cb: T) => this.listeners.has(cb)
  emit = (...args: Parameters<T>) => this.listeners.forEach((l) => l(...args))
}

const createStorageArea = () => {
  let store: Record<string, any> = {}
  const onChanged = new SimpleEvent<(changes: any, areaName: string) => void>()
  return {
    get: (keys?: any) => {
      if (!keys) return Promise.resolve({ ...store })
      if (typeof keys === 'string') return Promise.resolve({ [keys]: store[keys] })
      if (Array.isArray(keys)) {
        const out: Record<string, any> = {}
        for (const k of keys) out[k] = store[k]
        return Promise.resolve(out)
      }
      if (typeof keys === 'object') {
        const out: Record<string, any> = { ...keys }
        for (const k of Object.keys(keys)) if (k in store) out[k] = store[k]
        return Promise.resolve(out)
      }
      return Promise.resolve({})
    },
    set: async (items: Record<string, any>) => {
      const changes: Record<string, any> = {}
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: store[k], newValue: v }
        store[k] = v
      }
      onChanged.emit(changes, 'local')
      return
    },
    remove: async (keys: string | string[]) => {
      const arr = Array.isArray(keys) ? keys : [keys]
      const changes: Record<string, any> = {}
      for (const k of arr) {
        changes[k] = { oldValue: store[k], newValue: undefined }
        delete store[k]
      }
      onChanged.emit(changes, 'local')
      return
    },
    clear: async () => {
      store = {}
      onChanged.emit({}, 'local')
    },
    onChanged
  }
}

export function installWebExtensionMocks(globalObj: any) {
  const storage = {
    local: createStorageArea(),
    sync: createStorageArea(),
    session: createStorageArea()
  }

  const runtime = {
    id: 'test-runtime',
    getURL: (path: string) => `chrome-extension://test/${path}`,
    sendMessage: async (_message: any) => undefined,
    onMessage: new SimpleEvent<(message: any, sender: any) => void>()
  }

  const tabs = {
    query: async (_queryInfo: any) => [],
    captureVisibleTab: async (_windowId?: any, _options?: any) => 'data:image/png;base64,'
  }

  const sidePanel = {
    open: async (_opts?: any) => {}
  }

  const contextMenus = {
    create: (_createProperties: any) => {},
    remove: async (_menuItemId: any) => {}
  }

  const declarativeNetRequest = {
    updateDynamicRules: async (_opts: any) => {}
  }

  const notifications = {
    create: async (_options: any) => {}
  }

  const base = {
    runtime,
    tabs,
    storage,
    sidePanel,
    contextMenus,
    declarativeNetRequest,
    notifications,
    action: {
      setTitle: (_: any) => {},
      setBadgeBackgroundColor: (_: any) => {},
      setBadgeText: (_: any) => {}
    },
    browserAction: {
      setTitle: (_: any) => {},
      setBadgeBackgroundColor: (_: any) => {},
      setBadgeText: (_: any) => {}
    },
    i18n: {
      getMessage: (key: string) => key
    },
    commands: {
      onCommand: new SimpleEvent<(cmd: string) => void>()
    }
  }

  // Promise-based browser.*
  globalObj.browser = base

  // Callback-based chrome.* with lastError simulation
  const chromeLike: any = {}
  chromeLike.runtime = {
    ...runtime,
    getURL: runtime.getURL,
    sendMessage: (message: any, callback?: (res?: any) => void) => {
      Promise.resolve(undefined).then(() => callback && callback(undefined))
    },
    lastError: null
  }

  const wrapAsync = (fn: any) => (arg: any, cb?: (res?: any) => void) => {
    fn(arg).then((res: any) => cb && cb(res))
  }

  chromeLike.tabs = {
    query: (q: any, cb?: (tabs?: any) => void) => {
      Promise.resolve([]).then((r) => cb && cb(r))
    },
    captureVisibleTab: (_w: any, _o: any, cb?: (dataUrl?: string) => void) => {
      Promise.resolve('data:image/png;base64,').then((r) => cb && cb(r))
    }
  }

  const storageCbArea = (area: any) => ({
    get: (keys: any, cb?: (items: any) => void) => {
      area.get(keys).then((res: any) => cb && cb(res))
    },
    set: (items: any, cb?: () => void) => {
      area.set(items).then(() => cb && cb())
    },
    remove: (keys: any, cb?: () => void) => {
      area.remove(keys).then(() => cb && cb())
    },
    clear: (cb?: () => void) => {
      area.clear().then(() => cb && cb())
    }
  })

  chromeLike.storage = {
    local: storageCbArea(storage.local),
    sync: storageCbArea(storage.sync),
    session: storageCbArea(storage.session)
  }

  chromeLike.sidePanel = { open: wrapAsync(sidePanel.open) }
  chromeLike.contextMenus = {
    create: (p: any) => contextMenus.create(p),
    remove: wrapAsync(contextMenus.remove)
  }
  chromeLike.declarativeNetRequest = { updateDynamicRules: wrapAsync(declarativeNetRequest.updateDynamicRules) }
  chromeLike.notifications = { create: wrapAsync(notifications.create) }
  chromeLike.action = base.action
  chromeLike.browserAction = base.browserAction
  chromeLike.i18n = base.i18n

  globalObj.chrome = chromeLike
}
