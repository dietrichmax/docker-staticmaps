import { createCanvas } from "canvas"

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

/**
 * Checks whether the current environment is in development mode.
 *
 * @returns {boolean} - True if NODE_ENV is "development", false otherwise.
 */
export function isDev() {
  return process.env.NODE_ENV === "development"
}

/**
 * Measures the width of a given text string using a canvas context.
 *
 * @param {string} text - The text to measure.
 * @param {number} fontSize - The font size in pixels.
 * @param {string} [fontFamily='Arial'] - The font family to use.
 * @returns {number} - The measured width of the text in pixels.
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily = "Arial"
): number {
  const canvas = createCanvas(1, 1)
  const ctx = canvas.getContext("2d")
  ctx.font = `${fontSize}px ${fontFamily}`
  return ctx.measureText(text).width
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
