import { defineConfig } from "wxt"
import react from "@vitejs/plugin-react"
import topLevelAwait from "vite-plugin-top-level-await"

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react(),
      topLevelAwait({
        promiseExportName: '__tla',
        promiseImportName: i => `__tla_${i}`,
      }),
    ],
    build: {
      rollupOptions: {
        external: [
          "langchain",
          "@langchain/community",
        ]
      }
    }
  }),
  entrypointsDir: "entries",
  srcDir: "src",
  outDir: "build",
  manifest: {
    version: "1.1.5",
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    action: {},
    author: "n4ze3m",
    host_permissions: ["http://*/*", "https://*/*", "file://*/*"],
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
    permissions: [
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
  }
})
