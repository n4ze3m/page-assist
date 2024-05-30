import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import ReactMarkdown, { Options } from "react-markdown"

import "property-information"
import React from "react"
import { Tooltip } from "antd"
import { CheckIcon, ClipboardIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FC, memo } from "react"
import { CodeBlock } from "./CodeBlock"

export const MemoizedReactMarkdown: FC<Options> = memo(
  ReactMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className
)

export default function Markdown({ message }: { message: string }) {

  return (
    <React.Fragment>
      <MemoizedReactMarkdown
        className="prose break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark"
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            return !inline ? (
            <CodeBlock
              language={match ? match[1] : ""}
              value={String(children).replace(/\n$/, "")}
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
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          }
        }}>
        {message}
      </MemoizedReactMarkdown>
    </React.Fragment>
  )
}
