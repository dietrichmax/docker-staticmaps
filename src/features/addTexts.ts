import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Text } from "../staticmaps/features"

/**
 * Add text features to the map.
 *
 * @param map - StaticMaps instance
 * @param texts - Array of text configs
 */
export function addTexts(map: StaticMaps, texts: any[]): void {
  texts.forEach((txt, i) => {
    const {
      coords = [],
      text,
      color,
      width,
      fill,
      size,
      font,
      anchor,
      offsetX = 0,
      offsetY = 0,
    } = txt
    const coord = coords[0]
    if (!coord) {
      logger.warn(`Skipping text [${i}] due to missing coords`, txt)
      return
    }
    logger.debug(`Adding text [${i}]`, txt)
    map.addText(
      new Text({
        coord,
        text,
        color,
        width,
        fill,
        size,
        font,
        anchor,
        offsetX: parseInt(offsetX as any, 10) || 0,
        offsetY: parseInt(offsetY as any, 10) || 0,
      })
    )
  })
}
