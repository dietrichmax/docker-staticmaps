import StaticMaps from "../staticmaps/staticmaps"
import { basemaps } from "../utils/basemaps"
import logger from "../utils/logger"
import { Request, Response } from "express"
import IconMarker from "../staticmaps/marker"
import Polyline from "../staticmaps/polyline"
import Circle from "../staticmaps/circle"
import Text from "../staticmaps/text"

/**
 * Define the custom MapRequest type that extends the Express Request type.
 */
export interface MapRequest extends Request {
  query: { [key: string]: string | string[] | undefined } // This type should match your expected structure
}

/**
 * Handles a map request and generates the corresponding map image.
 *
 * @param {MapRequest} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 * @returns {Promise<void>} A promise that resolves once the response is sent.
 */
export async function handleMapRequest(
  req: MapRequest,
  res: Response
): Promise<void> {
  const params = req.method === "GET" ? req.query : req.body
  const { missingParams, options } = getMapParams(params)

  if (missingParams.length) {
    logger.warn("Missing parameters", { missingParams })
    res.status(422).json({ error: "Missing parameters", missingParams })
    return // Explicit return to end the function after sending the response
  }

  logger.debug("Request params:", { params })
  logger.debug("Missing parameters:", { missingParams })

  try {
    const img = await generateMap(options)
    logger.info("Image successfully rendered", {
      format: options.format,
      size: img.length,
    })
    res
      .set({
        "Content-Type": `image/${options.format}`,
        "Content-Length": String(img.length),
      })
      .end(img) // Sends the image as a response
  } catch (error) {
    logger.error("Error rendering image", { error })
    res.status(500).json({ error: "Internal Server Error" })
  }
}

// --- Helpers ---

/**
 * Parses a list of items to extract parameters and leftover coordinates.
 *
 * @param {string[]} items - Array of strings representing the items to parse.
 * @param {string[]} paramsList - List of parameter keys that can be extracted from the items.
 * @returns {{extracted: Record<string, any>, coordinates: string[]}} - An object containing the extracted parameters and leftover coordinates.
 */

interface ExtractedParams {
  color?: string
  weight?: number
  fill?: string
  radius?: number
  width?: number
  img?: string
  height?: number
  [key: string]: any // Allow other properties dynamically if needed
}

function extractParams(
  items: string[],
  paramsList: string[]
): { extracted: ExtractedParams; coordinates: string[] } {
  const allowedColors = [
    "blue",
    "green",
    "red",
    "yellow",
    "orange",
    "purple",
    "black",
    "white",
  ]

  return items.reduce(
    (acc, item) => {
      let matched = false
      for (const param of paramsList) {
        const prefix = `${param}:`
        if (item.startsWith(prefix)) {
          const value = decodeURIComponent(item.slice(prefix.length))
          if (param === "color" || param === "fill") {
            acc.extracted[param as keyof ExtractedParams] =
              allowedColors.includes(value) ? value : `#${value}`
          } else if (["weight", "radius", "width"].includes(param)) {
            acc.extracted[param as keyof ExtractedParams] = parseInt(value)
          } else {
            acc.extracted[param as keyof ExtractedParams] = value
          }
          matched = true
          break
        }
      }
      if (!matched) {
        acc.coordinates.push(item) // Ensure TypeScript knows this is a string
      }
      return acc
    },
    { extracted: {} as ExtractedParams, coordinates: [] as string[] }
  )
}

/**
 * Parses multiple shapes for a given key if provided as an array in the params.
 *
 * @param {string} key - The key corresponding to the shape in the params object.
 * @param {Record<string, any>} defaults - Default properties for the shape.
 * @param {Record<string, any>} params - An object containing all parameters.
 * @returns {Array<Record<string, any>>} - An array of parsed feature objects.
 */
function parseMultipleShapes(
  key: string,
  defaults: Record<string, any>,
  params: Record<string, any>
): Array<Record<string, any>> {
  const raw = params[key]
  if (!raw) return []

  const shapeValues: string[] = Array.isArray(raw) ? raw : [raw]

  return shapeValues.map((valueString) => {
    const items = valueString.split("|")
    const { extracted, coordinates } = extractParams(items, [
      "color",
      "weight",
      "fill",
      "radius",
      "width",
      "img",
      "height",
      "text",
      "size",
      "font",
      "anchor",
      "offsetX",
      "offsetY",
    ])
    return { ...defaults, ...extracted, coords: parseCoordinates(coordinates) }
  })
}

