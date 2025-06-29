import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Circle } from "../staticmaps/features"

/**
 * Add circle features to the map.
 *
 * @param map - StaticMaps instance
 * @param circles - Array of circle configs
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
