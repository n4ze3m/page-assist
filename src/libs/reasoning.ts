const tags = ["think", "reason", "reasoning", "thought"]
export function parseReasoning(text: string): {
  type: "reasoning" | "text"
  content: string
  reasoning_running?: boolean
}[] {
  try {
    const result: {
      type: "reasoning" | "text"
      content: string
      reasoning_running?: boolean
    }[] = []
    const tagPattern = new RegExp(`<(${tags.join("|")})>`, "i")
    const closeTagPattern = new RegExp(`</(${tags.join("|")})>`, "i")

    let currentIndex = 0
    let isReasoning = false

    while (currentIndex < text.length) {
      const openTagMatch = text.slice(currentIndex).match(tagPattern)
      const closeTagMatch = text.slice(currentIndex).match(closeTagPattern)

      if (!isReasoning && openTagMatch) {
        const beforeText = text.slice(
          currentIndex,
          currentIndex + openTagMatch.index
        )
        if (beforeText.trim()) {
          result.push({ type: "text", content: beforeText.trim() })
        }

        isReasoning = true
        currentIndex += openTagMatch.index! + openTagMatch[0].length
        continue
      }

      if (isReasoning && closeTagMatch) {
        const reasoningContent = text.slice(
          currentIndex,
          currentIndex + closeTagMatch.index
        )
        if (reasoningContent.trim()) {
          result.push({ type: "reasoning", content: reasoningContent.trim() })
        }

        isReasoning = false
        currentIndex += closeTagMatch.index! + closeTagMatch[0].length
        continue
      }

      if (currentIndex < text.length) {
        const remainingText = text.slice(currentIndex)
        result.push({
          type: isReasoning ? "reasoning" : "text",
          content: remainingText.trim(),
          reasoning_running: isReasoning
        })
        break
      }
    }

    return result
  } catch (e) {
    console.error(`Error parsing reasoning: ${e}`)
    return [
      {
        type: "text",
        content: text
      }
    ]
  }
}

export function isReasoningStarted(text: string): boolean {
  const tagPattern = new RegExp(`<(${tags.join("|")})>`, "i")
  return tagPattern.test(text)
}

export function isReasoningEnded(text: string): boolean {
  const closeTagPattern = new RegExp(`</(${tags.join("|")})>`, "i")
  return closeTagPattern.test(text)
}

export function removeReasoning(text: string): string {
  const tagPattern = new RegExp(
    `<(${tags.join("|")})>.*?</(${tags.join("|")})>`,
    "gis"
  )
  return text.replace(tagPattern, "").trim()
}
export function mergeReasoningContent(
  originalText: string,
  reasoning: string
): string {
  const reasoningTag = "<think>"

  originalText = originalText.replace(reasoningTag, "")

  return `${reasoningTag}${originalText + reasoning}`
}

export function replaceThinkTagToEM(text: string): string {
  const tagPattern = new RegExp(
    `<(${tags.join("|")})>.*?</(${tags.join("|")})>`,
    "gis"
  )
  const emStyle = "font-style: italic; font-size: 0.9em; margin-bottom: 1em;"
  return text
    .replace(tagPattern, (match) => {
      return `<em style="${emStyle}">${match.replace(/<(\/)?(${tags.join("|")})>/gi, "")}</em>\n\n`
    })
    .replaceAll("<think>", "")
    .replaceAll("</think>", "")
}
