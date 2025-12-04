export type ChatTextColorOption =
  | "default"
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red"

export type ChatTextFontOption = "default" | "sans" | "serif" | "mono"

export type ChatTextSizeOption = "sm" | "md" | "lg"

const CHAT_TEXT_COLOR_CLASS: Record<ChatTextColorOption, string> = {
  default: "",
  blue: "text-blue-700 dark:text-blue-300",
  green: "text-emerald-700 dark:text-emerald-300",
  purple: "text-purple-700 dark:text-purple-300",
  orange: "text-orange-700 dark:text-orange-300",
  red: "text-red-700 dark:text-red-300"
}

const CHAT_TEXT_FONT_CLASS: Record<ChatTextFontOption, string> = {
  default: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono"
}

const CHAT_TEXT_SIZE_CLASS: Record<ChatTextSizeOption, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg"
}

export const buildChatTextClass = (
  color: string,
  font: string,
  size: string
): string => {
  const normalizedColor =
    (color as ChatTextColorOption) in CHAT_TEXT_COLOR_CLASS ? (color as ChatTextColorOption) : "default"
  const normalizedFont =
    (font as ChatTextFontOption) in CHAT_TEXT_FONT_CLASS ? (font as ChatTextFontOption) : "default"
  const normalizedSize =
    (size as ChatTextSizeOption) in CHAT_TEXT_SIZE_CLASS ? (size as ChatTextSizeOption) : "md"

  const classes = [
    CHAT_TEXT_COLOR_CLASS[normalizedColor],
    CHAT_TEXT_FONT_CLASS[normalizedFont],
    CHAT_TEXT_SIZE_CLASS[normalizedSize]
  ]

  return classes.filter(Boolean).join(" ")
}

