import { basemaps } from "../utils/basemaps"
import logger from "../utils/logger"

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
  if (customUrl) return { url: customUrl, attribution: "" }
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

  const parts = param.split("|")

  for (const part of parts) {
    // Check if part contains colon (key:value)
    if (part.includes(":")) {
      const [key, ...valueParts] = part.split(":")
      const value = valueParts.join(":") // allow colons in text

      if (key === "show") {
        // Set show explicitly based on string "true"/"false"
        result.show = value === "true"
      } else if (key === "text") {
        result.text = decodeURIComponent(value)
      }
    } else {
      // Handle the case where param is just "true" or "false" without key
      if (part === "true") result.show = true
      else if (part === "false") result.show = false
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

  const parts = param.split("|")
  const result: { width?: number; color?: string } = {}

  for (const part of parts) {
    const [key, value] = part.split(":").map((v) => v.trim().toLowerCase())
    if (!key || !value) continue

    if (key === "width") {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed)) result.width = parsed
    } else if (key === "color") {
      // Normalize color (#fff or rgba(12, 10, 124, 1))
      result.color = value.startsWith("#") ? value : `#${value}`
    }
  }

  return result
}
