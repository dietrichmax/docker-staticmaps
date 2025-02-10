/**
 * Interface for Polyline options.
 */
interface PolylineOptions {
  /**
   * Array of coordinates where each coordinate is an array with two numbers representing longitude and latitude.
   */
  coords: [number, number][]

  /**
   * Optional color string in hexadecimal format (e.g., "#000000BB").
   * @default "#000000BB"
   */
  color?: string

  /**
   * Optional fill color for the polyline.
   */
  fill?: string

  /**
   * Optional width of the polyline.
   * @default 3
   */
  width?: number

  /**
   * Optional flag to simplify the polyline.
   * @default false
   */
  simplify?: boolean
}

/**
 * Class to handle Polyline operations.
 */
export default class Polyline {
  private coords: [number, number][]
  private color: string
  private fill?: string
  private width: number
  private simplify: boolean

  /**
   * Type of the polyline (either "polygon" or "polyline").
   */
  public readonly type: "polygon" | "polyline"

  /**
   * Constructor for the Polyline class.
   * @param options - Options for the polyline including coordinates, color, fill, width, and simplify flag.
   */
  constructor(options: PolylineOptions) {
    this.coords = options.coords
    this.color = options.color ?? "#000000BB"
    this.fill = options.fill
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3
    this.simplify = options.simplify || false

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
