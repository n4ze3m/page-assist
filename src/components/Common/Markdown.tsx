import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import remarkGfm from "remark-gfm"
import { nightOwl } from "react-syntax-highlighter/dist/cjs/styles/prism"
import remarkMath from "remark-math"
import ReactMarkdown from "react-markdown"
import "property-information"
import React from "react"
import { Tooltip } from "antd"
import { CheckIcon, ClipboardIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function Markdown({ message }: { message: string }) {
  const [isBtnPressed, setIsBtnPressed] = React.useState(false)
  const { t } = useTranslation("common")
  return (
    <React.Fragment>
      <ReactMarkdown
        className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark"
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            return !inline ? (
              <div className="code relative text-base bg-gray-800 rounded-md overflow-hidden">
                <div className="flex items-center justify-between py-1.5 px-4">
                  <span className="text-xs lowercase text-gray-200">
                    {className && className.replace("language-", "")}
                  </span>

                  <div className="flex items-center">
                    <Tooltip title={t("copyToClipboard")}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(children[0] as string)
                          setIsBtnPressed(true)
                          setTimeout(() => {
                            setIsBtnPressed(false)
                          }, 4000)
                        }}
                        className="flex gap-1.5 items-center rounded bg-none p-1 text-xs text-gray-200 hover:bg-gray-700 hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-100">
                        {!isBtnPressed ? (
                          <ClipboardIcon className="h-4 w-4" />
                        ) : (
                          <CheckIcon className="h-4 w-4 text-green-400" />
                        )}
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <SyntaxHighlighter
                  {...props}
                  children={String(children).replace(/\n$/, "")}
                  style={nightOwl}
                  key={Math.random()}
                  customStyle={{
                    margin: 0,
                    fontSize: "1rem",
                    lineHeight: "1.5rem"
                  }}
                  language={(match && match[1]) || ""}
                  codeTagProps={{
                    className: "text-sm"
                  }}
                />
              </div>
            ) : (
              <code className={`${className} font-semibold`} {...props}>
                {children}
              </code>
            )
          },
          a({ node, ...props }) {
            return (
              <a
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 text-sm hover:underline"
                {...props}>
                {props.children}
              </a>
            )
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          }
        }}>
        {message}
      </ReactMarkdown>
    </React.Fragment>
  )
}
