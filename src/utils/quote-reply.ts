export const normalizeQuoteText = (text: string) =>
  text.replace(/\r\n?/g, "\n").trim()

/**
 * Builds the outgoing message for a "reply to selection": the quoted text as
 * a markdown blockquote, a blank line, then the user's own message.
 */
export const formatQuotedReply = (quote: string | null, message: string) => {
  const cleanQuote = quote ? normalizeQuoteText(quote) : ""
  const cleanMessage = message.trim()

  if (!cleanQuote) {
    return cleanMessage
  }

  const blockquote = cleanQuote
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")

  return cleanMessage ? `${blockquote}\n\n${cleanMessage}` : blockquote
}
