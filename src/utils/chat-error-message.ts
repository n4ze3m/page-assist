import i18n from "i18next"

export const TLDW_ERROR_BUBBLE_PREFIX = "__tldw_error__:"

export type ChatErrorPayload = {
  summary: string
  hint: string
  detail: string
}

export const encodeChatErrorPayload = (payload: ChatErrorPayload): string =>
  `${TLDW_ERROR_BUBBLE_PREFIX}${JSON.stringify(payload)}`

export const decodeChatErrorPayload = (
  message: string
): ChatErrorPayload | null => {
  if (!message || !message.startsWith(TLDW_ERROR_BUBBLE_PREFIX)) {
    return null
  }
  const raw = message.slice(TLDW_ERROR_BUBBLE_PREFIX.length)
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.summary !== "string" || typeof parsed.hint !== "string") {
      return null
    }
    return {
      summary: parsed.summary,
      hint: parsed.hint,
      detail: typeof parsed.detail === "string" ? parsed.detail : ""
    }
  } catch {
    return null
  }
}

export const buildFriendlyErrorMessage = (rawError: string): string => {
  const detail = String(rawError || "Request failed")
  const lower = detail.toLowerCase()

  let summary: string
  let hint: string

  if (lower.includes("invalid x-api-key")) {
    summary = i18n.t(
      "common:error.friendlyApiKeySummary",
      "We couldn’t reach your tldw server."
    )
    hint = i18n.t(
      "common:error.friendlyApiKeyHint",
      "Your API key may be invalid. Open Settings → tldw server to check your URL and API key, then try again."
    )
  } else if (lower.includes("stream timeout: no updates received")) {
    summary = i18n.t(
      "common:error.friendlyTimeoutSummary",
      "Your chat timed out."
    )
    hint = i18n.t(
      "common:error.friendlyTimeoutHint",
      "The server stopped streaming responses. Try again, or open Health & diagnostics to check server status."
    )
  } else {
    summary = i18n.t(
      "common:error.friendlyGenericSummary",
      "Something went wrong while talking to your tldw server."
    )
    hint = i18n.t(
      "common:error.friendlyGenericHint",
      "Try again in a moment, or open Health & diagnostics to inspect server health."
    )
  }

  return encodeChatErrorPayload({
    summary,
    hint,
    detail
  })
}
