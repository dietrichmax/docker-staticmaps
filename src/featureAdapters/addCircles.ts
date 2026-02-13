import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Circle } from "../staticmaps/features"

/**
 * Adds circle features to a StaticMaps instance based on the provided configurations.
 *
 * Each circle config should include coordinates, radius, and styling options.
 * Circles without valid coordinates are skipped with a warning.
 *
 * @param {StaticMaps} map - The StaticMaps instance to which circles will be added.
 * @param {Array<Object>} circles - An array of circle configuration objects. Each object may include:
 *   - `coords` {Array<[number, number]>} - Array with at least one coordinate tuple [lng, lat].
 *   - `radius` {number} - Radius of the circle in pixels or map units.
 *   - `color` {string} - Stroke color of the circle.
 *   - `width` {number} - Stroke width.
 *   - `fill` {string} - Fill color.
 */
export function addCircles(map: StaticMaps, circles: any[]): void {
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
