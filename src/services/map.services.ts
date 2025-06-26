import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { IconMarker, Polyline, Circle, Text } from "../staticmaps/features"
import sharp from "sharp"
import { createAttributionSVG } from "../utils/attribution"

type FeatureArray<T> = T | T[] | undefined

/**
 * Normalize a possibly-singleton feature into an array.
 *
 * @param item - A feature or array of features
 * @returns An array of features (possibly empty)
 */
function asArray<T>(item: FeatureArray<T>): T[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

/**
 * Add all marker features to the map.
 *
 * @param map - StaticMaps instance
 * @param markers - Array of marker configs
 */
function addMarkers(map: StaticMaps, markers: any[]): void {
  markers.forEach((marker, i) => {
    const {
      coords = [],
      img,
      width, height,
      offsetX, offsetY,
      color, resizeMode,
      drawWidth, drawHeight,
    } = marker
    coords.forEach((coord: any, j: number) => {
      logger.debug(`Adding marker [${i}][${j}]`, marker)
      map.addMarker(new IconMarker({
        coord, img,
        width, height,
        offsetX, offsetY,
        color, resizeMode,
        drawWidth, drawHeight,
      }))
    })
  })
}

/**
 * Add polyline or polygon features to the map.
 *
 * @param map - StaticMaps instance
 * @param items - Array of line or polygon configs
 * @param isPolygon - True to call addPolygon, false to call addLine
 */
function addPolylines(
  map: StaticMaps,
  items: any[],
  isPolygon = false
): void {
  items.forEach((item, i) => {
    const { coords = [], color, weight, fill } = item
    if (coords.length < 2) {
      logger.warn(`Skipping ${isPolygon ? "polygon" : "polyline"} [${i}] due to insufficient coords`, item)
      return
    }
    logger.debug(`Adding ${isPolygon ? "polygon" : "polyline"} [${i}]`, item)
    const shape = new Polyline({ coords, color, width: weight, fill })
    isPolygon ? map.addPolygon(shape) : map.addLine(shape)
  })
}

/**
 * Add circle features to the map.
 *
 * @param map - StaticMaps instance
 * @param circles - Array of circle configs
 */
function addCircles(map: StaticMaps, circles: any[]): void {
  circles.forEach((circ, i) => {
    const { coords = [], radius, color, width, fill } = circ
    const coord = coords[0]
    if (!coord) {
      logger.warn(`Skipping circle [${i}] due to missing coords`, circ)
      return
    }
    logger.debug(`Adding circle [${i}]`, circ)
    map.addCircle(new Circle({ coord, radius, color, width, fill }))
  })
}

/**
 * Add text features to the map.
 *
 * @param map - StaticMaps instance
 * @param texts - Array of text configs
 */
function addTexts(map: StaticMaps, texts: any[]): void {
  texts.forEach((txt, i) => {
    const {
      coords = [], text,
      color, width, fill,
      size, font, anchor,
      offsetX = 0, offsetY = 0,
    } = txt
    const coord = coords[0]
    if (!coord) {
      logger.warn(`Skipping text [${i}] due to missing coords`, txt)
      return
    }
    logger.debug(`Adding text [${i}]`, txt)
    map.addText(new Text({
      coord, text,
      color, width, fill,
      size, font, anchor,
      offsetX: parseInt(offsetX as any, 10) || 0,
      offsetY: parseInt(offsetY as any, 10) || 0,
    }))
  })
}

/**
 * Generates a static map image based on the provided options.
 *
 * - Instantiates StaticMaps
 * - Adds markers, polylines, polygons, circles, and texts
 * - Renders the map
 * - Optionally composites an attribution SVG overlay
 *
 * @param options - Map rendering options
 * @returns A buffer containing the final image
 */
export async function generateMap(options: any): Promise<Buffer> {
  logger.debug("Starting map generation with options:", options)

  // ⏱ Measure render time using process.hrtime
  const start = process.hrtime()

  const map = new StaticMaps(options)

  // Add all feature types
  addMarkers(map, asArray(options.markers))
  addPolylines(map, asArray(options.polyline), false)
  addPolylines(map, asArray(options.polygon), true)
  addCircles(map, asArray(options.circle))
  addTexts(map, asArray(options.text))

  // Render base map
  await map.render(options.center, options.zoom)

  if (!map.image) {
    const errMsg = "Map image is undefined after rendering"
    logger.error(errMsg)
    throw new Error(errMsg)
  }

  // Retrieve raw image buffer once
  let buffer = await map.image.buffer(`image/${options.format}`)

  // If attribution is enabled, overlay the SVG
  if (options.attribution?.show && options.attribution.text) {
    logger.debug("Adding attribution overlay", options.attribution)
    const svg = createAttributionSVG(options.attribution.text, options.width, options.height)
    buffer = await sharp(buffer)
      .composite([{ input: svg, top: 0, left: 0 }])
      .toFormat(options.format)
      .toBuffer()
  }

  
  const [sec, nano] = process.hrtime(start)
  const renderDurationMs = Math.round(sec * 1000 + nano / 1e6)
  
  logger.info(`Image rendered in ${renderDurationMs} ms`, { size: buffer.length })

  return buffer
}
