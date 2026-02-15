import StaticMaps from "../staticmaps/staticmaps"
import { Polyline } from "../staticmaps/features"
import { forEachValidFeature } from "./adapterUtils"

/**
 * Adds polyline or polygon features to the given StaticMaps instance.
 *
 * Each item must have at least two coordinate points; otherwise, it will be skipped with a warning.
 * When `isPolygon` is true, items are added as polygons; otherwise, as polylines.
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
  const featureType = isPolygon ? "polygon" : "polyline"
  forEachValidFeature(featureType, items, 2, (item) => {
    const { coords, color, weight, fill, strokeDasharray, withGeodesicLine } = item
    const shape = new Polyline({
      coords,
      color,
      width: weight,
      fill,
      strokeDasharray,
      withGeodesicLine,
    })
    isPolygon ? map.addPolygon(shape) : map.addLine(shape)
  })
}
