/**
 * Interface for MultiPolygon options.
 */

export interface MultiPolygonOptions {
  coords: number[][][]
  color?: string
  fill?: boolean
  width?: number
  simplify?: boolean
}

/**
 * Class to handle MultiPolygon operations.
 */
export default class MultiPolygon {
  private coords: number[][][]
  private color: string
  private fill?: boolean
  private width: number
  private simplify: boolean

  /**
   * Constructor for the MultiPolygon class.
   * @param options - MultiPolygon options including coordinates, color, fill, width, and simplify flag.
   */
  constructor(options: MultiPolygonOptions) {
    this.coords = options.coords
    this.color = options.color || "#000000BB"
    this.fill = options.fill
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3
    this.simplify = options.simplify ?? true
  }

  /**
   * Calculate the coordinates of the envelope / bounding box: (min_lon, min_lat, max_lon, max_lat)
   * @returns An array representing the extent [min_lon, min_lat, max_lon, max_lat].
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
