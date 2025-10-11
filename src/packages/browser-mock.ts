/**
 * Mock browser API for web app mode
 * This provides stub implementations of common browser extension APIs
 * to prevent errors when running as a standalone web app
 */

// Storage API mock using localStorage
const createStorageMock = () => {
  const storage = {
    local: {
      get: (keys: string | string[] | Record<string, any> | null) => {
        return new Promise((resolve) => {
          if (keys === null || keys === undefined) {
            // Get all items
            const result: Record<string, any> = {}
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i)
              if (key) {
                try {
                  result[key] = JSON.parse(localStorage.getItem(key) || 'null')
                } catch {
                  result[key] = localStorage.getItem(key)
                }
              }
            }
            resolve(result)
          } else if (typeof keys === 'string') {
            // Single key
            try {
              const value = localStorage.getItem(keys)
              resolve({ [keys]: value ? JSON.parse(value) : undefined })
            } catch {
              resolve({ [keys]: localStorage.getItem(keys) })
            }
          } else if (Array.isArray(keys)) {
            // Array of keys
            const result: Record<string, any> = {}
            keys.forEach((key) => {
              try {
                const value = localStorage.getItem(key)
                result[key] = value ? JSON.parse(value) : undefined
              } catch {
                result[key] = localStorage.getItem(key)
              }
            })
            resolve(result)
          } else {
            // Object with default values
            const result: Record<string, any> = {}
            Object.keys(keys).forEach((key) => {
              try {
                const value = localStorage.getItem(key)
                result[key] = value ? JSON.parse(value) : keys[key]
              } catch {
                result[key] = localStorage.getItem(key) || keys[key]
              }
            })
            resolve(result)
          }
        })
      },
      set: (items: Record<string, any>) => {
        return new Promise<void>((resolve) => {
          Object.entries(items).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
          })
          resolve()
        })
      },
      remove: (keys: string | string[]) => {
        return new Promise<void>((resolve) => {
          const keyArray = Array.isArray(keys) ? keys : [keys]
          keyArray.forEach((key) => localStorage.removeItem(key))
          resolve()
        })
      },
      clear: () => {
        return new Promise<void>((resolve) => {
          localStorage.clear()
          resolve()
        })
      },
      getBytesInUse: () => Promise.resolve(0)
    },
    sync: {
      get: (keys: string | string[] | Record<string, any> | null) => {
        // Same as local for web app
        return storage.local.get(keys)
      },
      set: (items: Record<string, any>) => storage.local.set(items),
      remove: (keys: string | string[]) => storage.local.remove(keys),
      clear: () => storage.local.clear(),
      getBytesInUse: () => Promise.resolve(0)
    },
    onChanged: {
      addListener: () => {},
      removeListener: () => {},
      hasListener: () => false
    }
  }
  return storage
}

// Runtime API mock
const createRuntimeMock = () => ({
  id: 'web-app-mock',
  getURL: (path: string) => {
    // Convert extension URLs to relative paths
    return path.startsWith('/') ? path : `/${path}`
  },
  getManifest: () => ({
    version: '1.0.0',
    name: 'Page Assist Web',
    manifest_version: 3
  }),
  sendMessage: () => Promise.resolve(),
  onMessage: {
    addListener: () => {},
    removeListener: () => {},
    hasListener: () => false
  },
  lastError: null
})

// Tabs API mock
const createTabsMock = () => ({
  query: () => Promise.resolve([]),
  create: () => Promise.resolve({}),
  update: () => Promise.resolve({}),
  remove: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  captureVisibleTab: () => Promise.resolve(''),
  onUpdated: {
    addListener: () => {},
    removeListener: () => {},
    hasListener: () => false
  }
})

// Action API mock
const createActionMock = () => ({
  setTitle: () => Promise.resolve(),
  setBadgeText: () => Promise.resolve(),
  setBadgeBackgroundColor: () => Promise.resolve(),
  onClicked: {
    addListener: () => {},
    removeListener: () => {},
    hasListener: () => false
  }
})

// Scripting API mock
const createScriptingMock = () => ({
  executeScript: () => Promise.resolve([])
})

// Notifications API mock
const createNotificationsMock = () => ({
  create: () => Promise.resolve(''),
  clear: () => Promise.resolve(true),
  onClicked: {
    addListener: () => {},
    removeListener: () => {},
    hasListener: () => false
  }
})

// Main browser mock object
export const browserMock = {
  storage: createStorageMock(),
  runtime: createRuntimeMock(),
  tabs: createTabsMock(),
  action: createActionMock(),
  scripting: createScriptingMock(),
  notifications: createNotificationsMock()
}

// Named exports for compatibility with various import patterns
export const browser = browserMock
export const storage = browserMock.storage
export const runtime = browserMock.runtime
export const tabs = browserMock.tabs
export const action = browserMock.action
export const scripting = browserMock.scripting
export const notifications = browserMock.notifications

// Set up global browser/chrome objects
if (typeof window !== 'undefined') {
  ;(window as any).chrome = browserMock
  ;(window as any).browser = browserMock
}

export default browserMock
