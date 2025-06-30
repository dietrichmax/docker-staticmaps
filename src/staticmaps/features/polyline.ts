import { createGeodesicLine, normalizeStrokeDasharray } from "../utils"
import { PolylineOptions, Coordinate } from "../../types/types"
import logger from "../../utils/logger"

/**
 * Represents a polyline or polygon with optional styling.
 *
 * For each pair of coordinates in the input, a geodesic line is generated between them.
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

    // Determine whether it's a polygon or polyline
    const firstCoord = options.coords[0]
    const lastCoord = options.coords[options.coords.length - 1]
    this.type =
      firstCoord &&
      lastCoord &&
      firstCoord[0] === lastCoord[0] &&
      firstCoord[1] === lastCoord[1]
        ? "polygon"
        : "polyline"

    // Generate geodesic segments only for polylines
    if (this.type === "polyline" && options.coords.length >= 2) {
      const segments: Coordinate[] = []

      for (let i = 0; i < options.coords.length - 1; i++) {
        const start = options.coords[i]
        const end = options.coords[i + 1]

        // Convert to [lat, lon] for geodesic line generation
        const geodesicSegment: Coordinate[] = createGeodesicLine(
          [start[1], start[0]],
          [end[1], end[0]]
        ).map(([lat, lon]) => [lon, lat]) // Convert back to [lon, lat]

        // Avoid duplicate points
        if (segments.length > 0) geodesicSegment.shift()
        segments.push(...geodesicSegment)
      }

      this.coords = segments
    } else {
      this.coords = options.coords
    }
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
