/**
 * @fileoverview This module provides functionality for rendering static maps with various shapes and markers.
 */

import StaticMaps from "./staticmaps/staticmaps.js"
import basemaps from "./utils/basemaps.js"
import logger from "./utils/logger.js"

/**
 * Helper function to extract specific parameters (color, weight, fill, etc.)
 * @param {Array} array - The array of items to process.
 * @param {Array} paramsList - The list of parameters to look for.
 * @returns {{coords: Array}} - An object containing the coordinates extracted from the array.
 */
function extractParams(array, paramsList) {
  const extracted = {}
  const coordinates = []

  array.forEach((item) => {
    const param = paramsList.find((p) => item.startsWith(`${p}:`))
    if (param) {
      extracted[param] =
        param === "weight" || param === "radius" || param === "width"
          ? parseInt(item.replace(`${param}:`, ""))
          : item.replace(
              `${param}:`,
              param === "color" || param === "fill" ? "#" : ""
            )
    } else {
      coordinates.push(item)
    }
  })

  return { extracted, coordinates }
}

/**
 * Parses and validates shape options based on the provided parameters.
 *
 * @param {string} key - The type of shape ('polyline', 'polygon', 'circle').
 * @param {Object} defaultValues - Default options for the shape.
 * @param {Object} params - Parameters containing user-provided values.
 * @returns {Object|boolean} An object with devault values for the shape and coordinates.
 */
const parseShape = (key, defaultValues, params) => {
  if (!params[key]) return false

  let coords = []
  let extracted = {}

  // Handle the case where the parameter is a string (for GET requests)
  if (typeof params[key] === "string") {
    const { extracted: newExtracted, coordinates } = extractParams(
      params[key].split("|"),
      ["color", "weight", "fill", "radius", "width"]
    )
    coords = parseCoordinates(coordinates)
    extracted = { ...defaultValues, ...newExtracted }
  }
  // Handle the case where the parameter is an array (for POST requests)
  else if (Array.isArray(params[key])) {
    const { extracted: newExtracted, coordinates } = extractParams(
      params[key],
      ["color", "weight", "fill", "radius", "width"]
    )
    coords = parseCoordinates(coordinates)
    extracted = { ...defaultValues, ...newExtracted }
  }
  // Handle the case where the parameter is an object (for POST request polyline object)
  else if (typeof params[key] === "object" && params[key].coords) {
    // Extract coordinates and additional properties (color, weight, etc.)
    coords = parseCoordinates(params[key].coords) // Expecting coords to be an array of arrays
    extracted = { ...defaultValues, ...params[key] }
  }

  return { ...defaultValues, ...extracted, coords }
}

function safeParse(value, parser = (v) => v) {
  return value ? parser(value) : null
}

/**
 * Validates and normalizes a list of coordinates.
 *
 * @param {string|string[]} coords - A string or an array of strings representing coordinates.
 * @returns {Array<Array<number>>} An array of coordinate arrays.
 */
export function parseCoordinates(coords) {
  if (!coords) return []

  // Handle POST request (array of coordinates)
  if (Array.isArray(coords)) {
    return coords
      .map((coord) => {
        if (Array.isArray(coord) && coord.length === 2) {
          return [coord[1], coord[0]] // Convert [lat, lon] → [lon, lat]
        } else if (typeof coord === "string") {
          const [lat, lon] = coord.split(",").map(Number) // Handle GET request format
          return [lon, lat]
        } else if (
          typeof coord === "object" &&
          coord.lat !== undefined &&
          coord.lon !== undefined
        ) {
          return [coord.lon, coord.lat] // Handle { lat, lon } format
        }
        return null
      })
      .filter(Boolean) // Remove any null values
  }

  return []
}

