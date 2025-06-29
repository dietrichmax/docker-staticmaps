import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { Text } from "../staticmaps/features"

/**
 * Adds text features to the given StaticMaps instance.
 *
 * Each text item must have at least one coordinate; otherwise it will be skipped with a warning.
 *
 * @param {StaticMaps} map - The StaticMaps instance to add text features to.
 * @param {Array<Object>} texts - Array of text configuration objects. Each should include:
 *   - `coords` {Array<[number, number]>} - Array with at least one coordinate tuple (lng, lat). Only the first coordinate is used.
 *   - `text` {string} - The text string to render.
 *   - `color` {string} - Text stroke color.
 *   - `width` {number} - Stroke width for the text outline.
 *   - `fill` {string} - Fill color for the text.
 *   - `size` {number} - Font size.
 *   - `font` {string} - Font family or font name.
 *   - `anchor` {string} - Anchor position for the text (e.g., "center", "left").
 *   - `offsetX` {number|string} - Horizontal offset in pixels (parsed to integer, defaults to 0).
 *   - `offsetY` {number|string} - Vertical offset in pixels (parsed to integer, defaults to 0).
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
