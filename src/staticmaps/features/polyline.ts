import { createGeodesicLine, normalizeStrokeDasharray } from "../utils"
import { PolylineOptions, Coordinate } from "../../types/types"

/**
 * Represents a polyline or polygon with optional styling.
 *
 * If exactly two coordinates are provided, a geodesic line is generated between them.
 * If the first and last coordinate are the same, the polyline is treated as a polygon.
 */
export default class Polyline {
  coords: Coordinate[]
  color: string
  fill?: string
  width: number
  strokeDasharray?: number[] 

  /**
   * Indicates whether this shape is a `"polyline"` or a `"polygon"`.
   */
  public readonly type: "polygon" | "polyline"

  /**
   * Creates a new Polyline instance.
   *
   * @param {PolylineOptions} options - Configuration options for the polyline.
   * @param {Coordinate[]} options.coords - Array of coordinates ([lon, lat]) defining the polyline or polygon.
   * @param {string} [options.color="#000000BB"] - Stroke color of the polyline.
   * @param {string} [options.fill] - Optional fill color, used if the polyline is a polygon.
   * @param {number} [options.width=3] - Stroke width in pixels.
   * @param {number[]} [options.strokeDasharray] - Optional stroke dash pattern, as an array of non-negative numbers.
   *
   * @throws {Error} If invalid coordinates are provided.
   */
  constructor(options: PolylineOptions) {
    this.coords = options.coords
    this.color = options.color ?? "#000000BB"
    this.fill = options.fill
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3
    this.strokeDasharray = normalizeStrokeDasharray(options.strokeDasharray)

    // Convert to geodesic line if only two coordinates are given
    this.coords =
      options.coords.length === 2
        ? (() => {
            const fixedStart: Coordinate = [this.coords[0][1], this.coords[0][0]]
            const fixedEnd: Coordinate = [this.coords[1][1], this.coords[1][0]]
            const geodesicCoords = createGeodesicLine(fixedStart, fixedEnd)
            return geodesicCoords
          })() // Immediately Invoked Function Expression (IIFE) to execute the logic
        : options.coords // Assuming this is already of type `number[][]`*/

    // Determine whether it's a polygon or polyline
    const firstCoord = this.coords[0]
    const lastCoord = this.coords[this.coords.length - 1]
    this.type =
      firstCoord &&
      lastCoord &&
      firstCoord[0] === lastCoord[0] &&
      firstCoord[1] === lastCoord[1]
        ? "polygon"
        : "polyline"
  }

  /**
   * Calculates the bounding box of the polyline or polygon.
   *
   * @returns {[number, number, number, number]} Bounding box as [minLon, minLat, maxLon, maxLat].
   */
  extent(): [number, number, number, number] {
    return [
      Math.min(...this.coords.map((c) => c[0])),
      Math.min(...this.coords.map((c) => c[1])),
      Math.max(...this.coords.map((c) => c[0])),
      Math.max(...this.coords.map((c) => c[1])),
    ]
  }
}
