// services/params-parser.ts
import { basemaps } from "../utils/basemaps"
import polyline from "@mapbox/polyline"
import { parseAttributionParam } from "../utils/attribution"
import {
  Coordinate,
  ShapeType,
  Feature,
  MapParamsInput,
  MapParamsOutput,
  CoordInput,
  MapOptions,
} from "../types/types"
import logger from "../utils/logger"

// --- Helpers ---

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

// ——— Defaults —————————————————————————————————————————————

/**
 * Default configuration values for map rendering parameters.
 */
const DEFAULTS = {
  /** Width of the map canvas in pixels */
  width: 800,
  /** Height of the map canvas in pixels */
  height: 800,
  /** Horizontal padding in pixels */
  paddingX: 0,
  /** Vertical padding in pixels */
  paddingY: 0,
  /** Tile size in pixels (usually 256 for standard map tiles) */
  tileSize: 256,
  /** Maximum number of tile requests allowed concurrently */
  tileRequestLimit: 2,
  /** Allowed zoom level range */
  zoomRange: { min: 1, max: 17 },
  /** Whether to reverse Y coordinate axis */
  reverseY: false,
  /** Output image format */
  format: "png",
  /** Output image quality (percentage) */
  quality: 100,
  /** Attribution display options */
  attribution: {
    /** Whether to show attribution text */
    show: true,
    /** Text content for attribution */
    text: "",
  },
}

/**
 * Default style and properties for each supported shape type.
 */
const SHAPE_DEFAULTS: Record<ShapeType, Feature> = {
  polyline: {
    weight: 5, // Line thickness
    color: "blue", // Stroke color
    fill: "", // No fill for lines
    strokeDasharray: [], // Default: solid line (empty dash array)
  },
  polygon: {
    weight: 3, // Border thickness
    color: "#4874db", // Border color
    fill: "", // No fill by default
    strokeDasharray: [], // Default: solid line (empty dash array)
  },
  circle: {
    color: "#4874db", // Border color
    width: 3, // Border width (stroke width)
    fill: "", // No fill by default
    radius: 10, // Radius in pixels
    strokeDasharray: [], // Default: solid line (empty dash array)
  },
  markers: {
    img: "", // Marker image URL or base64 data
    width: 28, // Marker width in pixels
    height: 28, // Marker height in pixels
    offsetX: 14, // Horizontal offset, defaults to half width (center)
    offsetY: 28, // Vertical offset, defaults to full height (bottom)
    color: "#d9534f", // Marker color fallback
    resizeMode: "cover", // Image resize mode
    drawWidth: undefined, // Optional override for drawing width
    drawHeight: undefined, // Optional override for drawing height
  },
  text: {
    text: "Hello world!", // Default label text
    color: "#000000BB", // Text fill color with transparency
    width: 1, // Stroke width around text (if any)
    size: 12, // Font size in pixels
    font: "Arial", // Font family
    anchor: "start", // Text anchor position (start, middle, end)
    offsetX: -12, // Horizontal text offset
    offsetY: 22, // Vertical text offset
  },
}

/**
 * Parses and validates map-related parameters from a given input object,
 * assembling a comprehensive map configuration object.
 *
 * This function:
 * - Parses multiple shape features (e.g., markers, polylines, polygons) from input parameters.
 * - Parses and validates the map center coordinates.
 * - Determines quality and other rendering options.
 * - Checks for required parameters and reports missing ones.
 * - Resolves tile URL and attribution information.
 * - Merges defaults with provided parameters and parsed features into a final options object.
 *
 * @param {MapParamsInput} params - The input parameters object containing map configuration.
 * @returns {{ missingParams: string[], options: MapParamsOutput }} An object containing:
 *   - `missingParams`: An array of strings describing required missing parameters, if any.
 *   - `options`: The finalized map parameters object ready for use in rendering.
 */
