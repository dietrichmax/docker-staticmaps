import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { IconMarker } from "../staticmaps/features"

/**
 * Adds marker features to the map based on provided marker configurations.
 *
 * Each marker config may contain multiple coordinates; an IconMarker is added
 * for each coordinate with the given styling and image parameters.
 *
 * @param {StaticMaps} map - The StaticMaps instance to which markers will be added.
 * @param {Array<Object>} markers - Array of marker configuration objects. Each marker may include:
 *   - `coords` {Array<[number, number]>} - Array of coordinate tuples [lng, lat].
 *   - `img` {string} - URL or path to marker icon image.
 *   - `width` {number} - Width of the marker icon.
 *   - `height` {number} - Height of the marker icon.
 *   - `offsetX` {number} - Horizontal offset for icon positioning.
 *   - `offsetY` {number} - Vertical offset for icon positioning.
 *   - `color` {string} - Color override for the marker.
 *   - `resizeMode` {string} - Resize mode for the marker image.
 *   - `drawWidth` {number} - Width to draw the icon on the map.
 *   - `drawHeight` {number} - Height to draw the icon on the map.
 */
export function addMarkers(map: StaticMaps, markers: any[]): void {
  markers.forEach((marker, i) => {
    const {
      coords = [],
      img,
      width,
      height,
      offsetX,
      offsetY,
      color,
      resizeMode,
      drawWidth,
      drawHeight,
    } = marker
    coords.forEach((coord: any, j: number) => {
      logger.debug(`Adding marker [${i}][${j}]`, marker)
      map.addMarker(
        new IconMarker({
          coord,
          img,
          width,
          height,
          offsetX,
          offsetY,
          color,
          resizeMode,
          drawWidth,
          drawHeight,
        })
      )
    })
  })
}
