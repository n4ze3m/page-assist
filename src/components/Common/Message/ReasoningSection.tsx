import React from "react"
import { Collapse } from "antd"
import { Brain } from "lucide-react"
import { useTranslation } from "react-i18next"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

const { Panel } = Collapse

interface ReasoningSectionProps {
  reasoning: string
  reasoningTime?: number
}

export const ReasoningSection: React.FC<ReasoningSectionProps> = ({
  reasoning,
  reasoningTime
}) => {
  const { t } = useTranslation("common")

  if (!reasoning || reasoning.trim().length === 0) {
    return null
  }

  const formatTime = (seconds: number) => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`
    } else if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    } else {
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${minutes}m ${secs.toFixed(0)}s`
    }
  }

  return (
    <div className="mb-4">
      <Collapse
        defaultActiveKey={[]}
        ghost
        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-[#404040]">
        <Panel
          header={
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {t("reasoning.title")}
              </span>
              {reasoningTime && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({formatTime(reasoningTime)})
                </span>
              )}
            </div>
          }
          key="1"
          className="reasoning-panel">
          <div className="text-sm text-gray-600 dark:text-gray-400 italic prose dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "")
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark as any}
                      language={match[1]}
                      PreTag="div"
                      {...props}>
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}>
              {reasoning}
            </ReactMarkdown>
          </div>
        </Panel>
      </Collapse>
    </div>
  )
}