export function getMapParams(params: MapParamsInput): MapParamsOutput {
  logger.debug("Parsing map parameters", params)

  // Parse each feature from the request parameters.
  const features: Record<string, any> = {}

  for (const key of Object.keys(SHAPE_DEFAULTS) as ShapeType[]) {
    features[key] = parseMultipleShapes(key, SHAPE_DEFAULTS[key], params || {})
    logger.debug(`Parsed ${key}:`, features[key])
  }

  const center = parseCenter(params.center)
  const quality = parseInt(params.quality || 100)

  const hasCoords = Object.values(features).some((list) =>
    Array.isArray(list)
      ? list.some((f) => f.coords?.length)
      : list?.coords?.length
  )

  const missingParams = []

  if (!center && !hasCoords) {
    missingParams.push("{center} or {coordinates}")
    logger.debug("Missing required parameters: center or coordinates")
  }

  const { url: tileUrl, attribution: basemapAttribution } = getTileUrl(
    params.tileUrl,
    params.basemap
  )

  const rawAttribution = params.attribution
  const attribution = parseAttributionParam(rawAttribution, basemapAttribution)

  const options: MapOptions = {
    ...DEFAULTS,
    ...(params.width && { width: parseInt(params.width, 10) }),
    ...(params.height && { height: parseInt(params.height, 10) }),
    ...(params.paddingX && { paddingX: parseInt(params.paddingX, 10) }),
    ...(params.paddingY && { paddingY: parseInt(params.paddingY, 10) }),
    ...(params.tileSize && { tileSize: parseInt(params.tileSize, 10) }),
    ...(params.zoom && { zoom: parseInt(params.zoom, 10) }),
    ...(params.format && { format: params.format }),
    ...(params.tileRequestTimeout && {
      tileRequestTimeout: params.tileRequestTimeout,
    }),
    ...(params.tileRequestHeader && {
      tileRequestHeader: params.tileRequestHeader,
    }),
    ...(params.tileRequestLimit && {
      tileRequestLimit: params.tileRequestLimit,
    }),
    ...(params.zoomRange && { zoomRange: params.zoomRange }),
    ...(typeof params.reverseY !== "undefined" && {
      reverseY: params.reverseY,
    }),
    ...(typeof params.tileSubdomains !== "undefined" && {
      tileSubdomains: params.tileSubdomains,
    }),
    ...(typeof params.tileLayers !== "undefined" && {
      tileLayers: params.tileLayers,
    }),
    ...(typeof attribution?.show !== "undefined" || attribution?.text
      ? { attribution }
      : {}),

    tileUrl,
    center,
    quality,
    ...features,
  }

  logger.debug("Final parsed options:", { ...options })

  return {
    missingParams,
    options,
  }
}

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

    if (Array.isArray(coords)) {
      if (coords.length === 2 && typeof coords[0] === "number") {
        return [[coords[0], coords[1]]] // single point [lon, lat]
      }
      if (typeof coords[0] === "string") {
        return parseCoordinates(coords) // parse from strings
      }
      if (Array.isArray(coords[0])) {
        return coords as number[][] // already in [[lon, lat], ...] format
      }
    }

    if (
      typeof coords === "object" &&
      coords?.lat !== undefined &&
      coords?.lon !== undefined
    ) {
      return [[coords.lon, coords.lat]]
    }

    return []
  }

  /**
   * Merges defaults with given data and normalizes its coordinates.
   */
  const buildShape = (data: Record<string, any>): Record<string, any> => {
    const shape = { ...defaults, ...data }
    shape.coords = normalizeCoords(shape)
    return shape
  }

  // Case: single shape object
  if (typeof rawValue === "object" && !Array.isArray(rawValue)) {
    return [buildShape(rawValue)]
  }

  // Case: array of shape objects
  if (Array.isArray(rawValue) && typeof rawValue[0] === "object") {
    return rawValue.map(buildShape)
  }

  // Case: raw strings like "color:red|weight:3|12.34,56.78"
  const shapeStrings = Array.isArray(rawValue) ? rawValue : [rawValue]

  return shapeStrings.map((str) => {
    const { extracted, coordinates } = extractParams(
      str.split("|"),
      Object.keys(defaults)
    )
    return {
      ...defaults,
      ...extracted,
      coords: parseCoordinates(coordinates),
    }
  })
}

