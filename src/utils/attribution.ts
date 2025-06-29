import { measureTextWidth } from "./helpers"

/**
 * Creates an SVG buffer containing an attribution box with the specified text,
 * positioned at the bottom-right corner of a canvas with the given width and height.
 *
 * The attribution box includes a semi-transparent background rectangle and
 * right-aligned text, styled with Arial font.
 *
 * @param {string} text - The attribution text to display inside the box.
 * @param {number} width - The total width of the SVG canvas.
 * @param {number} height - The total height of the SVG canvas.
 * @returns {Buffer} A Buffer containing the SVG markup as a UTF-8 encoded string,
 * ready for use in image compositing or saving.
 */
export function createAttributionSVG(
  text: string,
  width: number,
  height: number
): Buffer {
  const fontSize = 12
  const paddingX = 8
  const paddingY = 3
  const margin = 0

  // Estimate text width
  const textWidth = measureTextWidth(text, fontSize)
  const textHeight = fontSize

  const rectWidth = textWidth + paddingX * 2
  const rectHeight = textHeight + paddingY * 2

  const rectX = width - margin - rectWidth
  const rectY = height - margin - rectHeight

  const textX = width - margin - paddingX // text ends here (right-aligned)
  const textY = rectY + rectHeight / 2 + fontSize / 2.8 // vertical centering

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .attr-text {
          font-family: Arial, sans-serif;
          font-size: ${fontSize}px;
          fill: rgba(255, 255, 255, 0.95);
          text-anchor: end;
        }
        .attr-bg {
          fill: rgba(0, 0, 0, 0.5);
        }
      </style>
      <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" class="attr-bg"/>
      <text x="${textX}" y="${textY}" class="attr-text">${text}</text>
    </svg>
  `

  return Buffer.from(svg)
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
  param?: string,
  basemapAttribution?: string
): { show: boolean; text?: string } {
  const result: { show: boolean; text?: string } = { show: true }

  if (!param) {
    if (basemapAttribution) result.text = basemapAttribution
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
