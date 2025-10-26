export const convertMathDelimiters = (text: string): string => {
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, "$$\n$1\n$$")
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$")
  return text
}