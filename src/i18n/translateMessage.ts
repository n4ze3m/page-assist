type Translator = (key: string, options?: Record<string, unknown>) => string

export const translateMessage = (
  t: Translator,
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>
): string => {
  return t(key, { defaultValue, ...(options || {}) })
}
