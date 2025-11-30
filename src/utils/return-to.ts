const RETURN_TO_KEY = "tldw:returnTo"

export type ReturnToTarget =
  | "/notes"
  | "/review"
  | "/media"
  | "/flashcards"

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
    if (
      raw === "/notes" ||
      raw === "/review" ||
      raw === "/media" ||
      raw === "/flashcards"
    ) {
      return raw
    }
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

