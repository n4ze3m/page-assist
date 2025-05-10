import { programmingLanguages } from "@/utils/langauge-extension"
import { Tooltip, Modal, ConfigProvider, Button } from "antd"
import {
  CopyCheckIcon,
  CopyIcon,
  DownloadIcon,
  InfoIcon,
  ExternalLinkIcon
} from "lucide-react"
import { FC, useState, useRef } from "react"
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
  const { t } = useTranslation("common")
  const iframeRef = useRef<HTMLIFrameElement>(null)

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

  const handleOpenInNewTab = () => {
    const blob = new Blob([value], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  return (
    <>
      <div className="not-prose">
        <div className=" [&_div+div]:!mt-0 my-4 bg-zinc-950 rounded-xl">
          <div className="flex flex-row px-4 py-2 rounded-t-xl  bg-gray-800 ">
            <span className="font-mono text-xs">{language || "text"}</span>
          </div>
          <div className="sticky top-9 md:top-[5.75rem]">
            <div className="absolute bottom-0 right-2 flex h-9 items-center">
              {/* {language === "html" && (
                <Tooltip title={t("preview")}>
                  <button
                    onClick={() => setPreviewVisible(true)}
                    className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none">
                    <InfoIcon className="size-4" />
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
        <ConfigProvider
          theme={{
            components: {
              Modal: {
                contentBg: "#1e1e1e",
                headerBg: "#1e1e1e",
                titleColor: "#ffffff"
              }
            }
          }}>
          <Modal
            title={
              <div className="flex items-center text-white">
                <InfoIcon className="mr-2 size-5" />
                <span>HTML Preview</span>
              </div>
            }
            open={previewVisible}
            onCancel={handlePreviewClose}
            footer={
              <div className="flex justify-end gap-2">
                <Button
                  icon={<ExternalLinkIcon className="size-4" />}
                  onClick={handleOpenInNewTab}>
                  Open in new tab
                </Button>

                <Button
                  icon={<DownloadIcon className="size-4" />}
                  onClick={handleDownload}>
                  {t("downloadCode")}
                </Button>
              </div>
            }
            width={"80%"}
            zIndex={999999}
            centered
            styles={{
              body: {
                padding: 0,
                backgroundColor: "#f5f5f5",
                borderRadius: "0 0 8px 8px"
              },
              header: {
                borderBottom: "1px solid #333",
                padding: "12px 24px"
              },
              mask: {
                backdropFilter: "blur(4px)",
                backgroundColor: "rgba(0, 0, 0, 0.6)"
              },
              content: {
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
              }
            }}>
            <div className={`relative w-full h-[70vh] bg-white`}>
              <iframe
                ref={iframeRef}
                srcDoc={value}
                title="HTML Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </Modal>
        </ConfigProvider>
      )}
    </>
  )
}
