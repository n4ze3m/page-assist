import { defineConfig } from "wxt"
import react from "@vitejs/plugin-react"
import topLevelAwait from "vite-plugin-top-level-await"

const chromeMV3Permissions = [
  "storage",
  "sidePanel",
  "activeTab",
  "scripting",
  "declarativeNetRequest",
  "action",
  "unlimitedStorage",
  "contextMenus",
  "tts"
]

const firefoxMV2Permissions = [
  "storage",
  "activeTab",
  "scripting",
  "unlimitedStorage",
  "contextMenus",
  "webRequest",
  "webRequestBlocking",
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
      })
    ],
    build: {
      rollupOptions: {
        external: ["langchain", "@langchain/community"]
      }
    }
  }),
  entrypointsDir: "entries",
  srcDir: "src",
  outDir: "build",

  manifest: {
    version: "1.1.7",
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    action: {},
    author: "n4ze3m",
    browser_specific_settings:
      process.env.TARGET === "firefox"
        ? {
            gecko: {
              id: "page-assist@n4ze3m"
            }
          }
        : undefined,
    host_permissions:
      process.env.TARGET !== "firefox"
        ? ["http://*/*", "https://*/*", "file://*/*"]
        : undefined,
    commands: {
      _execute_action: {
        suggested_key: {
          default: "Ctrl+Shift+L"
        }
      },
      execute_side_panel: {
        description: "Open the side panel",
        suggested_key: {
          default: "Ctrl+Shift+P"
        }
      }
    },
    permissions:
      process.env.TARGET === "firefox"
        ? firefoxMV2Permissions
        : chromeMV3Permissions
  }
})
