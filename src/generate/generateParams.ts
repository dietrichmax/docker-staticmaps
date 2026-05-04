import {
  ShapeType,
  Feature,
  MapParamsInput,
  MapParamsOutput,
  MapOptions,
} from "../types/types"
import logger from "../utils/logger"
import { parseCenter } from "./parseCoordinates"
import { parseMultipleShapes } from "./parseShapes"
import { getTileUrl, parseAttributionParam, parseBorderParam } from "./parseTileConfig"
import { sanitizeTileHeaders, isPrivateUrl, replacePlaceholders } from "../utils/security"
import { parseBoolean } from "../utils/helpers"

// Re-export submodule functions for backward compatibility with tests
export { isEncodedPolyline, parseCoordinates, parseCenter } from "./parseCoordinates"
export { parseMultipleShapes, extractParams } from "./parseShapes"
export { getTileUrl, parseAttributionParam, parseBorderParam } from "./parseTileConfig"

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
 * Defines allowed minimum and maximum dimensions for map images.
 */
const LIMITS = {
  MAX_WIDTH: 8192,
  MAX_HEIGHT: 8192,
  MAX_PIXELS: 25_000_000,
  MIN_WIDTH: 1,
  MIN_HEIGHT: 1,
}

const ALLOWED_FORMATS = new Set(["png", "jpeg", "jpg", "webp", "pdf"])

const MAX_TILE_REQUEST_LIMIT = 8
const MAX_TILE_REQUEST_TIMEOUT = 30_000
const MAX_ZOOM = 20
const MAX_FEATURES = 1000

/** Short-form attribution appended when ?hillshade=true is set. Override via HILLSHADE_ATTRIBUTION. */
const HILLSHADE_ATTRIBUTION =
  process.env.HILLSHADE_ATTRIBUTION || "Hillshade: Mapzen / AWS Terrain Tiles"

/**
 * Default style and properties for each supported shape type.
 */
const SHAPE_DEFAULTS: Record<ShapeType, Feature> = {
  polyline: {
    weight: 5,
    color: "blue",
    fill: "",
    strokeDasharray: [],
    withGeodesicLine: true,
  },
  polygon: {
    weight: 3,
    color: "#4874db",
    fill: "",
    strokeDasharray: [],
    withGeodesicLine: true,
  },
  circle: {
    color: "#4874db",
    width: 3,
    fill: "",
    radius: 10,
    strokeDasharray: [],
  },
  markers: {
    img: "",
    width: 28,
    height: 28,
    offsetX: 14,
    offsetY: 28,
    color: "#d9534f",
    resizeMode: "cover",
    drawWidth: undefined,
    drawHeight: undefined,
  },
  text: {
    text: "Hello world!",
    color: "#000000BB",
    width: 1,
    size: 12,
    font: "Arial",
    anchor: "start",
    offsetX: -12,
    offsetY: 22,
  },
}

/**
 * Parses and validates map-related parameters from a given input object,
 * assembling a comprehensive map configuration object.
 *
 * @param {MapParamsInput} params - The input parameters object containing map configuration.
 * @returns {MapParamsOutput} An object containing missingParams and options.
 */
