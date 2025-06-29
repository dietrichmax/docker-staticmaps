import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Polyline } from "../staticmaps/features"

/**
 * Add polyline or polygon features to the map.
 *
 * @param map - StaticMaps instance
 * @param items - Array of line or polygon configs
 * @param isPolygon - True to call addPolygon, false to call addLine
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
