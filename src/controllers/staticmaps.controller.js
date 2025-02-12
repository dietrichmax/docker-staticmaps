import StaticMaps from "../staticmaps/staticmaps.js"
import basemaps from "../utils/basemaps.js"
import logger from "../utils/logger.js"

/**
 * Handles a map request and generates the corresponding map image.
 *
 * @param {Object} req - The HTTP request object.
 * @param {string} req.method - The HTTP method used (e.g., "GET", "POST").
 * @param {Object} [req.query] - Query parameters for GET requests.
 * @param {Object} [req.body] - Request body for POST requests.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>} A promise that resolves once the response is sent.
 */
export async function handleMapRequest(req, res) {
  const params = req.method === "GET" ? req.query : req.body
  const { missingParams, options } = getMapParams(params)

  if (missingParams.length) {
    logger.warn("Missing parameters", { missingParams })
    return res.status(422).json({ error: "Missing parameters", missingParams })
  }

  logger.debug("Request params:", { params });
  logger.debug("Missing parameters:", { missingParams });

  try {
    const img = await generateMap(options)
    logger.info("Image successfully rendered", {
      format: options.format,
      size: img.length,
    })
    return res
      .set({
        "Content-Type": `image/${options.format}`,
        "Content-Length": String(img.length),
      })
      .end(img)
  } catch (error) {
    logger.error("Error rendering image", { error })
    return res.status(500).json({ error: "Internal Server Error" })
  }
}

// --- Helpers ---

/**
 * Parses a list of items to extract parameters and leftover coordinates.
 *
 * @param {string[]} items - Array of strings representing the items to parse.
 * @param {string[]} paramsList - List of parameter keys that can be extracted from the items.
 * @returns {{extracted: Object, coordinates: string[]}} - An object containing the extracted parameters and leftover coordinates.
 */
function extractParams(items, paramsList) {
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
            acc.extracted[param] = allowedColors.includes(value)
              ? value
              : `#${value}`
          } else if (["weight", "radius", "width"].includes(param)) {
            acc.extracted[param] = parseInt(value)
          } else {
            acc.extracted[param] = value
          }
          matched = true
          break
        }
      }
      if (!matched) {
        acc.coordinates.push(item)
      }
      return acc
    },
    { extracted: {}, coordinates: [] }
  )
}

/**
 * A unified helper to parse shape parameters (polyline, polygon, circle, markers).
 *
 * @param {string} key - The key corresponding to the shape in the params object.
 * @param {Object} defaults - Default properties for the shape.
 * @param {Object} params - An object containing all parameters.
 * @returns {Object|null} - Parsed feature object with coordinates, or null if no valid data is found.
 */
const parseShape = (key, defaults, params) => {
  if (!params[key]) return null
  let feature = { ...defaults }
  let items

  if (typeof params[key] === "string" || Array.isArray(params[key])) {
    items =
      typeof params[key] === "string" ? params[key].split("|") : params[key]
    const { extracted, coordinates } = extractParams(items, [
      "color",
      "weight",
      "fill",
      "radius",
      "width",
      "img",
      "height",
    ])
    feature = { ...feature, ...extracted }
    feature.coords = parseCoordinates(coordinates)
  } else if (params[key]?.coords) {
    feature = { ...feature, ...params[key] }
    feature.coords = parseCoordinates(params[key].coords)
  }
  return feature
}

/**
 * Safely parses a value using the provided parser.
 *
 * @param {*} value - The value to be parsed.
 * @param {Function} [parser=(v) => v] - A function to parse the value. Defaults to an identity function.
 * @returns {*} - The parsed value, or null if the input value is falsy.
 */
function safeParse(value, parser = (v) => v) {
  return value ? parser(value) : null
}

/**
 * Parse coordinates from various formats.
 *
 * @param {Array<Array<number>> | string[] | Object[]} coords - An array of coordinates in different formats.
 * @returns {Array<Array<number>>} - An array of parsed coordinates in [longitude, latitude] format.
 */
export function parseCoordinates(coords) {
  if (!Array.isArray(coords)) return []
  return coords
    .map((coord) => {
      if (Array.isArray(coord) && coord.length === 2)
        return [coord[1], coord[0]]
      if (typeof coord === "string") {
        const [lat, lon] = coord.split(",").map(Number)
        return [lon, lat]
      }
      if (
        coord &&
        typeof coord === "object" &&
        coord.lat !== undefined &&
        coord.lon !== undefined
      ) {
        return [coord.lon, coord.lat]
      }
      return null
    })
    .filter(Boolean)
}

/**
 * Extract map parameters from the provided input.
 *
 * @param {Object} params - An object containing all map configuration parameters.
 * @returns {Object} - An object with missing parameter information and parsed options.
 */
