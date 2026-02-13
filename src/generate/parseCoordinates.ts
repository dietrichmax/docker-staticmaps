import polyline from "@mapbox/polyline"
import { Coordinate, CoordInput } from "../types/types"

/**
 * Determines if any string in the input array appears to be an encoded polyline.
 *
 * Uses a regex to detect characters uncommon in plain coordinate strings.
 *
 * @param {string[]} input - An array of strings to check.
 * @returns {boolean} True if any string matches the encoded polyline pattern; otherwise false.
 */
const ENCODED_POLYLINE_REGEX = /[^0-9.,|\- ]/
export function isEncodedPolyline(input: string[]): boolean {
  return input.some((s) => ENCODED_POLYLINE_REGEX.test(s))
}

/**
 * Parses a mixed-format array of coordinate inputs into an array of [longitude, latitude] points.
 *
 * Supports input formats:
 * - Array of [lon, lat] coordinate pairs
 * - Array of objects with { lat, lon } properties
 * - Array of encoded polyline strings (decoded to coordinates)
 * - Array of strings with "lat,lon" comma-separated values
 *
 * @param {CoordInput} input - The input coordinates in mixed formats.
 * @returns {Coordinate[]} An array of coordinates as [longitude, latitude] tuples.
 */
export function parseCoordinates(input: CoordInput): Coordinate[] {
  if (!Array.isArray(input) || input.length === 0) return []

  // 1) Already numeric pairs or objects
  if (
    Array.isArray(input[0]) ||
    (typeof input[0] === "object" && input[0] !== null && "lat" in input[0])
  ) {
    return input
      .map((c) =>
        Array.isArray(c) && c.length === 2
          ? (c as Coordinate)
          : c && typeof c === "object" && "lat" in c && "lon" in c
            ? [c.lon, c.lat]
            : null
      )
      .filter((pt): pt is Coordinate => pt !== null)
  }

  // 2) Encoded polyline
  const strings = input as string[]
  if (isEncodedPolyline(strings)) {
    const raw = strings.join("|").replace(/^\{|\}$/g, "")
    return polyline.decode(raw).map(([lat, lon]) => [lon, lat])
  }

  // 3) Comma‐separated "lat,lon" pairs
  return strings
    .map((str) => {
      const [latStr, lonStr] = str.split(",").map((s) => s.trim())
      const lat = Number(latStr),
        lon = Number(lonStr)
      return isNaN(lat) || isNaN(lon) ? null : [lon, lat]
    })
    .filter((pt): pt is Coordinate => pt !== null)
}

/**
 * Parses a center coordinate input and returns a Coordinate tuple or null if invalid.
 *
 * Supports:
 * - String input in "lat,lon" format (returns [lat, lon])
 * - Array input [longitude, latitude] or [lat, lon] (returns [lon, lat])
 * - Object input with `lat` and `lon` properties (returns [lon, lat])
 *
 * @param {any} val - The input value representing a coordinate.
 * @returns {Coordinate | null} The parsed coordinate as [longitude, latitude] or null if input is invalid.
 */
export function parseCenter(val: any): Coordinate | null {
  if (!val) return null

  if (typeof val === "string") {
    const [latStr, lonStr] = val.split(",").map((s) => s.trim())
    const lat = Number(latStr),
      lon = Number(lonStr)
    return isNaN(lat) || isNaN(lon) ? null : [lon, lat]
  }

  if (
    Array.isArray(val) &&
    val.length === 2 &&
    val.every((v) => typeof v === "number")
  ) {
    return [val[1], val[0]]
  }

  if (val?.lat !== undefined && val?.lon !== undefined)
    return [val.lon, val.lat]

  return null
}
