import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { addMarkers } from "../features/addMarkers"
import { addPolylines } from "../features/addPolylines"
import { addCircles } from "../features/addCircles"
import { addTexts } from "../features/addTexts"
import { asArray } from "../features/asArray"
import { createAttributionSVG } from "../utils/attribution"
import { MapOptions } from "../types/types"

/**
 * Generates a static map image based on the provided options.
 *
 * - Instantiates StaticMaps
 * - Adds markers, polylines, polygons, circles, and texts
 * - Renders the map
 * - Optionally composites an attribution SVG overlay
 *
 * @param {MapOptions} options - Map rendering options
 * @returns A buffer containing the final image
 */
export async function generateMap(
  options: MapOptions
): Promise<{ buffer: Buffer; renderTime: number }> {
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

    if (options.attribution && options.attribution.show && map.image) {
      const svg = createAttributionSVG(
        options.attribution.text,
        options.width,
        options.height
      )
      await map.image.compositeSVG(svg)
    }

    const buffer = await map.image.buffer(options.format)

    const [sec, nano] = process.hrtime(start)
    const renderTime = Math.round(sec * 1000 + nano / 1e6)

    return { buffer, renderTime }
  } catch (error) {
    logger.error("Error generating map image", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      format: options.format,
    })
    throw error
  }
}
