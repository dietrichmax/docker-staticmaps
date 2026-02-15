import { Coordinate, BBox, HasExtent } from "src/types/types"

/**
 * Represents a bounding box or envelope for a set of coordinates.
 */
export default class Bound implements HasExtent {
  /**
   * Options passed to the Bound instance.
   * @type {{ coords: Coordinate[] }}
   */
  options: { coords: Coordinate[] }
  coords: Coordinate[]

  /**
   * Creates a new Bound instance with the provided options.
   *
   * @param options - An object containing the coordinates.
   * @param options.coords - An array of coordinate pairs (longitude, latitude).
   */
  constructor(options: { coords: Coordinate[] }) {
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
  extent(): BBox {
    if (!this.coords || this.coords.length === 0) {
      throw Error("Coordinates are required to calculate the bounding box.")
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