/**
 * Safely parses a value using the provided parser.
 *
 * @param {*} value - The value to be parsed.
 * @param {Function} [parser=(v) => v] - A function to parse the value. Defaults to an identity function.
 * @returns {*} - The parsed value, or null if the input value is falsy.
 */
function safeParse(value: any, parser: Function = (v: any) => v): any {
  return value ? parser(value) : null
}

/**
 * Parse coordinates from various formats.
 *
 * @param {Array<Array<number>> | string[] | Object[]} coords - An array of coordinates in different formats.
 * @returns {Array<Array<number>>} - An array of parsed coordinates in [longitude, latitude] format.
 */
export function parseCoordinates(coords: any): Array<Array<number>> {
  if (!Array.isArray(coords)) return []

  return coords
    .map((coord) => {
      if (Array.isArray(coord) && coord.length === 2)
        return [coord[0], coord[1]] // Swap to [longitude, latitude]
      if (typeof coord === "string") {
        const [lat, lon] = coord.split(",").map(Number)
        return [lon, lat] // Return [longitude, latitude]
      }
      if (
        coord &&
        typeof coord === "object" &&
        coord.lat !== undefined &&
        coord.lon !== undefined
      ) {
        return [coord.lon, coord.lat] // Return [longitude, latitude]
      }
      return null // If the coordinate is not valid, return null
    })
    .filter((coord): coord is [number, number] => coord !== null) // Filter out null values
}

/**
 * Extract map parameters from the provided input.
 *
 * @param {Record<string, any>} params - An object containing all map configuration parameters.
 * @returns {{ missingParams: string[], options: Record<string, any> }} - An object with missing parameter information and parsed options.
 */
export function getMapParams(params: Record<string, any>): {
  missingParams: string[]
  options: Record<string, any>
} {
  const defaultParams = {
    width: 800,
    height: 600,
    paddingX: 10,
    paddingY: 10,
    tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    tileLayers: [],
    tileSize: 256,
    tileRequestTimeout: 5000,
    tileRequestHeader: {},
    tileRequestLimit: 4,
    zoomRange: [1, 18],
    zoom: 10,
    reverseY: false,
    format: "png",
  }

  // Define defaults for each feature
  const shapeDefaults = {
    polyline: { weight: 5, color: "blue" },
    polygon: { color: "#4874db", weight: 3, fill: "#00FF003F" },
    circle: { color: "#4874db", width: 3, fill: "#0000bb", radius: 10 },
    markers: { img: "./public/images/marker-28.png", width: 28, height: 28 },
    text: {
      color: "#000000BB",
      width: 1,
      fill: "#000000",
      size: 12,
      font: "Arial",
      anchor: "start",
    },
  }

  // Parse each feature from the request parameters.
  const features: Record<string, any> = {}
  // For features that support multiple shapes, use parseMultipleShapes.
  features["polyline"] = parseMultipleShapes(
    "polyline",
    shapeDefaults.polyline,
    params
  )
  features["polygon"] = parseMultipleShapes(
    "polygon",
    shapeDefaults.polygon,
    params
  )
  features["circle"] = parseMultipleShapes(
    "circle",
    shapeDefaults.circle,
    params
  )
  features["text"] = parseMultipleShapes("text", shapeDefaults.text, params)
  features["markers"] = parseMultipleShapes(
    "markers",
    shapeDefaults.markers,
    params
  )

  // Check that at least one coordinate source is provided.
  const center = safeParse(params.center, (val: any) => {
    // ... existing parsing logic for center
    if (typeof val === "string") {
      const [lat, lon] = val.split(",").map(Number)
      return [lat, lon]
    } else if (
      Array.isArray(val) &&
      val.length === 2 &&
      typeof val[0] === "number" &&
      typeof val[1] === "number"
    ) {
      return [val[1], val[0]]
    } else if (
      val &&
      typeof val === "object" &&
      val.lat !== undefined &&
      val.lon !== undefined
    ) {
      return [val.lon, val.lat]
    }
    return null
  })

  const missingParams: string[] = []
  if (
    !center &&
    !Object.values(features).some(
      (feature) =>
        feature &&
        ((Array.isArray(feature) &&
          feature.some((f) => f.coords && f.coords.length)) ||
          (!Array.isArray(feature) && feature.coords && feature.coords.length))
    )
  ) {
    missingParams.push("{center} or {coordinates}")
  }

  return {
    missingParams,
    options: {
      ...defaultParams,
      width: parseInt(params.width) || 300,
      height: parseInt(params.height) || 300,
      paddingX: parseInt(params.paddingX),
      paddingY: parseInt(params.paddingY),
      tileUrl: getTileUrl(params.tileUrl, params.basemap),
      tileSubdomains: params.tileSubdomains,
      tileLayers: params.tileLayers,
      tileSize: parseInt(params.tileSize) || 256,
      tileRequestTimeout: params.tileRequestTimeout,
      tileRequestHeader: params.tileRequestHeader,
      tileRequestLimit: params.tileRequestLimit,
      zoomRange: params.zoomRange,
      zoom: parseInt(params.zoom),
      reverseY: params.reverseY,
      format: params.format || "png",
      center,
      ...features,
    },
  }
}

