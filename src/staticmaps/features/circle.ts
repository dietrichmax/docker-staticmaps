import { Coordinate, BBox, HasExtent } from "../../types/types"
import { METERS_PER_DEGREE_LAT } from "../utils"

/**
 * Represents a circle shape with styling and geometry.
 */
export default class Circle implements HasExtent {
  coord: Coordinate
  radius: number
  color: string
  fill: string
  width: number
  strokeDasharray?: number[]

  /**
   * Creates a new Circle instance.
   *
   * @param {Object} options - Configuration options for the circle.
   * @param {Coordinate} options.coord - Center coordinate of the circle as [longitude, latitude].
   * @param {number} options.radius - Radius of the circle in meters.
   * @param {string} [options.color="#000000BB"] - Stroke color of the circle.
   * @param {string} [options.fill=options.color] - Fill color of the circle.
   * @param {number} [options.width=3] - Stroke width of the circle outline in pixels.
   *
   * @throws {Error} If coord is invalid or radius is not a valid number.
   */
  constructor(options: {
    coord: Coordinate
    radius: number
    color?: string
    fill?: string
    width?: number
    strokeDasharray?: number[]
  }) {
    this.coord = options.coord
    this.radius = Number(options.radius)
    this.color = options.color || "#000000BB"
    this.fill = options.fill || this.color
    this.width = Number.isFinite(options.width) ? Number(options.width) : 3

    if (!this.coord || !Array.isArray(this.coord) || this.coord.length < 2) {
      throw Error("Specify center of circle")
    }
    if (isNaN(this.radius) || this.radius < 0) {
      throw Error("Specify valid radius for circle")
    }
  }

  /**
   * Calculates the bounding box of the circle.
   *
   * @returns {[number, number, number, number]} Bounding box as [minLon, minLat, maxLon, maxLat].
   */
  extent(): BBox {
    const [lon, lat] = this.coord

    // Convert radius from meters to degrees (latitude and longitude scale factors)
    const radiusInDegreesLat = this.radius / METERS_PER_DEGREE_LAT
    const radiusInDegreesLon =
      this.radius / (Math.cos((lat * Math.PI) / 180) * METERS_PER_DEGREE_LAT)

    // Calculate bounding box coordinates
    const minLon = lon - radiusInDegreesLon
    const maxLon = lon + radiusInDegreesLon
    const minLat = lat - radiusInDegreesLat
    const maxLat = lat + radiusInDegreesLat

    return [minLon, minLat, maxLon, maxLat]
  }
}
