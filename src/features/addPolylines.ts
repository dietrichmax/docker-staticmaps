import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Polyline } from "../staticmaps/features"

/**
 * Adds polyline or polygon features to the given StaticMaps instance.
 *
 * Each item must have at least two coordinates; otherwise it will be skipped with a warning.
 * When `isPolygon` is true, items are added as polygons; otherwise as polylines.
 *
 * @param {StaticMaps} map - The StaticMaps instance to add features to.
 * @param {Array<Object>} items - Array of line or polygon configuration objects. Each should include:
 *   - `coords` {Array<[number, number]>} - Array of coordinate tuples (lng, lat).
 *   - `color` {string} - Stroke color.
 *   - `weight` {number} - Stroke width.
 *   - `fill` {string} - Fill color (used for polygons).
 * @param {boolean} [isPolygon=false] - If true, add items as polygons; else as polylines.
 */
export function addPolylines(
  map: StaticMaps,
  items: any[],
  isPolygon = false
): void {
  items.forEach((item, i) => {
    const { coords = [], color, weight, fill } = item
    if (coords.length < 2) {
      logger.warn(
        `Skipping ${isPolygon ? "polygon" : "polyline"} [${i}] due to insufficient coords`,
        item
      )
      return
    }
    logger.debug(`Adding ${isPolygon ? "polygon" : "polyline"} [${i}]`, item)
    const shape = new Polyline({ coords, color, width: weight, fill })
    isPolygon ? map.addPolygon(shape) : map.addLine(shape)
  })
}
