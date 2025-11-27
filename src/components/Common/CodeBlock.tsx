import { programmingLanguages } from "@/utils/langauge-extension"
import { Tooltip } from "antd"
import {
  CopyCheckIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  CodeIcon,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { FC, useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useStorage } from "@plasmohq/storage/hook"
import { Highlight, themes } from "prism-react-renderer"
// import Mermaid from "./Mermaid"

interface Props {
  language: string
  value: string
  blockIndex?: number
}

const normalizeLanguage = (language: string): string => {
  const lang = (language || "").toLowerCase()
  if (lang === "js" || lang === "jsx") return "javascript"
  if (lang === "ts" || lang === "tsx") return "typescript"
  if (lang === "sh" || lang === "bash") return "bash"
  if (lang === "py") return "python"
  if (lang === "md" || lang === "markdown") return "markdown"
  if (lang === "yml") return "yaml"
  if (!lang) return "plaintext"
  return lang
}

export const CodeBlock: FC<Props> = ({ language, value, blockIndex }) => {
  const [isBtnPressed, setIsBtnPressed] = useState(false)
  const [previewValue, setPreviewValue] = useState(value)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const normalizedLanguage = normalizeLanguage(language)
  const lines = value ? value.split(/\r?\n/) : []
  const totalLines = lines.length
  const isLong = totalLines > 15
  const [codeTheme] = useStorage("codeTheme", "auto")
  
  const computeKey = () => {
    const base =
      typeof blockIndex === "number"
        ? `${normalizedLanguage}::${blockIndex}`
        : `${normalizedLanguage}::${value?.slice(0, 200)}`
    let hash = 0
    for (let i = 0; i < base.length; i++) {
      hash = (hash * 31 + base.charCodeAt(i)) >>> 0
    }
    return hash.toString(36)
  }
  const keyRef = useRef<string>(computeKey())
  const previewMapRef = useRef<Map<string, boolean> | null>(null)
  const collapsedMapRef = useRef<Map<string, boolean> | null>(null)

  if (!previewMapRef.current) {
    if (typeof window !== "undefined") {
      const win = window as any
      if (!win.__codeBlockPreviewState) {
        win.__codeBlockPreviewState = new Map<string, boolean>()
      }
      previewMapRef.current =
        win.__codeBlockPreviewState as Map<string, boolean>
    } else {
      previewMapRef.current = new Map()
    }
  }

  if (!collapsedMapRef.current) {
    if (typeof window !== "undefined") {
      const win = window as any
      if (!win.__codeBlockCollapsedState) {
        win.__codeBlockCollapsedState = new Map<string, boolean>()
      }
      collapsedMapRef.current =
        win.__codeBlockCollapsedState as Map<string, boolean>
    } else {
      collapsedMapRef.current = new Map()
    }
  }

  const previewStateMap = previewMapRef.current!
  const collapsedStateMap = collapsedMapRef.current!

  const [showPreview, setShowPreview] = useState<boolean>(() => {
    return previewStateMap.get(keyRef.current) || false
  })

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const stored = collapsedStateMap.get(keyRef.current)
    if (typeof stored === "boolean") return stored
    return isLong
  })
  const { t } = useTranslation("common")
  const resolveTheme = (key: string) => {
    if (key === "auto") {
      let isDark = false
      try {
        if (typeof document !== "undefined") {
          const root = document.documentElement
          if (root.classList.contains("dark")) {
            isDark = true
          } else if (root.classList.contains("light")) {
            isDark = false
          } else if (typeof window !== "undefined") {
            isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
          }
        }
      } catch {
        isDark = false
      }
      return isDark ? themes.dracula : themes.github
    }
    switch (key) {
      case "github":
        return themes.github
      case "nightOwl":
        return themes.nightOwl
      case "nightOwlLight":
        return themes.nightOwlLight
      case "vsDark":
        return themes.vsDark
      case "dracula":
      default:
        return themes.dracula
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setIsBtnPressed(true)
    setTimeout(() => {
      setIsBtnPressed(false)
    }, 4000)
  }

  const isPreviewable = ["html", "svg", "xml"].includes(
    normalizedLanguage
  )

  const buildPreviewDoc = useCallback(() => {
    const code = previewValue || ""
    if ((language || "").toLowerCase() === "svg") {
      const hasSvgTag = /<svg[\s>]/i.test(code)
      let svgMarkup = hasSvgTag
        ? code
        : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>${code}</svg>`
      
      const hasWidthHeight = /\s(width|height)\s*=/.test(svgMarkup)
      
      if (!hasWidthHeight && hasSvgTag) {
        svgMarkup = svgMarkup.replace(
          /<svg([^>]*?)>/i,
          '<svg$1 width="100%" height="100%" style="max-width: 100%; max-height: 100%;">'
        )
      }
      
      return `<!doctype html><html><head><meta charset='utf-8'/><style>html,body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:#fff;height:100%;overflow:hidden;}svg{max-width:100%;max-height:100%;}</style></head><body>${svgMarkup}</body></html>`
    }
    return `<!doctype html><html><head><meta charset='utf-8'/></head><body>${code}</body></html>`
  }, [previewValue, language])

  const handleDownload = () => {
    const blob = new Blob([value], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `code_${new Date().toISOString().replace(/[:.]/g, "-")}.${programmingLanguages[language] || language}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    previewStateMap.set(keyRef.current, showPreview)
  }, [showPreview, previewStateMap, keyRef])

  useEffect(() => {
    collapsedStateMap.set(keyRef.current, collapsed)
  }, [collapsed, collapsedStateMap, keyRef])

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setPreviewValue(value)
    }, 300) 
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [value])

  useEffect(() => {
    const newKey = computeKey()
    if (newKey !== keyRef.current) {
      keyRef.current = newKey
      if (previewStateMap.has(newKey)) {
        const prev = previewStateMap.get(newKey)!
        if (prev !== showPreview) setShowPreview(prev)
      }
      if (collapsedStateMap.has(newKey)) {
        const prevCollapsed = collapsedStateMap.get(newKey)!
        if (prevCollapsed !== collapsed) setCollapsed(prevCollapsed)
      }
    }
  }, [normalizedLanguage, value, blockIndex, previewStateMap, collapsedStateMap])

  useEffect(() => {
    if (!isPreviewable && showPreview) setShowPreview(false)
  }, [isPreviewable])

  return (
    <>
      <div className="not-prose">
        <div className=" [&_div+div]:!mt-0 my-4 bg-zinc-950 rounded-xl">
          <div className="flex flex-row px-4 py-2 rounded-t-xl gap-3 bg-gray-800 items-center justify-between">
            <div className="flex items-center gap-3">
              {isPreviewable && !collapsed && (
                <div className="flex rounded-md overflow-hidden border border-gray-700">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`px-2 flex items-center gap-1 text-xs transition-colors ${
                      !showPreview
                        ? "bg-gray-700 text-white"
                        : "bg-transparent text-gray-300 hover:bg-gray-700/60"
                    }`}
                    aria-label={t("showCode") || "Code"}>
                    <CodeIcon className="size-3" />
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className={`px-2 flex items-center gap-1 text-xs transition-colors ${
                      showPreview
                        ? "bg-gray-700 text-white"
                        : "bg-transparent text-gray-300 hover:bg-gray-700/60"
                    }`}
                    aria-label={t("preview") || "Preview"}>
                    <EyeIcon className="size-3" />
                  </button>
                </div>
              )}

              <span className="font-mono text-xs">
                {normalizedLanguage || "text"}
              </span>
              {isLong && (
                <span className="text-[10px] text-gray-300">
                  {totalLines} {t("lines", "lines")}
                </span>
              )}
            </div>
            {isLong && (
              <button
                onClick={() => setCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] text-gray-200 hover:text-white">
                {collapsed ? (
                  <>
                    <ChevronDown className="size-3" />
                    <span>{t("expand", "Expand")}</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="size-3" />
                    <span>{t("collapse", "Collapse")}</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="sticky top-9 md:top-[5.75rem]">
            <div className="absolute bottom-0 right-2 flex h-9 items-center gap-1">
              <Tooltip title={t("downloadCode")}>
                <button
                  onClick={handleDownload}
                  className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none">
                  <DownloadIcon className="size-4" />
                </button>
              </Tooltip>
              <Tooltip title={t("copyToClipboard")}>
                <button
                  onClick={handleCopy}
                  className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none">
                  {!isBtnPressed ? (
                    <CopyIcon className="size-4" />
                  ) : (
                    <CopyCheckIcon className="size-4 text-green-400" />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>

          {collapsed ? (
            <div className="relative px-4 py-3">
              <pre className="text-xs font-mono text-gray-100 max-h-36 overflow-hidden whitespace-pre-wrap">
                {lines.slice(0, 3).join("\n")}
                {totalLines > 3 ? "…" : ""}
              </pre>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent" />
            </div>
          ) : (
            <>
              {!showPreview && (
                <Highlight
                  code={value}
                  language={normalizedLanguage as any}
                  theme={resolveTheme(codeTheme || "dracula")}>
                  {({
                    className: highlightClassName,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps
                  }) => (
                    <pre
                      className={`${highlightClassName} m-0 w-full bg-transparent px-4 py-3 text-[0.9rem]`}
                      style={{
                        ...style,
                        fontFamily: "var(--font-mono)"
                      }}>
                      {tokens.map((line, i) => (
                        <div
                          key={i}
                          {...getLineProps({ line, key: i })}
                          className="table w-full">
                          <span className="table-cell select-none pr-4 text-right text-xs text-gray-500">
                            {i + 1}
                          </span>
                          <span className="table-cell whitespace-pre-wrap">
                            {line.map((token, key) => (
                              <span
                                key={key}
                                {...getTokenProps({ token, key })}
                              />
                            ))}
                          </span>
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              )}
              {showPreview && isPreviewable && (
                <div className="w-full h-[420px] bg-white rounded-b-xl overflow-hidden border-t border-gray-800">
                  <iframe
                    title="Preview"
                    srcDoc={buildPreviewDoc()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
