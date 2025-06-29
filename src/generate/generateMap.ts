import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { addMarkers } from "../features/addMarkers"
import { addPolylines } from "../features/addPolylines"
import { addCircles } from "../features/addCircles"
import { addTexts } from "../features/addTexts"
import { asArray } from "../features/asArray"
import { createAttributionSVG } from "../utils/attribution"

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

  const start = process.hrtime()
  const map = new StaticMaps(options)

  try {
    addMarkers(map, asArray(options.markers))
    addPolylines(map, asArray(options.polyline), false)
    addPolylines(map, asArray(options.polygon), true)
    addCircles(map, asArray(options.circle))
    addTexts(map, asArray(options.text))

    await map.render(options.center, options.zoom)

    if (!map.image) {
      const errMsg = "Map image is undefined after rendering"
      logger.error(errMsg)
      throw new Error(errMsg)
    }

    if (options.attribution?.show && map.image) {
      const svg = createAttributionSVG(
        options.attribution.text,
        options.width,
        options.height
      )
      await map.image.compositeSVG(svg)
    }

    const buffer = await map.image.buffer(options.format)

    const [sec, nano] = process.hrtime(start)

    logger.info(`Image rendered in ${Math.round(sec * 1000 + nano / 1e6)} ms`, {
      size: buffer.length,
    })

    return buffer
  } catch (error) {
    logger.error("Error generating map image", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      format: options.format,
    })
    throw error
  }
}