export function getMapParams(params) {
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
    simplify: true,
    format: "png",
  }

  const missingParams = []
  const center = safeParse(params.center, (val) => {
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

  // Define defaults for each feature
  const shapeDefaults = {
    polyline: { weight: 5, color: "blue" },
    polygon: { color: "#4874db", weight: 3, fill: "#00FF003F" },
    circle: { color: "#4874db", width: 3, fill: "#0000bb", radius: 10 },
    markers: { img: "./public/images/marker-28.png", width: 28, height: 28 },
  }

  // Parse each feature from the request parameters.
  const features = {}
  for (const key of Object.keys(shapeDefaults)) {
    features[key] = parseShape(key, shapeDefaults[key], params)
  }

  // Ensure that at least one coordinate source is provided.
  if (
    !center &&
    !Object.values(features).some(
      (feature) => feature && feature.coords && feature.coords.length
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
      simplify: params.simplify === "true",
      format: params.format || "png",
      center,
      ...features,
    },
  }
}

/**
 * Generates a static map image based on the provided options.
 *
 * @param {Object} options - The configuration options for generating the map.
 * @param {string} [options.format='png'] - The format of the output image (e.g., 'png', 'jpeg').
 * @param {number[]} [options.center] - The center coordinates of the map in [longitude, latitude].
 * @param {number} [options.zoom] - The zoom level of the map.
 * @param {Object} [options.markers] - Options for markers on the map.
 * @param {Array<Array<number>>} [options.markers.coords] - Array of marker coordinates.
 * @param {string} [options.markers.img] - Path to the marker image.
 * @param {number} [options.markers.width] - Width of the marker image.
 * @param {number} [options.markers.height] - Height of the marker image.
 * @param {Object} [options.polyline] - Options for a polyline on the map.
 * @param {Array<Array<number>>} [options.polyline.coords] - Array of coordinates defining the polyline.
 * @param {string} [options.polyline.color] - Color of the polyline.
 * @param {number} [options.polyline.weight] - Width of the polyline.
 * @param {boolean} [options.simplify=true] - Whether to simplify the polyline or polygon paths.
 * @param {Object} [options.polygon] - Options for a polygon on the map.
 * @param {Array<Array<number>>} [options.polygon.coords] - Array of coordinates defining the polygon.
 * @param {string} [options.polygon.color] - Color of the polygon boundary.
 * @param {number} [options.polygon.weight] - Width of the polygon boundary.
 * @param {string} [options.polygon.fill] - Fill color of the polygon.
 * @param {Object} [options.circle] - Options for a circle on the map.
 * @param {Array<number>} [options.circle.coords] - Center coordinate of the circle.
 * @param {number} [options.circle.radius] - Radius of the circle.
 * @param {string} [options.circle.color] - Color of the circle boundary.
 * @param {string} [options.circle.fill] - Fill color of the circle.
 * @param {number} [options.circle.width] - Width of the circle boundary.
 * @returns {Promise<Buffer>} A promise that resolves to a Buffer containing the generated map image.
 */
export async function generateMap(options) {
  const map = new StaticMaps(options)

  if (options.markers?.coords?.length) {
    options.markers.coords.forEach((coord) =>
      map.addMarker({
        coord,
        img: options.markers.img,
        width: options.markers.width,
        height: options.markers.height,
        offsetX: 13.6,
        offsetY: 27.6,
      })
    )
  }
  if (options.polyline?.coords?.length > 1) {
    map.addLine({
      coords: options.polyline.coords,
      color: options.polyline.color,
      width: options.polyline.weight,
      simplify: options.simplify,
    })
  }
  if (options.polygon?.coords?.length > 1) {
    map.addPolygon({
      coords: options.polygon.coords,
      color: options.polygon.color,
      width: options.polygon.weight,
      fill: options.polygon.fill,
      simplify: options.simplify,
    })
  }
  if (options.circle?.coords?.length) {
    map.addCircle({
      coord: options.circle.coords[0],
      radius: options.circle.radius,
      color: options.circle.color,
      fill: options.circle.fill,
      width: options.circle.width,
    })
  }

  await map.render(options.center, options.zoom)
  return map.image.buffer(`image/${options.format}`, { quality: 100 })
}

/**
 * Generates a tile URL based on the provided custom URL and basemap.
 *
 * @param {string|null} [customUrl] - A custom URL template for the tiles.
 * @param {string|null} [basemap] - The desired base map type (e.g., "osm", "topo").
 * @returns {string} The tile URL string.
 */
export function getTileUrl(customUrl, basemap) {
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