/**
 * Generates a static map image based on the provided options.
 *
 * @param {Record<string, any>} options - The configuration options for generating the map.
 * @returns {Promise<Buffer>} A promise that resolves to a Buffer containing the generated map image.
 */
export async function generateMap(options: any): Promise<Buffer> {
  const map = new StaticMaps(options)

  // Helper: Ensure item is always an array
  const toArray = (item: any) =>
    Array.isArray(item) ? item : item ? [item] : []

  // MARKERS
  toArray(options.markers).forEach((markerOpt: any) => {
    ;(markerOpt.coords || []).forEach((coord: any) => {
      const marker = new IconMarker({
        coord,
        img: markerOpt.img,
        width: markerOpt.width,
        height: markerOpt.height,
        offsetX: 13.6,
        offsetY: 27.6,
      })
      map.addMarker(marker)
    })
  })

  // POLYLINES
  toArray(options.polyline).forEach((line: any) => {
    if (line.coords?.length > 1) {
      const polyline = new Polyline({
        coords: line.coords,
        color: line.color,
        width: line.weight,
      })
      map.addLine(polyline)
    }
  })

  // POLYGONS
  toArray(options.polygon).forEach((poly: any) => {
    if (poly.coords?.length > 1) {
      const polygon = new Polyline({
        coords: poly.coords,
        color: poly.color,
        width: poly.weight,
        fill: poly.fill,
      })
      map.addPolygon(polygon)
    }
  })

  // CIRCLES
  toArray(options.circle).forEach((circ: any) => {
    if (circ.coords?.length) {
      const circle = new Circle({
        coord: circ.coords[0],
        radius: circ.radius,
        color: circ.color,
        width: circ.width,
        fill: circ.fill,
      })
      map.addCircle(circle)
    }
  })

  // TEXTS
  toArray(options.text).forEach((txt: any) => {
    if (txt.coords?.length) {
      const text = new Text({
        coord: txt.coords[0],
        text: txt.text,
        color: txt.color,
        width: txt.width,
        fill: txt.fill,
        size: txt.size,
        font: txt.font,
        anchor: txt.anchor,
        offsetX: parseInt(txt.offsetX) || 0,
        offsetY: parseInt(txt.offsetY) || 0,
      })
      map.addText(text)
    }
  })

  await map.render(options.center, options.zoom)

  if (!map.image) {
    throw new Error("Map image is undefined")
  }

  return map.image.buffer(`image/${options.format}`, { quality: 100 })
}

/**
 * Generates a tile URL based on the provided custom URL and basemap.
 *
 * @param {string|null} [customUrl] - A custom URL template for the tiles.
 * @param {string|null} [basemap] - The desired base map type (e.g., "osm", "topo").
 * @returns {string} The tile URL string.
 */
export function getTileUrl(customUrl: string | null, basemap: string | null) {
  if (customUrl) return customUrl
  if (basemap) {
    const tile = basemaps.find(({ basemap: b }) => b === basemap)
    if (!tile) {
      logger.error(
        `Unsupported basemap: "${basemap}"! Use "osm", "topo" or remove the "basemap" parameter.`
      )
      return ""
    }
    return tile.url
  }
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
}
