import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { installWebExtensionMocks } from '../mocks/browser'
import { installSpeechMocks } from '../mocks/speech'

// Centralized global reference
const g = globalThis as any

// Small helpers to reduce repetition
const createNoop = () => () => {}
const defineIfMissing = (obj: any, key: string, value: any) => {
  if (obj && obj[key] === undefined) obj[key] = value
}

// Install global mocks for webextension and speech APIs
installWebExtensionMocks(g)
installSpeechMocks(g)

// Browser-like polyfills guarded by window availability
if (typeof window !== 'undefined') {
  const noop = createNoop()

  // Optional: mock matchMedia for components using it
  if (!('matchMedia' in window)) {
    defineIfMissing(window as any, 'matchMedia', () => ({
      matches: false,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }))
  }

  // Polyfill getComputedStyle to avoid jsdom not-implemented errors from antd/rc-* internals
  if (!('getComputedStyle' in window)) {
    ;(window as any).getComputedStyle = () => ({
      getPropertyValue: () => '',
      overflowY: 'auto',
      overflowX: 'auto',
    }) as any
  }

  // Polyfill URL.createObjectURL/revokeObjectURL for jsdom
  const urlObj = (window as any).URL || ((window as any).URL = {})
  defineIfMissing(urlObj, 'createObjectURL', () => 'blob:mock')
  defineIfMissing(urlObj, 'revokeObjectURL', noop)
}

// Ensure TextEncoder/TextDecoder are available in Node 18+
import { TextEncoder, TextDecoder } from 'node:util'
if (!g.TextEncoder) g.TextEncoder = TextEncoder
if (!g.TextDecoder) g.TextDecoder = TextDecoder
