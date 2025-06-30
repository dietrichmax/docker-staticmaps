import { MultiPolygonOptions } from "../../types/types"
import { normalizeStrokeDasharray } from "../utils"

/**
 * Represents a MultiPolygon shape with optional fill and stroke styles.
 */
export default class MultiPolygon {
  coords: number[][][]
  color: string
  fill?: string
  width: number
  strokeDasharray?: number[] 

  /**
   * Creates a new MultiPolygon instance.
   *
   * @param {MultiPolygonOptions} options - Configuration for the MultiPolygon.
   * @param {number[][][]} options.coords - Array of polygon rings, where each ring is an array of [lon, lat] coordinates.
   * @param {string} [options.color="#000000BB"] - Stroke color for the polygon edges.
   * @param {string} [options.fill] - Optional fill color for the polygons.
   * @param {number} [options.width=3] - Stroke width in pixels.
   * @param {number[]} [options.strokeDasharray] - Optional stroke dash pattern, as an array of non-negative numbers.
   *
   * @throws {Error} If required parameters are missing or invalid.
   */
  constructor(options: MultiPolygonOptions) {
    this.coords = options.coords
    this.color = options.color || "#000000BB"
    this.fill = options.fill
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3
    this.strokeDasharray = normalizeStrokeDasharray(options.strokeDasharray)
  }

  /**
   * Calculates the bounding box that contains all coordinates of the MultiPolygon.
   *
   * @returns {[number, number, number, number]} Bounding box as [minLon, minLat, maxLon, maxLat].
   */
  extent(): [number, number, number, number] {
    const allPoints = this.coords.flat() // Flattening the coordinates array

    return [
      Math.min(...allPoints.map((c) => c[0])),
      Math.min(...allPoints.map((c) => c[1])),
      Math.max(...allPoints.map((c) => c[0])),
      Math.max(...allPoints.map((c) => c[1])),
    ]
  }
}
