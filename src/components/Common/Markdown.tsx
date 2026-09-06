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

// These must be defined once at module scope. react-markdown uses each
// renderer as the React element *type*, so recreating them on every render
// (e.g. inline in JSX) makes React unmount/remount every <p>, <code>, <a>
// and <table> on each streamed chunk — which destroys text selection while
// a response is streaming and re-highlights every code block per token.
const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex]

const markdownComponents: React.ComponentProps<
  typeof ReactMarkdown
>["components"] = {
  pre({ children }) {
    return children
  },
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "")
    return !inline ? (
      <CodeBlock
        language={match ? match[1] : ""}
        value={String(children).replace(/\n$/, "")}
      />
    ) : (
      <code dir="ltr" className={`${className} font-semibold`} {...props}>
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
  table({ children }) {
    return <TableBlock>{children}</TableBlock>
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0">{children}</p>
  }
}

function Markdown({
  message,
  className = "prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark"
}: {
  message: string
  className?: string
}) {
  const [checkWideMode] = useStorage("checkWideMode", false)
  if (checkWideMode) {
    className += " max-w-none"
  }
  message = preprocessLaTeX(message)
  return (
    <React.Fragment>
      <ReactMarkdown
        className={className}
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}>
        {message}
      </ReactMarkdown>
    </React.Fragment>
  )
}

export default Markdown