/**
 * Extracts key-value parameters from a list of string items and separates coordinate values.
 *
 * The function scans each string in `items` for keys specified in `allowedKeys`.
 * If a string starts with a key followed by ":", its value is decoded and added to
 * the `extracted` object. Values for known color keys are validated and normalized,
 * numeric keys are parsed as numbers, and the special key `strokeDasharray` is parsed
 * as an array of numbers from a comma-separated string.
 * Strings that don't match any allowed key prefix are collected as coordinate strings.
 *
 * @param {string[]} items - Array of string items, e.g. ["color:red", "weight:5", "12.34,56.78"]
 * @param {string[]} allowedKeys - List of keys to extract, e.g. ["color", "weight", "radius", "strokeDasharray"]
 * @returns {{ extracted: Record<string, any>, coordinates: string[] }} An object containing
 *          `extracted` key-value pairs for recognized parameters, and `coordinates` with
 *          remaining strings treated as coordinate values.
 */
export function extractParams(
  items: string[],
  allowedKeys: string[]
): { extracted: Record<string, any>; coordinates: string[] } {
  const extracted: Record<string, any> = {}
  const coordinates: string[] = []

  const allowedKeySet = new Set(allowedKeys)

  for (const item of items) {
    let matched = false

    for (const key of allowedKeySet) {
      const prefix = `${key}:`
      if (item.startsWith(prefix)) {
        const rawValue = decodeURIComponent(item.slice(prefix.length))

        if (key === "strokeDasharray") {
          extracted[key] = rawValue
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((n) => !isNaN(n))
        } else if (COLOR_KEYS.has(key)) {
          extracted[key] = ALLOWED_COLORS.has(rawValue.toLowerCase())
            ? rawValue.toLowerCase()
            : `#${rawValue}`
        } else if (NUMERIC_KEYS.has(key)) {
          const num = Number(rawValue)
          if (!isNaN(num)) extracted[key] = num
        } else {
          extracted[key] = rawValue
        }

        matched = true
        break
      }
    }

    if (!matched) {
      coordinates.push(item)
    }
  }

  return { extracted, coordinates }
}

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
      .map((c) => {
        if (Array.isArray(c) && c.length === 2) {
          return c as Coordinate
        }
        if (typeof c === "object" && c !== null && "lat" in c && "lon" in c) {
          return [c.lon, c.lat] as Coordinate
        }
        return null
      })
      .filter((pt): pt is Coordinate => pt !== null)
  }

  // 2) Encoded polyline
  const strings = input as string[]
  if (isEncodedPolyline(strings)) {
    const raw = strings.join("|").replace(/^\{|\}$/g, "")
    return polyline.decode(raw).map(([lat, lon]) => [lon, lat] as Coordinate)
  }

  // 3) Comma‐separated "lat,lon" pairs
  return strings
    .map((str) => {
      const [latStr, lonStr] = str.split(",").map((s) => s.trim())
      const lat = Number(latStr),
        lon = Number(lonStr)
      return isNaN(lat) || isNaN(lon) ? null : ([lon, lat] as Coordinate)
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
    const parts = val.split(",")
    if (parts.length !== 2) return null

    const lat = Number(parts[0].trim())
    const lon = Number(parts[1].trim())
    if (isNaN(lat) || isNaN(lon)) return null

    return [lon, lat]
  }

  if (Array.isArray(val) && val.length === 2) {
    const [a, b] = val
    if (typeof a === "number" && typeof b === "number") {
      return [b, a]
    }
    return null
  }

  if (
    typeof val === "object" &&
    val !== null &&
    typeof val.lat === "number" &&
    typeof val.lon === "number"
  ) {
    return [val.lon, val.lat]
  }

  return null
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
  if (customUrl) return { url: customUrl, attribution: "" }
  const name = basemapName || "osm"
  const tile = basemaps.find((b) => b.basemap === name)
  if (!tile) {
    logger.error(`Unknown basemap: ${name}`)
    return { url: "", attribution: "" }
  }
  return { url: tile.url, attribution: tile.attribution }
}
