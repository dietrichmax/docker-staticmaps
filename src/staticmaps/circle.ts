/**
 * Represents a circle with a center coordinate, radius, color, fill, and line width.
 */
export default class Circle {
  private coord: [number, number]
  private radius: number
  private color: string
  private fill: string
  private width: number

  /**
   * Creates a new Circle instance with the provided options.
   *
   * @param options - An object containing the circle's properties.
   * @param options.coord - The center coordinate of the circle as [longitude, latitude].
   * @param options.radius - The radius of the circle in meters.
   * @param options.color - The color of the circle's outline (default: "#000000BB").
   * @param options.fill - The fill color of the circle (default: "#AA0000BB").
   * @param options.width - The width of the circle's outline in pixels (default: 3).
   */
  constructor(options: {
    coord: [number, number]
    radius: number
    color?: string
    fill?: string
    width?: number
  }) {
    this.coord = options.coord
    this.radius = Number(options.radius)
    this.color = options.color || "#000000BB"
    this.fill = options.fill || "#AA0000BB"
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3

    if (!this.coord || !Array.isArray(this.coord) || this.coord.length < 2) {
      throw Error("Specify center of circle")
    }
    if (!this.radius || isNaN(this.radius)) {
      throw Error("Specify valid radius for circle")
    }
  }

  /**
   * Calculates the bounding box coordinates for the circle.
   *
   * The bounding box is represented as a tuple in the format:
   * (min_lon, min_lat, max_lon, max_lat).
   *
   * @returns A tuple representing the bounding box: [minLon, minLat, maxLon, maxLat].
   */
  extent(): [number, number, number, number] {
    const [lon, lat] = this.coord

    // Convert radius from meters to degrees (latitude and longitude scale factors)
    const radiusInDegreesLat = this.radius / 111320 // Conversion factor for latitude (1 degree ~ 111320 meters)
    const radiusInDegreesLon =
      this.radius / (Math.cos((lat * Math.PI) / 180) * 111320) // Longitude scaling factor

    // Calculate bounding box coordinates
    const minLon = lon - radiusInDegreesLon
    const maxLon = lon + radiusInDegreesLon
    const minLat = lat - radiusInDegreesLat
    const maxLat = lat + radiusInDegreesLat

    return [minLon, minLat, maxLon, maxLat]
  }
}
