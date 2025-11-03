import { defineConfig } from "wxt"
import react from "@vitejs/plugin-react"
import topLevelAwait from "vite-plugin-top-level-await"

const chromeMV3Permissions = [
  "storage",
  "sidePanel",
  "activeTab",
  "scripting",
  "unlimitedStorage",
  "contextMenus",
  "tts",
  "notifications"
]

const firefoxMV2Permissions = [
  "storage",
  "activeTab",
  "scripting",
  "unlimitedStorage",
  "contextMenus",
  "notifications",
  "http://*/*",
  "https://*/*",
  "file://*/*"
]

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [
      react(),
      topLevelAwait({
        promiseExportName: "__tla",
        promiseImportName: (i) => `__tla_${i}`
      }) as any
    ],
    // Disable Hot Module Replacement so streaming connections aren't killed by dev reloads
    server: {
      hmr: false
    },
    build: {
      rollupOptions: {
        external: ["langchain", "@langchain/community"]
      }
    }
  }),
  entrypointsDir:
    process.env.TARGET === "firefox" ? "entries-firefox" : "entries",
  srcDir: "src",
  outDir: "build",

  manifest: ({
    version: "0.1.0",
    name:
      process.env.TARGET === "firefox"
        ? "tldw Assistant - Browser Extension for tldw_server"
        : "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    action: {},
    author: "tldw-team",
    browser_specific_settings:
      process.env.TARGET === "firefox"
        ? {
          gecko: {
            id: "tldw-assistant@tldw"
          }
        }
        : undefined,
    // During development, grant localhost origins by default so background can fetch without prompts
    host_permissions:
      process.env.TARGET !== "firefox" && process.env.NODE_ENV === 'development'
        ? [
            "http://127.0.0.1/*",
            "http://localhost/*"
          ]
        : undefined,
    // Use optional host permissions on Chromium so users can grant their own server origin at runtime
    optional_host_permissions:
      process.env.TARGET !== "firefox"
        ? ["http://*/*", "https://*/*"]
        : undefined,
    commands: {
      _execute_action: {
        description: "Open the Web UI",
        suggested_key: {
          default: "Ctrl+Shift+L"
        }
      },
      execute_side_panel: {
        description: "Open the side panel",
        suggested_key: {
          default: "Ctrl+Shift+Y"
        }
      }
    },
    content_security_policy:
      process.env.TARGET !== "firefox" ?
        {
          extension_pages:
            process.env.NODE_ENV === 'development' 
              ? "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000 http://localhost:3001; object-src 'self';"
              : "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
        } :  "script-src 'self' 'wasm-unsafe-eval' blob:; object-src 'self'; worker-src 'self' blob:;",
    permissions:
      process.env.TARGET === "firefox"
        ? firefoxMV2Permissions
        : chromeMV3Permissions
  } as any)
}) as any
