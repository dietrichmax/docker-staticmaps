import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Polyline } from "../staticmaps/features"

/**
 * Adds polyline or polygon features to the given StaticMaps instance.
 *
 * Each item must have at least two coordinate points; otherwise, it will be skipped with a warning.
 * When `isPolygon` is true, items are added as polygons; otherwise, as polylines.
 *
 * Each item in `items` should be an object with the following properties:
 * - `coords` {Array<[number, number]>}: Array of coordinate tuples [longitude, latitude].
 * - `color` {string}: Stroke color for the line or polygon border.
 * - `weight` {number}: Stroke width in pixels.
 * - `fill` {string}: Fill color for polygons (ignored for polylines).
 * - `strokeDasharray` {number[]} Optional array specifying dash pattern for stroke.
 *
 * @param {StaticMaps} map - The StaticMaps instance to which features will be added.
 * @param {Array<Object>} items - Array of polyline or polygon configuration objects.
 * @param {boolean} [isPolygon=false] - If true, add items as polygons; otherwise, as polylines.
 */
export function addPolylines(
  map: StaticMaps,
  items: any[],
  isPolygon = false
): void {
  items.forEach((item, i) => {
    const { coords = [], color, weight, fill, strokeDasharray } = item
    if (coords.length < 2) {
      logger.warn(
        `Skipping ${isPolygon ? "polygon" : "polyline"} [${i}] due to insufficient coords`,
        item
      )
      return
    }
    logger.debug(`Adding ${isPolygon ? "polygon" : "polyline"} [${i}]`, item)
    const shape = new Polyline({
      coords,
      color,
      width: weight,
      fill,
      strokeDasharray,
    })
    isPolygon ? map.addPolygon(shape) : map.addLine(shape)
  })
}
