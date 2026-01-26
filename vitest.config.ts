import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["test/setup/vitest.setup.ts"],
    css: false,
    include: ["src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["test/e2e/**", "node_modules/**", "dist/**", "build/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 40,
        branches: 50
      },
      include: [
        "src/components/ChatInput/**/*.{ts,tsx}",
        "src/components/Common/**/*.{ts,tsx}",
        "src/components/Select/**/*.{ts,tsx}",
        "src/store/**/*.{ts,tsx}"
      ],
      exclude: [
        "src/**/__tests__/**",
        "src/**/index.ts",
        "src/**/types.ts",
        "src/public/**",
        "build/**",
        "src/components/Icons/**",
        "src/components/Sidepanel/**",
        "src/components/Common/Message/**",
        "src/components/Common/Playground/**",
        "src/components/Common/Settings/**",
        "src/components/Layouts/Header.tsx",
        "src/components/Layouts/Layout.tsx",
        "src/components/Layouts/MoreOptions.tsx",
        "src/components/Option/Sidebar.tsx",
        "src/components/Select/LoadingIndicator.tsx",
        "src/components/Select/index.tsx"
      ]
    },
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "~": new URL("./src", import.meta.url).pathname
    }
  }
})
