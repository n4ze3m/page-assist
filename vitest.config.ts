import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['test/setup/vitest.setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 60,
        lines: 60,
        functions: 60,
        branches: 50
      },
      include: ['src/components/ChatInput/controls/**/*.{ts,tsx}'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/index.ts',
        'src/**/types.ts',
        'src/public/**',
        'build/**'
      ]
    },
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '~': new URL('./src', import.meta.url).pathname
    }
  }
})
