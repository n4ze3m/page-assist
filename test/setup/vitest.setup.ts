import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { installWebExtensionMocks } from '../mocks/browser'
import { installSpeechMocks } from '../mocks/speech'

// Install global mocks for webextension and speech APIs
installWebExtensionMocks(globalThis as any)
installSpeechMocks(globalThis as any)

// Optional: mock matchMedia for components using it
if (typeof window !== 'undefined' && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })
}

// Polyfill URL.createObjectURL/revokeObjectURL for jsdom
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    // @ts-ignore
    window.URL.createObjectURL = () => 'blob:mock'
  }
  if (!window.URL.revokeObjectURL) {
    // @ts-ignore
    window.URL.revokeObjectURL = () => {}
  }
}

// Ensure TextEncoder/TextDecoder are available in Node 18+
import { TextEncoder, TextDecoder } from 'node:util'
// @ts-ignore
if (!(global as any).TextEncoder) (global as any).TextEncoder = TextEncoder
// @ts-ignore
if (!(global as any).TextDecoder) (global as any).TextDecoder = TextDecoder
