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
          fill: rgba(0, 0, 0, 0.5);
          text-anchor: end;
        }
        .attr-bg {
          fill: rgba(255, 255, 255, 0.95);
        }
      </style>
      <rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" class="attr-bg"/>
      <text x="${textX}" y="${textY}" class="attr-text">${text}</text>
    </svg>
  `

  return Buffer.from(svg)
}
