import { defineConfig } from "wxt"
import path from "path"
import react from "@vitejs/plugin-react"
import topLevelAwait from "vite-plugin-top-level-await"
import { parse } from "acorn"
import MagicString from "magic-string"
import { walk } from "estree-walker"
import type { Plugin } from "vite"

const isFirefox = process.env.TARGET === "firefox"

const safeInnerHTMLPlugin = (): Plugin => ({
  name: "sanitize-innerhtml",
  enforce: "post",
  renderChunk(code) {
    if (!code.includes("innerHTML")) return null

    const ast = parse(code, { ecmaVersion: "latest", sourceType: "module" }) as any
    const ms = new MagicString(code)
    let replaced = 0

    walk(ast as any, {
      enter(node: any) {
        if (
          node.type === "AssignmentExpression" &&
          node.operator === "=" &&
          node.left?.type === "MemberExpression"
        ) {
          const property = node.left.property
          const isInnerHTML =
            (!node.left.computed &&
              property?.type === "Identifier" &&
              property.name === "innerHTML") ||
            (node.left.computed &&
              ((property?.type === "Literal" && property.value === "innerHTML") ||
                (property?.type === "Identifier" && property.name === "innerHTML")))

          if (!isInnerHTML) return

          const target = code.slice(node.left.object.start, node.left.object.end)
          const value = code.slice(node.right.start, node.right.end)

          ms.overwrite(node.start, node.end, `__setSafeInnerHTML(${target}, ${value})`)
          replaced += 1
        }
      }
    })

    if (!replaced) return null

    const helper = `
const __setSafeInnerHTML = (el, html) => {
  if (!el) return;
  const doc = el.ownerDocument || document;
  const raw = html?.valueOf?.() ?? html ?? "";
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const range = doc.createRange();
  range.selectNodeContents(el);
  const markup =
    el.namespaceURI === "http://www.w3.org/2000/svg"
      ? "<svg xmlns=\\"http://www.w3.org/2000/svg\\">" + String(raw) + "</svg>"
      : String(raw);
  const fragment = range.createContextualFragment(markup);
  const target =
    el.namespaceURI === "http://www.w3.org/2000/svg" ? fragment.firstChild : fragment;
  if (!target) return;
  if (el.namespaceURI === "http://www.w3.org/2000/svg") {
    while (target.firstChild) {
      el.appendChild(target.firstChild);
    }
  } else {
    el.appendChild(target);
  }
};
`

    const strictMatch = code.match(/^(?:\\s*['"]use strict['"];?)/)
    const insertPos = strictMatch ? strictMatch[0].length : 0

    if (insertPos) {
      ms.appendLeft(insertPos, helper)
    } else {
      ms.prepend(helper)
    }

    return {
      code: ms.toString(),
      map: ms.generateMap({ hires: true })
    }
  }
})

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
      safeInnerHTMLPlugin(),
      topLevelAwait({
        promiseExportName: "__tla",
        promiseImportName: (i) => `__tla_${i}`
      }) as any
    ],
    // Ensure every entry (options, sidepanel, content scripts) shares a single React instance.
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
      alias: {
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "react/jsx-runtime": path.resolve(__dirname, "node_modules/react/jsx-runtime"),
        "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/react/jsx-dev-runtime")
      }
    },
    // Disable Hot Module Replacement so streaming connections aren't killed by dev reloads
    server: {
      hmr: false
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
    },
    build: {
      // Firefox MV2 validator chokes on modern ESM in chunks; downlevel and turn off module preload there.
      target: isFirefox ? "es2017" : "esnext",
      modulePreload: isFirefox ? false : undefined,
      rollupOptions: {
        external: ["langchain", "@langchain/community"],
        ...(isFirefox
          ? {
              output: {
                manualChunks: undefined
              }
            }
          : {})
      }
    }
  }),
  entrypointsDir:
    isFirefox ? "entries-firefox" : "entries",
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
            id: "tldw-assistant@tldw"
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
