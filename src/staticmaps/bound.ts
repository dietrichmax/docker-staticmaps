import logger from "../utils/logger.js"

/**
 * Represents a bounding box or envelope for a set of coordinates.
 */
export default class Bound {
  /**
   * Options passed to the Bound instance.
   * @type {{ coords: [number, number][] }}
   */
  private options: { coords: [number, number][] }

  /**
   * The coordinates used to calculate the bounding box.
   * @type {[number, number][]}
   */
  private coords: [number, number][]

  /**
   * Creates a new Bound instance with the provided options.
   *
   * @param options - An object containing the coordinates.
   * @param options.coords - An array of coordinate pairs (longitude, latitude).
   */
  constructor(options: { coords: [number, number][] }) {
    this.options = options
    this.coords = options.coords
  }

  /**
   * Calculates the bounding box for the given coordinates.
   *
   * The bounding box is represented as a tuple in the format:
   * (min_lon, min_lat, max_lon, max_lat).
   *
   * @returns A tuple representing the bounding box: [minLon, minLat, maxLon, maxLat].
   */
  extent(): [number, number, number, number] {
    if (!this.coords || this.coords.length === 0) {
      logger.error("Coordinates are required to calculate the bounding box.")
    }

    let minLon = Infinity
    let minLat = Infinity
    let maxLon = -Infinity
    let maxLat = -Infinity

    for (const [lon, lat] of this.coords) {
      if (lon < minLon) minLon = lon
      if (lat < minLat) minLat = lat
      if (lon > maxLon) maxLon = lon
      if (lat > maxLat) maxLat = lat
    }

    return [minLon, minLat, maxLon, maxLat]
  }
}
