import { createGeodesicLine } from "./utils"
import { PolylineOptions, Coordinate } from "../types/types"

/**
 * Class to handle Polyline operations.
 */
export default class Polyline {
  coords: Coordinate[]
  color: string
  fill?: string
  width: number

  /**
   * Type of the polyline (either "polygon" or "polyline").
   */
  public readonly type: "polygon" | "polyline"

  /**
   * Constructor for the Polyline class.
   * @param options - Options for the polyline including coordinates, color, fill, width flag.
   */
  constructor(options: PolylineOptions) {
    this.coords = options.coords
    this.color = options.color ?? "#000000BB"
    this.fill = options.fill
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3

    this.coords =
      options.coords.length === 2
        ? (() => {
            const fixedStart: Coordinate = [
              this.coords[0][1],
              this.coords[0][0],
            ]
            const fixedEnd: Coordinate = [this.coords[1][1], this.coords[1][0]]
            createGeodesicLine(this.coords[0], this.coords[1])
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
   * Calculate the coordinates of the envelope / bounding box: [min_lon, min_lat, max_lon, max_lat].
   * @returns An array containing the minimum and maximum longitude and latitude values.
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
