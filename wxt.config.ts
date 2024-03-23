import { defineConfig } from "wxt"
import react from "@vitejs/plugin-react"

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  entrypointsDir: "entries",
  srcDir: "src",
  outDir: "build",
  manifest: {
    name: "Page Assist - A Web UI for Local AI Models",
    version: "1.1.0",
    description:
      "Use your locally running AI models to assist you in your web browsing.",
    action: {},
    author: "n4ze3m",
    host_permissions: ["http://*/*", "https://*/*"],
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
      "contextMenus"
    ]
  }
})
