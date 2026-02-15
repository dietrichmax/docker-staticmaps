import { basemaps } from "../utils/basemaps"
import logger from "../utils/logger"

/**
 * Checks if a URL points to a private or internal network address.
 * Used to prevent SSRF attacks via custom tile URLs.
 */
function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    const hostname = url.hostname.replace(/^\[|\]$/g, "")
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    )
      return true
    const parts = hostname.split(".").map(Number)
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      if (parts[0] === 10) return true
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
      if (parts[0] === 192 && parts[1] === 168) return true
      if (parts[0] === 169 && parts[1] === 254) return true
      if (parts[0] === 0) return true
    }
    return false
  } catch {
    return true
  }
}

/**
 * Parses a pipe-separated string of key:value pairs into a Map.
 * Values may contain colons (e.g., "text:http://example.com").
 * Parts without a colon are returned with key = the part itself and value = "".
 *
 * @param {string} input - Pipe-separated string, e.g. "show:true|text:Hello%20World".
 * @returns {Map<string, string>} Parsed key-value pairs.
 */
function parsePipeParams(input: string): Map<string, string> {
  const result = new Map<string, string>()
  for (const part of input.split("|")) {
    const colonIdx = part.indexOf(":")
    if (colonIdx === -1) {
      result.set(part.trim(), "")
    } else {
      const key = part.slice(0, colonIdx).trim()
      const value = part.slice(colonIdx + 1).trim()
      result.set(key, value)
    }
  }
  return result
}

/**
 * Generates a tile URL and attribution based on the provided custom URL and basemap.
 *
 * @param {string|null} customUrl - A custom URL template for the tiles.
 * @param {string|null} basemapName - The desired base map type (e.g., "osm", "topo").
 * @returns {{ url: string, attribution: string }} An object containing the tile URL and its attribution.
 */
export function getTileUrl(
  customUrl: string | null,
  basemapName: string | null
): { url: string; attribution: string } {
  if (customUrl) {
    const testUrl = customUrl.replace(/\{[^}]+\}/g, "0")
    if (isPrivateUrl(testUrl)) {
      logger.error(`Blocked private/internal tile URL: ${customUrl}`)
      return { url: "", attribution: "" }
    }
    return { url: customUrl, attribution: "" }
  }
  const name = basemapName || "osm"
  const tile = basemaps.find((b) => b.basemap === name)
  if (!tile) {
    logger.error(`Unknown basemap: ${name}`)
    return { url: "", attribution: "" }
  }
  return { url: tile.url, attribution: tile.attribution }
}

/**
 * Parses an attribution parameter string into an object specifying whether to show attribution
 * and what text to display. If the parameter is missing or incomplete, it falls back
 * to a default basemap attribution string if provided.
 *
 * The `param` string can contain multiple key-value pairs separated by `|`,
 * for example: `"show:true|text:Powered%20by%20X"`.
 *
 * Supported keys:
 * - `show`: `"true"` or `"false"` to explicitly set attribution visibility.
 * - `text`: URL-encoded string to specify custom attribution text.
 *
 * If `param` is just `"true"` or `"false"` (without keys), it is interpreted as the `show` flag.
 *
 * @param {string} [param] - Attribution parameter string, e.g. `"show:true|text:Powered%20by%20X"`.
 * @param {string} [basemapAttribution] - Default attribution text to use if none is provided in `param`.
 * @returns {{ show: boolean, text?: string }} Object containing:
 *  - `show`: Whether attribution should be shown (default `true`).
 *  - `text`: The attribution text to display (optional).
 */
export function parseAttributionParam(
  param?: string | { show?: boolean; text?: string },
  basemapAttribution?: string
): { show: boolean; text?: string } {
  const result: { show: boolean; text?: string } = { show: true }

  if (!param) {
    if (basemapAttribution) result.text = basemapAttribution
    return result
  }

  // Handle object input (e.g. from JSON POST body)
  if (typeof param === "object") {
    if (typeof param.show === "boolean") result.show = param.show
    if (param.text) result.text = param.text
    if (!result.text && basemapAttribution) result.text = basemapAttribution
    return result
  }

  const kvMap = parsePipeParams(param)

  for (const [key, value] of kvMap) {
    if (key === "show") {
      result.show = value === "true"
    } else if (key === "text") {
      result.text = decodeURIComponent(value)
    } else if (!value) {
      // Handle bare "true" or "false" without key
      if (key === "true") result.show = true
      else if (key === "false") result.show = false
    }
  }

  // fallback to basemap attribution if no text provided
  if (!result.text && basemapAttribution) {
    result.text = basemapAttribution
  }

  return result
}

/**
 * Parses a border parameter string into an object containing width and color.
 *
 * The input string can include `width` and `color` properties separated by `|`,
 * e.g. "width:2|color:#ff0000". The color will be normalized to start with `#`.
 *
 * @param {string} [param] - Optional string containing border parameters.
 *                            Format: "key:value|key:value", keys can be `width` or `color`.
 * @returns {{ width?: number; color?: string } | undefined}
 *          An object with optional `width` (number) and `color` (string) properties,
 *          or `undefined` if the input is empty or invalid.
 */
export function parseBorderParam(
  param?: string | { width?: number; color?: string }
): { width?: number; color?: string } | undefined {
  if (!param) return undefined

  // Handle object input (e.g. from JSON POST body)
  if (typeof param === "object") {
    return {
      ...(param.width !== undefined && { width: param.width }),
      ...(param.color !== undefined && { color: param.color }),
    }
  }

  const kvMap = parsePipeParams(param)
  const result: { width?: number; color?: string } = {}

  for (const [key, value] of kvMap) {
    const k = key.toLowerCase()
    const v = value.toLowerCase()
    if (!k || !v) continue

    if (k === "width") {
      const parsed = parseInt(v, 10)
      if (!isNaN(parsed)) result.width = parsed
    } else if (k === "color") {
      result.color = v.startsWith("#") ? v : `#${v}`
    }
  }

  return result
}
