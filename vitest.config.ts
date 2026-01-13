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
      include: [
        'src/components/ChatInput/**/*.{ts,tsx}',
        'src/components/Common/Beta.tsx',
        'src/components/Common/SaveButton.tsx',
        'src/components/Common/DocumentCard.tsx',
        'src/components/Common/PageAssistLoader.tsx',
        'src/components/Common/ProviderIcon.tsx',
        'src/components/Common/Markdown.tsx'
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/**/index.ts',
        'src/**/types.ts',
        'src/public/**',
        'build/**',
        'src/components/Icons/**',
        'src/components/Layouts/**',
        'src/components/Option/**',
        'src/components/Select/**',
        'src/components/Sidepanel/**',
        'src/components/Common/Message/**',
        'src/components/Common/Playground/**',
        'src/components/Common/Settings/**'
      ]
    },
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '~': new URL('./src', import.meta.url).pathname
    }
  }
})
