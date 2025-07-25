const tags = ["think", "reason", "reasoning", "thought", "tool_run"]

export function parseReasoning(text: string): {
  type: "reasoning" | "text" | "tool_run"
  content: string
  reasoning_running?: boolean
  tool_running?: boolean
  duration?: number
}[] {
  try {
    const result: {
      type: "reasoning" | "text" | "tool_run"
      content: string
      reasoning_running?: boolean
      tool_running?: boolean
      duration?: number
    }[] = []

    const tagPattern = new RegExp(`<(${tags.join("|")})>`, "i")

    // Update close tag pattern to capture optional duration.
    const closeTagPattern = new RegExp(`</(${tags.join("|")})(?:\\s+duration="(\\d+)")?>`, "i")

    let currentIndex = 0

    // Enhance the state from a boolean to a variable storing the current block type.
    let currentBlockType: "reasoning" | "tool_run" | null = null

    while (currentIndex < text.length) {
      const openTagMatch = text.slice(currentIndex).match(tagPattern)
      const closeTagMatch = text.slice(currentIndex).match(closeTagPattern)

      // If we are NOT in a block and we find an opening tag...
      if (!currentBlockType && openTagMatch) {
        const beforeText = text.slice(
          currentIndex,
          currentIndex + openTagMatch.index
        )
        if (beforeText.trim()) {
          result.push({ type: "text", content: beforeText.trim() })
        }

        // Set the state to the type of tag we found.
        const tagName = openTagMatch[1].toLowerCase()
        currentBlockType = tagName === 'tool_run' ? 'tool_run' : 'reasoning'
        
        currentIndex += openTagMatch.index! + openTagMatch[0].length
        continue
      }

      // If we ARE in a block and we find a closing tag...
      if (currentBlockType && closeTagMatch) {
        const blockContent = text.slice(
          currentIndex,
          currentIndex + closeTagMatch.index
        )
        if (blockContent.trim()) {
          // Push the content with the correct type and extract duration if it exists.
          const duration = closeTagMatch[2] ? parseInt(closeTagMatch[2], 10) : undefined
          result.push({ 
            type: currentBlockType, 
            content: blockContent.trim(),
            // We inly add the duration property for tool_run blocks
            duration: currentBlockType === 'tool_run' ? duration : undefined
          })
        }

        // Reset state
        currentBlockType = null
        currentIndex += closeTagMatch.index! + closeTagMatch[0].length
        continue
      }

      // If we reach the end of the string...
      if (currentIndex < text.length) {
        const remainingText = text.slice(currentIndex)
        // Handle unterminated blocks correctly using the new state variable.
        result.push({
          type: currentBlockType ? currentBlockType : "text",
          content: remainingText.trim(),
          reasoning_running: currentBlockType === 'reasoning',
          tool_running: currentBlockType === 'tool_run'
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