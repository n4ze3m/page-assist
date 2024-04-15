export const cleanUnwantedUnicode = (text: string) => {
  const UNICODE_REGEX = /[\u200B-\u200D\uFEFF]/g
  return text.replace(UNICODE_REGEX, "").trim()
}
