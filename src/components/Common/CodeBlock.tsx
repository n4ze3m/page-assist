import { programmingLanguages } from "@/utils/langauge-extension"
import { Tooltip } from "antd"
import {
  CopyCheckIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  CodeIcon
} from "lucide-react"
import { FC, useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
// import Mermaid from "./Mermaid"

interface Props {
  language: string
  value: string
}

export const CodeBlock: FC<Props> = ({ language, value }) => {
  const [isBtnPressed, setIsBtnPressed] = useState(false)
  const [previewValue, setPreviewValue] = useState(value)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const computeKey = () => {
    const base = `${language}::${value?.slice(0, 200)}`
    let hash = 0
    for (let i = 0; i < base.length; i++) {
      hash = (hash * 31 + base.charCodeAt(i)) >>> 0
    }
    return hash.toString(36)
  }
  const keyRef = useRef<string>(computeKey())
  const mapRef = useRef<Map<string, boolean> | null>(null)
  if (!mapRef.current) {
    if (typeof window !== "undefined") {
      // @ts-ignore
      if (!window.__codeBlockPreviewState) {
        // @ts-ignore
        window.__codeBlockPreviewState = new Map()
      }
      // @ts-ignore
      mapRef.current = window.__codeBlockPreviewState as Map<string, boolean>
    } else {
      mapRef.current = new Map()
    }
  }
  const globalStateMap = mapRef.current!
  const [showPreview, setShowPreview] = useState<boolean>(
    () => globalStateMap.get(keyRef.current) || false
  )
  const { t } = useTranslation("common")

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setIsBtnPressed(true)
    setTimeout(() => {
      setIsBtnPressed(false)
    }, 4000)
  }

  const isPreviewable = ["html", "svg", "xml", "mathml"].includes(
    (language || "").toLowerCase()
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
    if ((language || "").toLowerCase() === "mathml") {
      const hasMathTag = /<math[\s>]/i.test(code)
      let mathMarkup = hasMathTag
        ? code
        : `<math xmlns='http://www.w3.org/1998/Math/MathML'>${code}</math>`

      return `<!doctype html><html><head><meta charset='utf-8'/><style>html,body{margin:0;padding:20px;background:#fff;font-family:serif;line-height:1.5;display:flex;align-items:center;justify-content:center;min-height:100vh;}math{font-size:1.5em;}</style></head><body>${mathMarkup}</body></html>`
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
    globalStateMap.set(keyRef.current, showPreview)
  }, [showPreview])

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
      if (globalStateMap.has(newKey)) {
        const prev = globalStateMap.get(newKey)!
        if (prev !== showPreview) setShowPreview(prev)
      }
    }
  }, [language, value])

  useEffect(() => {
    if (!isPreviewable && showPreview) setShowPreview(false)
  }, [isPreviewable])

  return (
    <>
      <div className="not-prose">
        <div className=" [&_div+div]:!mt-0 my-4 bg-zinc-950 rounded-xl">
          <div className="flex flex-row px-4 py-2 rounded-t-xl  gap-3 bg-[#2a2a2a]  ">
            {isPreviewable && (
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

            <span className="font-mono text-xs text-white  ">{language || "text"}</span>
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

          {!showPreview && (
            <SyntaxHighlighter
              language={language}
              style={coldarkDark}
              PreTag="div"
              customStyle={{
                margin: 0,
                width: "100%",
                background: "transparent",
                padding: "1.5rem 1rem"
              }}
              lineNumberStyle={{
                userSelect: "none"
              }}
              codeTagProps={{
                style: {
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-mono)"
                }
              }}>
              {value}
            </SyntaxHighlighter>
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
        </div>
      </div>
    </>
  )
}
