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
      // Firefox MV2 validator chokes on modern ESM in chunks; downlevel and turn off module preload there.
      target: process.env.TARGET === "firefox" ? "es2017" : "esnext",
      modulePreload: process.env.TARGET === "firefox" ? false : undefined,
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
        ? "tldw Assistant"
        : "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    action: {},
    author: "tldw-team",
    browser_specific_settings:
      process.env.TARGET === "firefox"
        ? {
          gecko: {
            id: "tldw-assistant@tldw",
            data_collection_permissions: {
              required: false,
              reasons: ["Not collecting user data."]
            }
          }
        }
        : undefined,
    // Allow outbound calls to the user's tldw_server (local or remote) without an extra permission prompt.
    host_permissions: ["http://*/*", "https://*/*"],
    optional_host_permissions: undefined,
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
