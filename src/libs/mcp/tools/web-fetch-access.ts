export const WEB_FETCH_TOOL_NAME = "page_assist_web_fetch"

export type WebFetchAccess = "public" | "private" | "blocked"

const PRIVATE_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".home.arpa"
]

const parseIpv4 = (hostname: string): number[] | null => {
  const parts = hostname.split(".")
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) {
    return null
  }
  const octets = parts.map(Number)
  return octets.every((octet) => octet <= 255) ? octets : null
}

const isPrivateIpv4 = ([a, b, c]: number[]) =>
  a === 0 ||
  a === 10 ||
  a === 127 ||
  a >= 224 ||
  (a === 100 && b >= 64 && b <= 127) ||
  (a === 169 && b === 254) ||
  (a === 172 && b >= 16 && b <= 31) ||
  (a === 192 && b === 0 && (c === 0 || c === 2)) ||
  (a === 192 && b === 168) ||
  (a === 198 && (b === 18 || b === 19)) ||
  (a === 198 && b === 51 && c === 100) ||
  (a === 203 && b === 0 && c === 113)

const expandIpv6 = (address: string): number[] => {
  const [head, tail] = address.split("::")
  const headParts = head ? head.split(":") : []
  const tailParts = tail ? tail.split(":") : []
  const missing = address.includes("::")
    ? 8 - headParts.length - tailParts.length
    : 0
  return [
    ...headParts,
    ...Array<string>(missing).fill("0"),
    ...tailParts
  ].map((part) => parseInt(part, 16))
}

const ipv4FromWords = (high: number, low: number) => [
  high >> 8,
  high & 0xff,
  low >> 8,
  low & 0xff
]

const isPrivateIpv6 = (address: string) => {
  const words = expandIpv6(address)
  const [w0, w1, w2] = words
  const leadingZeros = words.findIndex((word) => word !== 0)
  const zeroPrefix = (count: number) =>
    leadingZeros === -1 || leadingZeros >= count

  // Unspecified, loopback and IPv4-compatible addresses all embed an IPv4
  // address in the last two words, so the IPv4 ranges cover them.
  if (zeroPrefix(6) || (zeroPrefix(5) && words[5] === 0xffff)) {
    return isPrivateIpv4(ipv4FromWords(words[6], words[7]))
  }
  // NAT64 (64:ff9b::/96)
  if (w0 === 0x64 && w1 === 0xff9b) {
    return isPrivateIpv4(ipv4FromWords(words[6], words[7]))
  }
  // 6to4 (2002::/16)
  if (w0 === 0x2002) {
    return isPrivateIpv4(ipv4FromWords(w1, w2))
  }
  return (
    (w0 & 0xfe00) === 0xfc00 || // unique local
    (w0 & 0xffc0) === 0xfe80 || // link local
    (w0 & 0xffc0) === 0xfec0 || // site local
    (w0 & 0xff00) === 0xff00 || // multicast
    (w0 === 0x2001 && w1 === 0xdb8) // documentation
  )
}

const isPrivateHostname = (rawHostname: string) => {
  const hostname = rawHostname.toLowerCase().replace(/\.$/, "")

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return isPrivateIpv6(hostname.slice(1, -1))
  }

  const ipv4 = parseIpv4(hostname)
  if (ipv4) {
    return isPrivateIpv4(ipv4)
  }

  // Single-label names only resolve on the local network.
  return (
    !hostname.includes(".") ||
    PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  )
}

/**
 * Classifies a URL from its text alone. A public hostname that resolves to a
 * private address (DNS rebinding) cannot be detected here, because extensions
 * have no way to see the resolved IP before a fetch.
 */
export const getWebFetchAccess = (url: string): WebFetchAccess => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return "blocked"
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "blocked"
  }

  return isPrivateHostname(parsed.hostname) ? "private" : "public"
}

/** Returns the URL when these tool arguments ask for a private address. */
export const getPrivateWebFetchUrl = (args: unknown): string | undefined => {
  const url = (args as { url?: unknown } | null | undefined)?.url
  return typeof url === "string" && getWebFetchAccess(url) === "private"
    ? url
    : undefined
}

/**
 * Decides whether content may be read after redirects. A private destination
 * is only accepted when the user approved the requested URL and the redirect
 * stayed on the same origin.
 */
export const isWebFetchRedirectAllowed = (
  requestedUrl: string,
  finalUrl: string,
  approvedPrivateUrls: ReadonlySet<string>
) => {
  const access = getWebFetchAccess(finalUrl)
  if (access !== "private") {
    return access === "public"
  }
  return (
    approvedPrivateUrls.has(requestedUrl) &&
    new URL(requestedUrl).origin === new URL(finalUrl).origin
  )
}