export function validateParams(params) {
  const missingParams = []

  let center = safeParse(params.center, (val) => {
    if (typeof val === "string") {
      const coordinates = val.split(",").map(Number);
      return [coordinates[0], coordinates[1]] // Handle GET request format "48.8566,2.3522"
    } else if (
      Array.isArray(val) &&
      val.length === 2 &&
      typeof val[0] === "number" &&
      typeof val[1] === "number"
    ) {
      return [val[1], val[0]] // Handle POST request format [lat, lon] (convert to [lon, lat])
    } else if (
      typeof val === "object" &&
      val.lat !== undefined &&
      val.lon !== undefined
    ) {
      return [val.lon, val.lat] // Handle POST request format { lat: 48.8566, lon: 2.3522 }
    }
    return null // Invalid format
  })

  // Parsing different shapes
  const polyline = parseShape("polyline", { weight: 5, color: "blue" }, params)

  const polygon = parseShape(
    "polygon",
    { color: "blue", weight: 3, fill: "green" },
    params
  )

  const circle = parseShape(
    "circle",
    { color: "#4874db", width: 3, fill: "#0000bb", radius: 10 },
    params
  )

  const markers = params.markers
    ? typeof params.markers === "object"
      ? { coords: parseCoordinates(params.markers.coords) }
      : {
          coords: params.markers.split("|").map((coord) => {
            const [lat, lon] = coord.split(",").map(Number)
            return [lon, lat] // Swap latitude and longitude
          }),
        }
    : false

  if (
    !params.center &&
    !polyline.coords &&
    !markers.coords &&
    !circle.coords &&
    !polygon.coords
  ) {
    missingParams.push("{center} or {coordinates}")
  }

  return {
    missingParams,
    options: {
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
      center,
      markers,
      polyline,
      circle,
      polygon,
      format: params.format || "png",
    },
  }
}

/**
 * Renders a map based on the provided parameters.
 *
 * @param {Object} options - Parameters containing user-provided values for rendering the map.
 */
export async function render(options) {
  const map = new StaticMaps(options)

  // Helper to add different shapes to the map
  const addShape = (type, options) => {
    const shapes = {
      markers: () => {
        // Ensure markers.coords is defined and is an array
        if (options.markers?.coords && Array.isArray(options.markers.coords)) {
          options.markers.coords.forEach((coord) =>
            map.addMarker({
              coord,
              img: "./public/images/marker-28.png",
              width: 42,
              height: 42,
              offsetX: 13.6,
              offsetY: 27.6,
            })
          )
        }
      },
      polyline: () => {
        if (options.polyline?.coords?.length > 1) {
          map.addLine({
            coords: options.polyline.coords,
            color: options.polyline.color,
            width: options.polyline.weight,
          })
        }
      },
      polygon: () => {
        if (options.polygon?.coords?.length > 1) {
          map.addPolygon({
            coords: options.polygon.coords,
            color: options.polygon.color,
            width: options.polygon.weight,
            fill: options.polygon.fill,
          })
        }
      },
      circle: () => {
        if (options.circle?.coords?.length) {
          map.addCircle({
            coord: options.circle.coords[0],
            radius: options.circle.radius,
            color: options.circle.color,
            fill: options.circle.fill,
            width: options.circle.width,
          })
        }
      },
    }

    shapes[type] && shapes[type]()
  }

  addShape("markers", options)
  addShape("polyline", options)
  addShape("polygon", options)
  addShape("circle", options)

  await map.render(options.center, options.zoom)
  return map.image.buffer(`image/${options.format}`, { quality: 80 })
}

/**
 * Retrieves the tile URL based on user-provided values.
 *
 * @param {string} [reqTileUrl] - User-provided tile URL (optional).
 * @param {string} [reqBasemap] - Selected base map type (optional).
 * @returns {string} The tile URL to use for the map.
 */
export function getTileUrl(reqTileUrl, reqBasemap) {
  // If a custom tile URL is provided, use it
  if (reqTileUrl) return reqTileUrl

  // If no custom tile URL, use the provided basemap if available
  if (reqBasemap) {
    const tile = basemaps.find(({ basemap }) => basemap === reqBasemap)
    if (!tile) {
      logger.error(
        `Unsupported basemap: "${reqBasemap}"! \nPlease use "osm", "topo" as value for "basemap" or remove the "basemap" parameter`
      )
      return "" // Return an empty string or a fallback URL if needed
    }
    return tile.url
  }

  // If no tile URL and no basemap, return the default OpenStreetMap URL
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png" // Default URL
}
