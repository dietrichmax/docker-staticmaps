import StaticMaps from "../staticmaps/staticmaps"
import { Circle } from "../staticmaps/features"
import { forEachValidFeature } from "./adapterUtils"

/**
 * Adds circle features to a StaticMaps instance based on the provided configurations.
 *
 * Each circle config should include coordinates, radius, and styling options.
 * Circles without valid coordinates are skipped with a warning.
 *
 * @param {StaticMaps} map - The StaticMaps instance to which circles will be added.
 * @param {Array<Object>} circles - An array of circle configuration objects.
 */
export function addCircles(map: StaticMaps, circles: any[]): void {
  forEachValidFeature("circle", circles, 1, (circ) => {
    const { coords, radius, color, width, fill } = circ
    map.addCircle(new Circle({ coord: coords[0], radius, color, width, fill }))
  })
}
