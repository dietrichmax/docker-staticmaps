import StaticMaps from "../staticmaps/staticmaps"
import { Text } from "../staticmaps/features"
import { forEachValidFeature } from "./adapterUtils"

/**
 * Adds text features to the given StaticMaps instance.
 *
 * Each text item must have at least one coordinate; otherwise it will be skipped with a warning.
 *
 * @param {StaticMaps} map - The StaticMaps instance to add text features to.
 * @param {Array<Object>} texts - Array of text configuration objects.
 */
export function addTexts(map: StaticMaps, texts: any[]): void {
  forEachValidFeature("text", texts, 1, (txt) => {
    const {
      coords,
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
    map.addText(
      new Text({
        coord: coords[0],
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
