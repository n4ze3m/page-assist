export function isPlaceholderApiKey(key?: string | null): boolean {
  if (!key) return false
  const normalized = String(key).trim()
  if (!normalized) return false
  return normalized.toUpperCase().includes("REPLACE-ME")
}

