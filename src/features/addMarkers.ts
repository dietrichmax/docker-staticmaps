import logger from "../utils/logger"
import StaticMaps from "../staticmaps/staticmaps"
import { IconMarker } from "../staticmaps/features"

/**
 * Add all marker features to the map.
 *
 * @param map - StaticMaps instance
 * @param markers - Array of marker configs
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
