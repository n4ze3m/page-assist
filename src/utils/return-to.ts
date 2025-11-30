const RETURN_TO_KEY = "tldw:returnTo"

const VALID_TARGETS = ["/notes", "/review", "/media", "/flashcards"] as const

export type ReturnToTarget = (typeof VALID_TARGETS)[number]

export const setReturnTo = (target: ReturnToTarget) => {
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.setItem(RETURN_TO_KEY, target)
  } catch {
    // ignore storage errors
  }
}

export const getReturnTo = (): ReturnToTarget | null => {
  try {
    if (typeof sessionStorage === "undefined") return null
    const raw = sessionStorage.getItem(RETURN_TO_KEY)
    if (!raw) return null
    if (VALID_TARGETS.includes(raw as ReturnToTarget)) {
      return raw as ReturnToTarget
    }
    // Invalid/legacy value: clear and ignore.
    sessionStorage.removeItem(RETURN_TO_KEY)
    return null
  } catch {
    return null
  }
}

export const clearReturnTo = () => {
  try {
    if (typeof sessionStorage === "undefined") return
    sessionStorage.removeItem(RETURN_TO_KEY)
  } catch {
    // ignore storage errors
  }
}
