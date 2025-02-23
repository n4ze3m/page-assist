import { programmingLanguages } from "@/utils/langauge-extension"
import { Tooltip, Modal, ConfigProvider } from "antd"
import {
  CopyCheckIcon,
  CopyIcon,
  DownloadIcon,
  GanttChartIcon
} from "lucide-react"
import { FC, useState } from "react"
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
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewMermaidVisible, setPreviewMermaidVisible] = useState(false)
  const { t } = useTranslation("common")

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setIsBtnPressed(true)
    setTimeout(() => {
      setIsBtnPressed(false)
    }, 4000)
  }

  const handlePreviewClose = () => {
    setPreviewVisible(false)
  }

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

  // const handlePreviewMermaid = () => {
  //   setPreviewMermaidVisible(true)
  // }

  // const handlePreviewMermaidClose = () => {
  //   setPreviewMermaidVisible(false)
  // }

  return (
    <>
      <div className="not-prose">
        <div className=" [&_div+div]:!mt-0 my-4 bg-zinc-950 rounded-xl">
          <div className="flex flex-row px-4 py-2 rounded-t-xl  bg-gray-800 ">
            <span className="font-mono text-xs">{language || "text"}</span>
          </div>
          <div className="sticky top-9 md:top-[5.75rem]">
            <div className="absolute bottom-0 right-2 flex h-9 items-center">
              {/* {language === "mermaid" && (
                <Tooltip title={t("mermaid")}>
                  <button
                    onClick={handlePreviewMermaid}
                    className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none">
                    <GanttChartIcon className="size-4" />
                  </button>
                </Tooltip>
              )} */}
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

          {/* <div className="flex sticky bg-gray-800 items-center justify-between py-1.5 px-4">
          <span className="text-xs lowercase text-gray-200">{language}</span>
          <div className="flex items-center gap-2">
            <Tooltip title={t("downloadCode")}>
              <button
                onClick={handleDownload}
                className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none">
                <DownloadIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip title={t("copyToClipboard")}>
              <button
                onClick={handleCopy}
                className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none">
                {!isBtnPressed ? (
                  <ClipboardIcon className="h-4 w-4" />
                ) : (
                  <CheckIcon className="h-4 w-4 text-green-400" />
                )}
              </button>
            </Tooltip>
          </div>
        </div> */}
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
        </div>
      </div>
      {previewVisible && (
        <Modal
          open={previewVisible}
          onCancel={handlePreviewClose}
          footer={null}
          width="80%"
          zIndex={999999}
          centered
          styles={{
            body: {
              padding: 0
            }
          }}>
          <div className="relative  w-full h-[80vh]">
            <iframe
              srcDoc={value}
              title="HTML Preview"
              className="w-full h-full"
            />
          </div>
        </Modal>
      )}

      {/* motion: false ? because animation may cause rendering errors */}
      {/* There is few pref problem currently will be enable later */}
      {/* {previewMermaidVisible && (
        <ConfigProvider theme={{ token: { motion: false } }}>
          <Modal
            title="Mermaid Preview"
            open={previewMermaidVisible}
            onCancel={handlePreviewMermaidClose}
            footer={null}
            width="80%"
            zIndex={999999}
            centered
            styles={{
              body: {
                padding: 0
              }
            }}>
            <Mermaid code={value} />
          </Modal>
        </ConfigProvider>
      )} */}
    </>
  )
}
