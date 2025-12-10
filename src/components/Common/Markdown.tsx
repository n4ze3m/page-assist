import "katex/dist/katex.min.css"

import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"

import "property-information"
import React from "react"
import { CodeBlock } from "./CodeBlock"
import { TableBlock } from "./TableBlock"
import { preprocessLaTeX } from "@/utils/latex"
import { useStorage } from "@plasmohq/storage/hook"
import { highlightText } from "@/utils/text-highlight"

function Markdown({
  message,
  className = "prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark",
  searchQuery
}: {
  message: string
  className?: string
  searchQuery?: string
}) {
  const [checkWideMode] = useStorage("checkWideMode", false)
  const blockIndexRef = React.useRef(0)
  if (checkWideMode) {
    className += " max-w-none"
  }
  message = preprocessLaTeX(message)
  return (
    <React.Fragment>
      <ReactMarkdown
        className={className}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre({ children }) {
            return children
          },
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
             const blockIndex = blockIndexRef.current++
            return !inline ? (
              <CodeBlock
                language={match ? match[1] : ""}
                value={String(children).replace(/\n$/, "")}
                blockIndex={blockIndex}
              />
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
          table({ children,    }) {
            return <TableBlock>{children}</TableBlock>
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          // Apply search highlighting to text nodes
          text({ children }) {
            if (searchQuery && typeof children === "string") {
              return highlightText(children, searchQuery)
            }
            return <>{children}</>
          }
        }}>
        {message}
      </ReactMarkdown>
    </React.Fragment>
  )
}

export default Markdown
