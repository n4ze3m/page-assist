import React from "react"

const Markdown = React.lazy(() => import("@/components/Common/Markdown"))

export interface MarkdownPreviewProps {
  content: string
  className?: string
  size?: "xs" | "sm" | "base"
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = "",
  size = "sm"
}) => {
  const sizeClass =
    size === "xs" ? "prose-xs" : size === "sm" ? "prose-sm" : "prose"

  return (
    <React.Suspense
      fallback={<div className="whitespace-pre-wrap">{content}</div>}
    >
      <Markdown
        message={content}
        className={`${sizeClass} break-words dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 dark:prose-dark ${className}`}
      />
    </React.Suspense>
  )
}

export default MarkdownPreview

