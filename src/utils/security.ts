import net from "node:net"
import logger from "./logger"

/**
 * Hosts exempt from the private-address checks, from the
 * `ALLOW_PRIVATE_TILE_HOSTS` env var (comma-separated hostnames).
 *
 * Exists so people can run their own tile server on a LAN or Docker network.
 * It is not a list of permitted tile servers - public hosts already work
 * without being listed, and adding one here just removes its protection.
 */
let allowedHostsRaw: string | undefined
let allowedHosts = new Set<string>()

/**
 * Whether this host may resolve to a private/internal address.
 * Re-parses the env var only when it changes.
 */
export function allowsPrivateAddress(hostname: string): boolean {
  const raw = process.env.ALLOW_PRIVATE_TILE_HOSTS ?? ""
  if (raw !== allowedHostsRaw) {
    allowedHostsRaw = raw
    allowedHosts = new Set(
      raw
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean)
    )
  }
  return allowedHosts.has(hostname.toLowerCase().replace(/^\[|\]$/g, ""))
}

/**
 * Checks if a URL points to a private/internal network address.
 * Blocks: localhost, 127.x, ::1, 10.x, 172.16-31.x, 192.168.x,
 * 169.254.x, 100.64-127.x, 0.x, 192.0.0.x, 198.18-19.x, multicast,
 * reserved 240.x+, .local, .internal, and non-HTTP(S) schemes.
 *
 * Only looks at the URL string. Hostnames that resolve to a private address
 * need DNS to catch, which happens at connect time in `safeFetch`.
 */
export function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)

    if (url.protocol !== "http:" && url.protocol !== "https:") return true

    const hostname = url.hostname.replace(/^\[|\]$/g, "")

    if (allowsPrivateAddress(hostname)) return false

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

    // Only for real IPv6 literals - matching prefixes against any hostname
    // would reject domains like ffmpeg.org or fcbarcelona.com
    if (net.isIPv6(hostname)) return isPrivateIpv6(hostname)

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
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true // CGNAT 100.64/10
  if (parts[0] === 0) return true
  if (parts[0] === 127) return true
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true // IETF protocol assignments 192.0.0.0/24
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true // Benchmarking 198.18.0.0/15
  if (parts[0] >= 224 && parts[0] <= 239) return true // Multicast 224.0.0.0/4
  if (parts[0] >= 240) return true // Reserved 240.0.0.0/4, includes broadcast
  return false
}

/** Checks an IPv6 literal, either from a URL hostname or from dns.lookup. */
function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0] // strip zone index
  // Must come before the ::/16 check below. dns.lookup gives the dotted form
  // (::ffff:127.0.0.1), the URL parser normalises to hex (::ffff:7f00:1).
  if (addr.startsWith("::ffff:")) {
    const rest = addr.slice(7)
    if (rest.includes(".")) return isPrivateIpv4(rest)

    const [hi, lo] = rest.split(":").map((g) => parseInt(g, 16))
    if (rest.split(":").length !== 2 || isNaN(hi) || isNaN(lo)) return true
    return isPrivateIpv4(
      `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
    )
  }

  const first = parseInt(addr.split(":")[0], 16)
  if (isNaN(first)) return true // "::1", "::", "::zzzz" - reserved or garbage
  if (first === 0) return true // ::/16 reserved, covers 0::1
  if ((first & 0xfe00) === 0xfc00) return true // ULA fc00::/7
  if ((first & 0xffc0) === 0xfe80) return true // Link-local fe80::/10
  if ((first & 0xff00) === 0xff00) return true // Multicast ff00::/8
  return false
}

/**
 * Classifies a resolved IP literal (v4 or v6) as private/internal.
 * Used by the connect-time check in `safeFetch`, where the input is always
 * a canonical address from dns.lookup rather than a user-supplied string.
 */
export function isPrivateIp(ip: string): boolean {
  return ip.includes(":") ? isPrivateIpv6(ip) : isPrivateIpv4(ip)
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

/** Replaces tile URL template placeholders like {z}, {x}, {y}, {s}, {quadkey} with safe defaults. */
export function replacePlaceholders(url: string): string {
  return url
    .replaceAll("{z}", "0")
    .replaceAll("{x}", "0")
    .replaceAll("{y}", "0")
    .replaceAll("{s}", "a")
    .replaceAll("{quadkey}", "0")
    .replaceAll("{r}", "")
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
    if (
      ALLOWED_TILE_HEADERS.has(key.toLowerCase()) &&
      typeof value === "string" &&
      !/[\r\n]/.test(value)
    ) {
      sanitized[key] = value
    }
  }
  return sanitized
}
