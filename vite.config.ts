import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    topLevelAwait({
      promiseExportName: '__tla',
      promiseImportName: (i) => `__tla_${i}`
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src'),
      // Alias WXT browser polyfill to our mock
      'wxt/browser': path.resolve(__dirname, './src/packages/browser-mock.ts'),
      'webextension-polyfill': path.resolve(__dirname, './src/packages/browser-mock.ts')
    }
  },

  build: {
    outDir: 'dist-web',
    rollupOptions: {
      external: ['langchain', '@langchain/community']
    }
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    exclude: ['wxt/browser', 'webextension-polyfill']
  }
})
