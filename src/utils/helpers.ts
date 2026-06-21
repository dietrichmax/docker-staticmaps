import PDFDocument from "pdfkit"

/**
 * Truncates a string to the specified max length and adds ellipsis if truncated.
 *
 * @param {string} str - The input string to truncate.
 * @param {number} [maxLength=500] - The maximum length of the output string.
 * @returns {string} - The truncated string, with "..." appended if it was cut.
 */
export const truncate = (str: string, maxLength = 500): string =>
  str.length > maxLength ? `${str.substring(0, maxLength)}...` : str

/**
 * Normalizes an IP address by removing the IPv4-mapped IPv6 prefix (::ffff:).
 *
 * @param {string} ip - The IP address to normalize.
 * @returns {string} - The normalized IP address.
 */
export function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7)
  }
  return ip
}

// Reused PDFKit document used only for text measurement (see measureTextWidth).
let measureDoc: InstanceType<typeof PDFDocument> | undefined

/**
 * Measures the rendered width of a text string in pixels.
 *
 * Uses PDFKit's built-in Helvetica metrics (which match Arial to within
 * ~0.2%) so the attribution background can be sized without a native canvas.
 *
 * @param {string} text - The text to measure.
 * @param {number} fontSize - The font size in pixels.
 * @returns {number} - The measured width of the text in pixels.
 */
export function measureTextWidth(text: string, fontSize: number): number {
  measureDoc ??= new PDFDocument({ autoFirstPage: false })
  return measureDoc.fontSize(fontSize).widthOfString(text)
}

/**
 * Loose boolean parser for query-string values.
 * Treats `true`, `"true"`, `"1"` and `1` as `true`; everything else as `false`.
 */
export function parseBoolean(val: any): boolean {
  return val === true || val === "true" || val === "1" || val === 1
}

/**
 * Converts a number of bytes into a human-readable string with appropriate units.
 *
 * @param {number} bytes - The size in bytes to format.
 * @returns {string} A human-readable string representation of the byte size,
 *                   e.g., "0 Bytes", "1.23 KB", "4.56 MB".
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
