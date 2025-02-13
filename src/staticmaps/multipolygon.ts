/**
 * Interface for MultiPolygon options.
 */

export interface MultiPolygonOptions {
  coords: number[][][]
  color?: string
  fill?: boolean
  width?: number
}

/**
 * Class to handle MultiPolygon operations.
 */
export default class MultiPolygon {
  coords: number[][][]
  color: string
  fill?: boolean
  width: number

  /**
   * Constructor for the MultiPolygon class.
   * @param options - MultiPolygon options including coordinates, color, fill, width flag.
   */
  constructor(options: MultiPolygonOptions) {
    this.coords = options.coords
    this.color = options.color || "#000000BB"
    this.fill = options.fill
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3
  }

  /**
   * Calculates the extent of the MultiPolygon.
   *
   * @returns {Array<number>} - The bounding box of the MultiPolygon: [minLon, minLat, maxLon, maxLat]
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
