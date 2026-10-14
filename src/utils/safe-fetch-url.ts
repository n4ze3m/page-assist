/**
 * Destination checks for agent-driven fetches (page_assist_web_fetch).
 * Hostname/literal checks only — browser extensions cannot cheaply verify
 * the resolved IP against DNS rebinding, so this is a first-line guard.
 */

const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "[0:0:0:0:0:0:0:1]"
])

const isIpv4 = (hostname: string): number[] | null => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (!m) return null
  const parts = m.slice(1).map((p) => Number(p))
  if (parts.some((n) => n > 255)) return null
  return parts
}

/** True when the hostname is loopback, link-local, RFC1918, or otherwise non-public. */
export const isPrivateOrReservedHost = (hostname: string): boolean => {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "")
  if (!host) return true
  if (LOOPBACK_HOSTS.has(host)) return true
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true
  }
  // Single-label hosts (e.g. "intranet") are almost never public internet targets.
  if (!host.includes(".") && !host.includes(":")) return true

  const v4 = isIpv4(host)
  if (v4) {
    const [a, b] = v4
    if (a === 0) return true // 0.0.0.0/8
    if (a === 10) return true // 10.0.0.0/8
    if (a === 127) return true // 127.0.0.0/8
    if (a === 169 && b === 254) return true // link-local / cloud IMDS
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
  }

  // IPv6 unique-local / link-local (only when the host looks like an address)
  if (host.includes(":")) {
    const bare = host.replace(/^\[|\]$/g, "")
    if (bare === "::1" || bare.startsWith("::ffff:127.")) return true
    if (bare.startsWith("fc") || bare.startsWith("fd")) return true // fc00::/7
    if (bare.startsWith("fe80")) return true // fe80::/10
  }

  return false
}

export type SafeFetchUrlResult =
  | { ok: true; url: URL }
  | { ok: false; reason: string }

/**
 * Accept only http(s) URLs whose host is not an obvious private/reserved target.
 */
export const assertSafeFetchUrl = (raw: string): SafeFetchUrlResult => {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false, reason: "Invalid URL." }
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: `Blocked scheme "${parsed.protocol}". Only http: and https: are allowed.`
    }
  }

  if (isPrivateOrReservedHost(parsed.hostname)) {
    return {
      ok: false,
      reason: `Blocked fetch to private or reserved host "${parsed.hostname}".`
    }
  }

  return { ok: true, url: parsed }
}
