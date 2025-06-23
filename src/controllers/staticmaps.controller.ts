import StaticMaps from "../staticmaps/staticmaps"
import { basemaps } from "../utils/basemaps"
import logger from "../utils/logger"
import { Response } from "express"
import { Polyline, Circle, Text, IconMarker } from "../staticmaps/features"
import polyline from "@mapbox/polyline"
import {
  getCachedTile,
  setCachedTile,
  createCacheKeyFromRequest,
} from "../utils/cache"
import {
  MapRequest,
  Coordinate,
  ShapeType,
  Feature,
  MapParamsInput,
  MapParamsOutput,
} from "../types/types"

/**
 * Handle a map request to generate a static map image.
 *
 * @param req - The incoming HTTP request (with typed query and body).
 * @param res - The HTTP response.
 */
export async function handleMapRequest(
  req: MapRequest,
  res: Response
): Promise<void> {
  try {
    const cacheKey = createCacheKeyFromRequest(req) // you define this to create unique keys from request params

    // Try to serve cached tile
    const cachedTile = getCachedTile(cacheKey)
    if (cachedTile) {
      logger.debug("Serving cached tile; cacheKey:", { cacheKey })
      res.type("image/png").send(cachedTile)
      return
    }

    const params = req.method === "GET" ? req.query : req.body
    const { missingParams, options } = getMapParams(params)

    if (missingParams.length > 0) {
      logger.warn("Missing parameters", { missingParams })
      res.status(422).json({ error: "Missing parameters", missingParams })
      return
    }

    logger.debug("Request params:", { params })

    const img = await generateMap(options)
    logger.info("Image successfully rendered", {
      format: options.format,
      size: img.length,
    })
    // Cache the generated tile
    setCachedTile(cacheKey, img)
    res
      .set({
        "Content-Type": `image/${options.format}`,
        "Content-Length": img.length.toString(),
      })
      .end(img)
  } catch (error) {
    logger.error("Error rendering image", { error })
    res.status(500).json({ error: "Internal Server Error" })
  }
}

// --- Helpers ---

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

const COLOR_KEYS = new Set(["color", "fill"])
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
 * Extracts key-value parameters from a list of string items and separates coordinate values.
 *
 * @param items - Array of string items (e.g., ["color:red", "weight:5", "12.34,56.78"])
 * @param allowedKeys - Set of keys to extract (e.g., ["color", "weight", "radius"])
 * @returns Object with extracted parameters and remaining coordinates.
 */
function extractParams(
  items: string[],
  allowedKeys: string[]
): { extracted: Record<string, any>; coordinates: string[] } {
  const extracted: Record<string, any> = {}
  const coordinates: string[] = []

  const allowedKeySet = new Set(allowedKeys)

  for (const item of items) {
    let foundKey = false

    for (const key of allowedKeySet) {
      const prefix = `${key}:`

      if (item.startsWith(prefix)) {
        const rawValue = decodeURIComponent(item.slice(prefix.length))
        logger.debug(`Extracted param "${key}": ${rawValue}`)

        if (COLOR_KEYS.has(key)) {
          extracted[key] = ALLOWED_COLORS.has(rawValue.toLowerCase())
            ? rawValue.toLowerCase()
            : `#${rawValue}`
        } else if (NUMERIC_KEYS.has(key)) {
          const num = Number(rawValue)
          if (!isNaN(num)) extracted[key] = num
        } else {
          extracted[key] = rawValue
        }

        foundKey = true
        break
      }
    }

    if (!foundKey) {
      coordinates.push(item)
    }
  }

  return { extracted, coordinates }
}

/**
 * Parses multiple shapes from a parameter key, handling objects, arrays, or strings.
 *
 * @param key - The key corresponding to the shape(s) in the `params` object.
 * @param defaults - Default shape properties to merge into each parsed shape.
 * @param params - Parameters object that may contain shape data under the given key.
 * @returns An array of parsed shape objects with normalized coordinates.
 */
