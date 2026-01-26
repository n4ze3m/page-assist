import { defineConfig } from "wxt"
import react from "@vitejs/plugin-react"
import topLevelAwait from "vite-plugin-top-level-await"
import pkg from "./package.json"

const chromeMV3Permissions = [
  "storage",
  "sidePanel",
  "activeTab",
  "scripting",
  "declarativeNetRequest",
  "action",
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
  "webRequest",
  "webRequestBlocking",
  "notifications",
  "http://*/*",
  "https://*/*",
  "file://*/*"
]

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    define: {
      "process.env.TARGET": JSON.stringify(process.env.TARGET || "chrome")
    },
    plugins: [
      react(),
      topLevelAwait({
        promiseExportName: "__tla",
        promiseImportName: (i) => `__tla_${i}`
      }) as any
    ],
    // Avoid externalizing LangChain v1 packages; bundle them instead to ensure proper ESM exports resolution
    optimizeDeps: {
      include: [
        "@langchain/core",
        "@langchain/openai",
        "@langchain/community",
        "@langchain/textsplitters"
      ]
    },
    build: {
      rollupOptions: {
        // no externals for langchain v1 packages
      }
    }
  }),
  entrypointsDir:
    process.env.TARGET === "firefox" ? "entries-firefox" : "entries",
  srcDir: "src",
  outDir: "build",

  manifest: {
    version: (pkg.version || "0.0.0").split("-")[0],
    name:
      process.env.TARGET === "firefox"
        ? "Page Assist - UI for AI Models"
        : "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    action: {},
    author: "n4zeem" as any,
    browser_specific_settings:
      process.env.TARGET === "firefox"
        ? {
            gecko: {
              id: "page-assist@nazeem"
            }
          }
        : undefined,
    host_permissions:
      process.env.TARGET !== "firefox"
        ? ["http://*/*", "https://*/*", "file://*/*"]
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
      process.env.TARGET !== "firefox"
        ? {
            extension_pages:
              "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
          }
        : ("script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob:; object-src 'self'; worker-src 'self' blob:;" as any),
    permissions:
      process.env.TARGET === "firefox"
        ? firefoxMV2Permissions
        : chromeMV3Permissions
  }
}) as any
