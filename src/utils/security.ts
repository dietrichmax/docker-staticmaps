import logger from "./logger"

/**
 * Checks if a URL points to a private/internal network address.
 * Blocks: localhost, 127.x, ::1, 10.x, 172.16-31.x, 192.168.x,
 * 169.254.x, 0.x, .local, .internal, and non-HTTP(S) schemes.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)

    if (url.protocol !== "http:" && url.protocol !== "https:") return true

    const hostname = url.hostname.replace(/^\[|\]$/g, "")

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "::" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    )
      return true

    // IPv6 private ranges
    const lowerHost = hostname.toLowerCase()
    if (lowerHost.startsWith("fc") || lowerHost.startsWith("fd")) return true // ULA fc00::/7
    if (lowerHost.startsWith("fe80")) return true // Link-local
    if (lowerHost.startsWith("ff")) return true // Multicast
    if (/^0{0,4}:{0,2}0{0,4}:{0,2}(0{0,4}:){0,3}[01]$/.test(lowerHost)) return true // ::1, ::, 0::1
    // IPv4-mapped IPv6: ::ffff:W.X.Y.Z
    const v4mapped = lowerHost.match(/^:{0,2}ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (v4mapped) return isPrivateIpv4(v4mapped[1])

    // Quad-dotted IPv4
    const parts = hostname.split(".").map(Number)
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return isPrivateIpv4(hostname)
    }

    // Block decimal/hex IP encodings (e.g. 2130706433, 0x7f000001)
    if (/^\d+$/.test(hostname) || /^0x[0-9a-fA-F]+$/.test(hostname)) return true

    return false
  } catch {
    return true
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((n) => isNaN(n))) return false
  if (parts[0] === 10) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 0) return true
  if (parts[0] === 127) return true
  return false
}

/** Logs and rejects private/internal URLs before outbound fetches. */
export function isSafeOutboundUrl(urlString: string): boolean {
  if (isPrivateUrl(urlString)) {
    logger.warn(`Blocked private/internal URL: ${urlString}`)
    return false
  }
  return true
}

/** Escapes XML special characters for safe SVG interpolation. */
export function escapeXml(str: string): string {
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Strips API key values from a URL string for safe logging. */
export function redactUrl(url: string): string {
  return url.replace(/([?&])(api_key|API_KEY)=[^&]*/gi, "$1$2=[REDACTED]")
}

/** Header names allowed in user-supplied tileRequestHeader. */
const ALLOWED_TILE_HEADERS = new Set([
  "user-agent",
  "accept",
  "accept-language",
  "referer",
  "cache-control",
])

/** Strips unsafe headers from user-supplied tile request headers. */
export function sanitizeTileHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  if (!headers || typeof headers !== "object") return {}

  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (ALLOWED_TILE_HEADERS.has(key.toLowerCase()) && typeof value === "string" && !/[\r\n]/.test(value)) {
      sanitized[key] = value
    }
  }
  return sanitized
}