function parseMultipleShapes(
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

// ——— Type Aliases —————————————————————————————————————————————
type CoordInput =
  | Array<Coordinate>
  | Array<string>
  | Array<{ lat: number; lon: number }>

// ——— Encoded‐Polyline Detector ————————————————————————————————————
const ENCODED_POLYLINE_REGEX = /[^0-9.,|\- ]/

/**
 * Detects if any string in the array contains characters typical of an encoded polyline.
 */
export function isEncodedPolyline(coords: string[]): boolean {
  return coords.some((s) => ENCODED_POLYLINE_REGEX.test(s))
}

// ——— Main Parser —————————————————————————————————————————————
/**
 * Parses a mixed-format array of coordinates into [lon, lat] points.
 *
 * Supports:
 *  - Array of [lon, lat] already
 *  - Array of { lat, lon } objects
 *  - Encoded‐polyline strings
 *  - "lat,lon" string pairs
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
    // remove optional surrounding braces
    const raw = strings.join("|").replace(/^\{|\}$/g, "")
    try {
      return polyline.decode(raw).map(([lat, lon]) => [lon, lat] as Coordinate)
    } catch (err: any) {
      logger.error("Polyline decode failed:", err.message)
      return []
    }
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

// ——— Defaults —————————————————————————————————————————————
const DEFAULTS = {
  width: 800,
  height: 800,
  paddingX: 0,
  paddingY: 0,
  tileSize: 256,
  tileRequestLimit: 2,
  zoomRange: { min: 1, max: 17 },
  reverseY: false,
  format: "png",
  quality: 100,
}

const SHAPE_DEFAULTS: Record<ShapeType, Feature> = {
  polyline: {
    weight: 5,
    color: "blue",
    fill: "",
  },
  polygon: {
    weight: 3,
    color: "#4874db",
    fill: "",
  },
  circle: {
    color: "#4874db",
    width: 3, // usually for border width; you wrote "width" before
    fill: "",
    radius: 10,
  },
  markers: {
    img: "",
    width: 28,
    height: 28,
    offsetX: 14, // default offsetX should be half width (middle)
    offsetY: 28, // default offsetY should be height (bottom)
    color: "#d9534f",
    resizeMode: "cover",
    drawWidth: undefined,
    drawHeight: undefined,
  },
  text: {
    text: "Hello world!",
    color: "#000000BB",
    width: 1,
    fill: "#000000",
    size: 12,
    font: "Arial",
    anchor: "start",
    offsetX: -12,
    offsetY: 22,
  },
}

// ——— Center Coordinate Parser —————————————————————————————
function parseCenter(val: any): Coordinate | null {
  if (!val) return null
  if (typeof val === "string") {
    const [lat, lon] = val.split(",").map(Number)
    return [lat, lon]
  }
  if (Array.isArray(val) && val.length === 2 && typeof val[0] === "number") {
    return [val[1], val[0]]
  }
  if (
    typeof val === "object" &&
    val.lat !== undefined &&
    val.lon !== undefined
  ) {
    return [val.lon, val.lat]
  }
  return null
}

/**
 * Extract map parameters from the provided input.
 *
 * @param {Record<string, any>} params - An object containing all map configuration parameters.
 * @returns {{ missingParams: string[], options: Record<string, any> }} - An object with missing parameter information and parsed options.
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

  const options = {
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

    tileUrl: getTileUrl(params.tileUrl, params.basemap),
    center,
    quality,
    ...features,
  }

  logger.debug("Final parsed options:", options)

  return {
    missingParams,
    options,
  }
}

/**
 * Generates a static map image based on the provided options.
 *
 * @param {Record<string, any>} options - The configuration options for generating the map.
 * @returns {Promise<Buffer>} A promise that resolves to a Buffer containing the generated map image.
 */
export async function generateMap(options: any): Promise<Buffer> {
  logger.debug("Starting map generation with options:", options)

  const map = new StaticMaps(options)
  const toArray = (item: any) =>
    Array.isArray(item) ? item : item ? [item] : []

  // MARKERS
  toArray(options.markers).forEach((marker: any, i: number) => {
    const {
      coords = [],
      img,
      width,
      height,
      offsetX,
      offsetY,
      color,
      resizeMode,
      drawWidth,
      drawHeight,
    } = marker
    coords.forEach((coord: any, j: number) => {
      logger.debug(`Adding marker [${i}][${j}]`, {
        coord,
        img,
        width,
        height,
        offsetX,
        offsetY,
        color,
        resizeMode,
        drawWidth,
        drawHeight,
      })
      map.addMarker(
        new IconMarker({
          coord,
          img,
          width,
          height,
          offsetX,
          offsetY,
          color,
          resizeMode,
          drawWidth,
          drawHeight,
        })
      )
    })
  })

  // POLYLINES
  toArray(options.polyline).forEach((line: any, i: number) => {
    const { coords = [], color, weight, fill } = line
    if (coords.length > 1) {
      logger.debug(`Adding polyline [${i}]`, {
        coordsCount: coords.length,
        color,
        width: weight,
        fill,
      })
      map.addLine(new Polyline({ coords, color, width: weight, fill }))
    } else {
      logger.warn(`Skipping polyline [${i}] due to insufficient coordinates`, {
        coords,
      })
    }
  })

  // POLYGONS
  toArray(options.polygon).forEach((poly: any, i: number) => {
    const { coords = [], color, weight, fill } = poly
    if (coords.length > 1) {
      logger.debug(`Adding polygon [${i}]`, {
        coordsCount: coords.length,
        color,
        width: weight,
        fill,
      })
      map.addPolygon(new Polyline({ coords, color, width: weight, fill }))
    } else {
      logger.warn(`Skipping polygon [${i}] due to insufficient coordinates`, {
        coords,
      })
    }
  })

  // CIRCLES
  toArray(options.circle).forEach((circ: any, i: number) => {
    const { coords = [], radius, color, width, fill } = circ
    const coord = coords[0]
    if (coord) {
      logger.debug(`Adding circle [${i}]`, { coord, radius, color })
      map.addCircle(new Circle({ coord, radius, color, width, fill }))
    } else {
      logger.warn(`Skipping circle [${i}] due to missing coordinates`)
    }
  })

  // TEXTS
  toArray(options.text).forEach((txt: any, i: number) => {
    const {
      coords = [],
      text,
      color,
      width,
      fill,
      size,
      font,
      anchor,
      offsetX = 0,
      offsetY = 0,
    } = txt
    const coord = coords[0]
    if (coord) {
      logger.debug(`Adding text [${i}]`, { coord, text, font, size })
      map.addText(
        new Text({
          coord,
          text,
          color,
          width,
          fill,
          size,
          font,
          anchor,
          offsetX: parseInt(offsetX, 10) || 0,
          offsetY: parseInt(offsetY, 10) || 0,
        })
      )
    } else {
      logger.warn(`Skipping text [${i}] due to missing coordinates`)
    }
  })

  await map.render(options.center, options.zoom)

  if (!map.image) {
    const errMsg = "Map image is undefined after rendering"
    logger.error(errMsg)
    throw new Error(errMsg)
  }

  const imageBuffer = await map.image.buffer(`image/${options.format}`)

  return imageBuffer
}

/**
 * Generates a tile URL based on the provided custom URL and basemap.
 *
 * @param {string|null} [customUrl] - A custom URL template for the tiles.
 * @param {string|null} [basemap] - The desired base map type (e.g., "osm", "topo").
 * @returns {string} The tile URL string.
 */
export function getTileUrl(
  customUrl: string | null,
  basemap: string | null
): string {
  if (customUrl) {
    logger.debug(`Using custom tile URL: ${customUrl}`)
    return customUrl
  }

  const selectedBasemap = basemap ?? "osm" // default to 'osm' if basemap is null

  const tile = basemaps.find(({ basemap: b }) => b === selectedBasemap)
  if (!tile) {
    logger.error(
      `Unsupported basemap: "${selectedBasemap}"! Use a valid basemap name or remove the "basemap" parameter to use default ("osm").`
    )
    return ""
  }

  logger.debug(`Using basemap: ${selectedBasemap} -> ${tile.url}`)
  return tile.url
}
