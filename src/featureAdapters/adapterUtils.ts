import logger from "../utils/logger"

/**
 * Iterates over feature items, validates that each has sufficient coordinates,
 * logs warnings for skipped items and debug messages for added items,
 * then calls the provided callback for each valid item.
 *
 * @param {string} featureType - Name of the feature type (e.g., "circle", "text") for log messages.
 * @param {any[]} items - Array of feature configuration objects, each expected to have a `coords` property.
 * @param {number} minCoords - Minimum number of coordinates required (e.g., 1 for circle/text, 2 for polyline).
 * @param {(item: any, index: number) => void} callback - Called for each valid item.
 */
export function forEachValidFeature(
  featureType: string,
  items: any[],
  minCoords: number,
  callback: (item: any, index: number) => void
): void {
  items.forEach((item, i) => {
    const coords = item.coords ?? []
    if (coords.length < minCoords) {
      logger.warn(`Skipping ${featureType} [${i}] due to insufficient coords`, item)
      return
    }
    logger.debug(`Adding ${featureType} [${i}]`, item)
    callback(item, i)
  })
}
