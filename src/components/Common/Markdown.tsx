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

type StreamingMaskParagraphProps = {
  children: React.ReactNode
  showMask: boolean
  shiftCh: number
  tick?: number
}

const StreamingMaskParagraph = ({
  children,
  showMask,
  shiftCh,
  tick
}: StreamingMaskParagraphProps) => {
  const paragraphRef = React.useRef<HTMLParagraphElement | null>(null)
  const anchorRef = React.useRef<HTMLSpanElement | null>(null)
  const chWidthRef = React.useRef<number | null>(null)

  React.useLayoutEffect(() => {
    if (!showMask) return
    const paragraph = paragraphRef.current
    const anchor = anchorRef.current
    if (!paragraph || !anchor) return

    if (chWidthRef.current == null) {
      const measure = document.createElement("span")
      measure.textContent = "0"
      measure.style.visibility = "hidden"
      measure.style.position = "absolute"
      measure.style.whiteSpace = "pre"
      paragraph.appendChild(measure)
      chWidthRef.current = measure.getBoundingClientRect().width
      paragraph.removeChild(measure)
    }

    const chWidth = chWidthRef.current || 0
    const shift = shiftCh * chWidth
    const paragraphRect = paragraph.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const anchorX = anchorRect.left - paragraphRect.left
    const maskWidth = paragraphRect.width * 0.75
    const maskStart = Math.max(anchorX + shift - maskWidth, 0)
    const computedLineHeight = Number.parseFloat(
      window.getComputedStyle(paragraph).lineHeight
    )
    const lineHeight = Number.isFinite(computedLineHeight)
      ? computedLineHeight
      : paragraphRect.height

    paragraph.style.setProperty("--stream-mask-start", `${maskStart}px`)
    paragraph.style.setProperty("--stream-mask-width", `${maskWidth}px`)
    paragraph.style.setProperty("--stream-mask-line-height", `${lineHeight}px`)
  }, [showMask, shiftCh, tick])

  return (
    <p
      ref={paragraphRef}
      className={`mb-2 last:mb-0 ${showMask ? "streaming-mask" : ""}`}>
      {children}
      {showMask ? (
        <span ref={anchorRef} className="streaming-mask-anchor" />
      ) : null}
    </p>
  )
}

function Markdown({
  message,
  className = "prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark",
  showStreamingTail = false,
  streamingTailShiftCh = 8,
  streamingTailTick
}: {
  message: string
  className?: string
  showStreamingTail?: boolean
  streamingTailShiftCh?: number
  streamingTailTick?: number
}) {
  const [checkWideMode] = useStorage("checkWideMode", false)
  if (checkWideMode) {
    className += " max-w-none"
  }
  message = preprocessLaTeX(message)
  const trimmedMessage = message.trimEnd()
  const lastParagraphOffset = trimmedMessage.length
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
          table({ children }) {
            return <TableBlock>{children}</TableBlock>
          },
          p({ node, children }) {
            const paragraphEnd = node?.position?.end?.offset ?? 0
            const isLastParagraph =
              showStreamingTail && paragraphEnd >= lastParagraphOffset - 1
            return (
              <StreamingMaskParagraph
                showMask={isLastParagraph}
                shiftCh={streamingTailShiftCh}
                tick={streamingTailTick}>
                {children}
              </StreamingMaskParagraph>
            )
          }
        }}>
        {message}
      </ReactMarkdown>
    </React.Fragment>
  )
}

export default Markdown
