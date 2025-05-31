import React from "react"

interface MentionHighlighterProps {
  value: string
  className?: string
  style?: React.CSSProperties
}

export const MentionHighlighter: React.FC<MentionHighlighterProps> = ({
  value,
  className = "",
  style = {}
}) => {
  const highlightMentions = (text: string) => {
    // Regular expression to match @mentions (starting with @ followed by non-space characters)
    const mentionRegex = /@([^\s@]+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        )
      }

      // Add the highlighted mention
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1 py-0.5 rounded font-medium"
        >
          {match[0]}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after the last mention
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      )
    }

    return parts.length > 0 ? parts : [<span key="empty">{text}</span>]
  }

  const renderTextWithLineBreaks = (text: string) => {
    const lines = text.split('\n')
    
    return lines.map((line, lineIndex) => (
      <React.Fragment key={lineIndex}>
        {highlightMentions(line)}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <div
      className={`pointer-events-none whitespace-pre-wrap break-words ${className}`}
      style={{
        ...style,
        wordWrap: 'break-word',
        overflowWrap: 'break-word'
      }}
      aria-hidden="true"
    >
      {renderTextWithLineBreaks(value)}
      {/* Add a space at the end to maintain cursor positioning */}
      <span>&nbsp;</span>
    </div>
  )
}
