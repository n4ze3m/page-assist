export type ChatMenuDensity = "comfortable" | "compact"

export interface ChatSettingsConfig {
  webUIResumeLastChat: boolean
  restoreLastChatModel: boolean
  hideCurrentChatModelSettings: boolean
  checkWideMode: boolean
  openReasoning: boolean
  userChatBubble: boolean
  autoCopyResponseToClipboard: boolean
  useMarkdownForUserMessage: boolean
  copyAsFormattedText: boolean
  menuDensity: ChatMenuDensity
  chatUserTextColor: string
  chatAssistantTextColor: string
  chatUserTextFont: string
  chatAssistantTextFont: string
  chatUserTextSize: "sm" | "md" | "lg"
  chatAssistantTextSize: "sm" | "md" | "lg"
}

export const DEFAULT_CHAT_SETTINGS: ChatSettingsConfig = {
  webUIResumeLastChat: false,
  restoreLastChatModel: false,
  hideCurrentChatModelSettings: false,
  checkWideMode: false,
  openReasoning: false,
  userChatBubble: true,
  autoCopyResponseToClipboard: false,
  useMarkdownForUserMessage: false,
  copyAsFormattedText: false,
  menuDensity: "comfortable",
  chatUserTextColor: "default",
  chatAssistantTextColor: "default",
  chatUserTextFont: "default",
  chatAssistantTextFont: "default",
  chatUserTextSize: "md",
  chatAssistantTextSize: "md"
}

