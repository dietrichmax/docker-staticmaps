import { parseCoordinates } from "./parseCoordinates"

// --- Constants ---

/**
 * Set of allowed color names/values for styling shapes.
 */
const ALLOWED_COLORS = new Set([
  "blue",
  "green",
  "red",
  "yellow",
  "orange",
  "purple",
  "black",
  "white",
])

/**
 * Keys that represent color properties in shape style objects.
 */
const COLOR_KEYS = new Set(["color", "fill"])

/**
 * Keys that represent numeric style properties related to dimensions or offsets.
 */
const NUMERIC_KEYS = new Set([
  "weight",
  "radius",
  "width",
  "height",
  "size",
  "offsetX",
  "offsetY",
])

/**
 * Keys that represent boolean properties.
 */
const BOOLEAN_KEYS = new Set(["withGeodesicLine"])

/**
 * Parses multiple shape definitions from a given parameter key in a params object.
 *
 * The function handles various input formats:
 * - A single shape object with properties.
 * - An array of shape objects.
 * - An array or single string of shape parameters (e.g., "color:red|weight:3|12.34,56.78").
 *
 * Each parsed shape will have default properties merged in and its coordinates normalized
 * into an array of [longitude, latitude] pairs.
 *
 * @param {string} key - The key in the `params` object where shape data is stored.
 * @param {Record<string, any>} defaults - Default properties to apply to each shape.
 * @param {Record<string, any>} params - Object containing shape parameters under `key`.
 * @returns {Record<string, any>[]} An array of normalized shape objects.
 */
export function parseMultipleShapes(
  key: string,
  defaults: Record<string, any>,
  params: Record<string, any>
): Record<string, any>[] {
  const rawValue = params[key]
  if (!rawValue) return []

  /**
   * Normalizes the `coords` field in shape input.
   * Supports raw numbers, arrays, and objects with `lat`/`lon`.
   */
  const normalizeCoords = (shape: Record<string, any>): number[][] => {
    const coords = shape?.coords
    if (!coords) return []

    if (Array.isArray(coords)) {
      if (coords.length === 2 && typeof coords[0] === "number")
        return [[coords[0], coords[1]]]
      if (typeof coords[0] === "string") return parseCoordinates(coords)
      if (Array.isArray(coords[0])) return coords as number[][]
    }
    if (coords.lat !== undefined && coords.lon !== undefined)
      return [[coords.lon, coords.lat]]

    return []
  }

  /**
   * Merges defaults with given data and normalizes its coordinates.
   */
  const buildShape = (data: Record<string, any>) => ({
    ...defaults,
    ...data,
    coords: normalizeCoords(data),
  })

  // Case: single shape object
  if (typeof rawValue === "object" && !Array.isArray(rawValue))
    return [buildShape(rawValue)]
  // Case: array of shape objects
  if (Array.isArray(rawValue) && typeof rawValue[0] === "object")
    return rawValue.map(buildShape)

  // Case: raw strings like "color:red|weight:3|12.34,56.78"
  const shapeStrings = Array.isArray(rawValue) ? rawValue : [rawValue]
  return shapeStrings.map((str) => {
    const { extracted, coordinates } = extractParams(
      str.split("|"),
      Object.keys(defaults)
    )
    return { ...defaults, ...extracted, coords: parseCoordinates(coordinates) }
  })
}

/**
 * Extracts key-value parameters from a list of string items and separates coordinate values.
 *
 * The function scans each string in `items` for keys specified in `allowedKeys`.
 * If a string starts with a key followed by ":", its value is decoded and added to
 * the `extracted` object. Values for known color keys are validated and normalized,
 * numeric keys are parsed as numbers, boolean keys are parsed as booleans,
 * and the special key `strokeDasharray` is parsed as an array of numbers from a comma-separated string.
 * Strings that don't match any allowed key prefix are collected as coordinate strings.
 *
 * @param {string[]} items - Array of string items, e.g. ["color:red", "weight:5", "withGeodesicLine:false", "12.34,56.78"]
 * @param {string[]} allowedKeys - List of keys to extract, e.g. ["color", "weight", "radius", "strokeDasharray", "withGeodesicLine"]
 * @returns {{ extracted: Record<string, any>, coordinates: string[] }} An object containing
 *          `extracted` key-value pairs for recognized parameters, and `coordinates` with
 *          remaining strings treated as coordinate values.
 */
export function extractParams(items: string[], allowedKeys: string[]) {
  const extracted: Record<string, any> = {}
  const coordinates: string[] = []

  const allowedKeySet = new Set(allowedKeys)
  for (const item of items) {
    let matched = false
    for (const key of allowedKeySet) {
      if (!item.startsWith(`${key}:`)) continue
      const raw = decodeURIComponent(item.slice(key.length + 1))

      if (key === "strokeDasharray") {
        extracted[key] = raw
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((n) => !isNaN(n))
      } else if (COLOR_KEYS.has(key)) {
        extracted[key] = ALLOWED_COLORS.has(raw.toLowerCase())
          ? raw.toLowerCase()
          : `#${raw}`
      } else if (NUMERIC_KEYS.has(key)) {
        const num = Number(raw)
        if (!isNaN(num)) extracted[key] = num
      } else if (BOOLEAN_KEYS.has(key)) {
        extracted[key] = raw === "true" || raw === "1"
      } else {
        extracted[key] = raw
      }

      matched = true
      break
    }
    if (!matched) coordinates.push(item)
  }

  return { extracted, coordinates }
}