export function getMapParams(params: MapParamsInput): MapParamsOutput {
  logger.debug("Parsing map parameters", params)

  // Parse each feature from the request parameters.
  const features: Record<string, any> = {}

  for (const key of Object.keys(SHAPE_DEFAULTS) as ShapeType[]) {
    features[key] = parseMultipleShapes(key, SHAPE_DEFAULTS[key], params || {})
    logger.debug(`Parsed ${key}:`, features[key])
  }

  const totalFeatures = Object.values(features).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : list ? 1 : 0),
    0
  )
  if (totalFeatures > MAX_FEATURES) {
    throw new Error(`Too many features: ${totalFeatures} exceeds limit of ${MAX_FEATURES}`)
  }

  const center = parseCenter(params.center)
  const quality = Math.max(1, Math.min(100, parseInt(params.quality || "100", 10)))

  const width = parseInt((params.width ?? DEFAULTS.width).toString(), 10)
  const height = parseInt((params.height ?? DEFAULTS.height).toString(), 10)

  validateDimensions(width, height)

  const hasCoords = Object.values(features).some((list) =>
    Array.isArray(list)
      ? list.some((f) => f.coords?.length)
      : list?.coords?.length
  )

  const missingParams: string[] = []
  if (!center && !hasCoords) {
    missingParams.push("{center} or {coordinates}")
    logger.debug("Missing required parameters: center or coordinates")
  }

  const { url: tileUrl, attribution: basemapAttribution } = getTileUrl(
    params.tileUrl,
    params.basemap
  )

  const combinedAttribution = parseBoolean(params.hillshade)
    ? basemapAttribution
      ? `${basemapAttribution} | ${HILLSHADE_ATTRIBUTION}`
      : HILLSHADE_ATTRIBUTION
    : basemapAttribution

  const attribution = parseAttributionParam(
    params.attribution,
    combinedAttribution
  )

  const borderOptions = parseBorderParam(params.border)

  const options: MapOptions = {
    ...DEFAULTS,
    width,
    height,
    ...(params.paddingX && { paddingX: parseInt(params.paddingX, 10) }),
    ...(params.paddingY && { paddingY: parseInt(params.paddingY, 10) }),
    ...(params.tileSize && { tileSize: parseInt(params.tileSize, 10) }),
    ...(params.zoom && { zoom: Math.min(parseInt(params.zoom, 10), MAX_ZOOM) }),
    ...(params.format && {
      format: ALLOWED_FORMATS.has(params.format.toLowerCase())
        ? params.format
        : (() => { throw new Error(`Unsupported format: "${params.format}". Allowed: ${[...ALLOWED_FORMATS].join(", ")}`) })(),
    }),
    ...(params.tileRequestTimeout && {
      tileRequestTimeout: Math.min(Math.max(0, Number(params.tileRequestTimeout)), MAX_TILE_REQUEST_TIMEOUT),
    }),
    ...(params.tileRequestHeader && {
      tileRequestHeader: sanitizeTileHeaders(params.tileRequestHeader),
    }),
    ...(params.tileRequestLimit && {
      tileRequestLimit: Math.min(Number(params.tileRequestLimit), MAX_TILE_REQUEST_LIMIT),
    }),
    ...(params.zoomRange && {
      zoomRange: {
        min: Math.max(1, Math.min(Number(params.zoomRange.min) || 1, MAX_ZOOM)),
        max: Math.max(1, Math.min(Number(params.zoomRange.max) || 17, MAX_ZOOM)),
      },
    }),
    ...(typeof params.reverseY !== "undefined" && {
      reverseY: params.reverseY,
    }),
    ...(typeof params.tileSubdomains !== "undefined" && {
      tileSubdomains: validateSubdomains(params.tileSubdomains),
    }),
    ...(typeof params.tileLayers !== "undefined" && {
      tileLayers: validateTileLayers(params.tileLayers),
    }),
    ...(typeof attribution?.show !== "undefined" || attribution?.text
      ? { attribution }
      : {}),
    ...(parseBoolean(params.hillshade) && { hillshade: true }),

    tileUrl,
    center,
    quality,
    border: borderOptions,
    ...features,
  }

  logger.debug("Final parsed options:", { ...options })

  return {
    missingParams,
    options,
  }
}

function validateSubdomains(subdomains: any): string[] {
  if (!Array.isArray(subdomains)) return []
  return subdomains
    .filter((s: any) => typeof s === "string" && /^[a-zA-Z0-9-]+$/.test(s))
    .slice(0, 10)
}

function validateTileLayers(layers: any): any[] {
  if (!Array.isArray(layers)) return []
  return layers.slice(0, 10).map((layer: any) => {
    if (!layer || typeof layer !== "object") return {}
    const testUrl = replacePlaceholders(layer.tileUrl || "")
    if (layer.tileUrl && isPrivateUrl(testUrl)) {
      logger.error(`Blocked private/internal tile layer URL: ${layer.tileUrl}`)
      return { ...layer, tileUrl: "" }
    }
    return {
      ...layer,
      ...(layer.tileSubdomains && { tileSubdomains: validateSubdomains(layer.tileSubdomains) }),
      ...(layer.subdomains && { subdomains: validateSubdomains(layer.subdomains) }),
    }
  })
}

function validateDimensions(width: number, height: number) {
  if (width > LIMITS.MAX_WIDTH || height > LIMITS.MAX_HEIGHT) {
    throw new Error(
      `Requested image size ${width}x${height} exceeds maximum allowed ` +
        `${LIMITS.MAX_WIDTH}x${LIMITS.MAX_HEIGHT}.`
    )
  }
  if (width * height > LIMITS.MAX_PIXELS) {
    throw new Error(
      `Requested image size ${width}x${height} (${(width * height).toLocaleString()} pixels) exceeds pixel budget of ${LIMITS.MAX_PIXELS.toLocaleString()}.`
    )
  }
  if (width < LIMITS.MIN_WIDTH || height < LIMITS.MIN_HEIGHT) {
    throw new Error(
      `Image dimensions must be at least ${LIMITS.MIN_WIDTH}x${LIMITS.MIN_HEIGHT}.`
    )
  }
}
