// utils.ts
import { Coordinate } from "src/types/types"
import logger from "../utils/logger"

/**
 * Transform longitude to tile number.
 *
 * @param lon - Longitude value.
 * @param zoom - Zoom level.
 * @returns The tile number corresponding to the given longitude at the specified zoom level.
 */
export function lonToX(lon: number, zoom: number): number {
  if (!(lon >= -180 && lon <= 180)) {
    lon = ((((lon + 180) % 360) + 360) % 360) - 180
  }
  return ((lon + 180) / 360) * Math.pow(2, zoom)
}

/**
 * Transform latitude to tile number.
 *
 * @param lat - Latitude value.
 * @param zoom - Zoom level.
 * @returns The tile number corresponding to the given latitude at the specified zoom level.
 */
export function latToY(lat: number, zoom: number): number {
  const MAX_LATITUDE = 85.05112878
  if (lat > MAX_LATITUDE) lat = MAX_LATITUDE
  if (lat < -MAX_LATITUDE) lat = -MAX_LATITUDE

  return (
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
    Math.pow(2, zoom)
  )
}

/**
 * Transform tile number to latitude.
 *
 * @param y - Tile number.
 * @param zoom - Zoom level.
 * @returns The latitude corresponding to the tile number at the specified zoom level.
 */
export function yToLat(y: number, zoom: number): number {
  return (
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / Math.pow(2, zoom)))) /
      Math.PI) *
    180
  )
}

/**
 * Transform tile number to longitude.
 *
 * @param x - Tile number.
 * @param zoom - Zoom level.
 * @returns The longitude corresponding to the tile number at the specified zoom level.
 */
export function xToLon(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360.0 - 180.0
}

/**
 * Convert meters to pixels at a given zoom level and latitude.
 *a
 * @param meter - Distance in meters.
 * @param zoom - Zoom level.
 * @param lat - Latitude at which to calculate the conversion.
 * @returns The equivalent pixel distance.
 */
export const meterToPixel = (
  meter: number,
  zoom: number,
  lat: number
): number => {
  const latitudeRadians = lat * (Math.PI / 180)
  const meterPerPixel = (156543.03392 * Math.cos(latitudeRadians)) / 2 ** zoom
  return meter / meterPerPixel
}

/**
 * Process a queue of async functions sequentially.
 *
 * @param queue - Array of async functions.
 * @param index - Current index (default is 0).
 * @returns A promise that resolves when the queue is processed.
 */
export const workOnQueue = async <T>(
  queue: (() => Promise<T>)[],
  index = 0
): Promise<boolean> => {
  if (!queue[index]) return true
  await queue[index]()
  return workOnQueue(queue, index + 1)
}

/**
 * Split an array into chunks of a specified size.
 *
 * @param array - The array to split.
 * @param size - The chunk size.
 * @returns A new array containing chunks.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

/**
 * Converts tile coordinates (x, y, z) to a QuadKey.
 *
 * @param {number} x - The x coordinate of the tile.
 * @param {number} y - The y coordinate of the tile.
 * @param {number} z - The zoom level of the tile.
 * @returns {string} - The corresponding QuadKey as a string.
 */
export function tileXYToQuadKey(x: number, y: number, z: number): string {
  const quadKey: string[] = []
  for (let i = z; i > 0; i--) {
    let digit = "0"
    const mask = 1 << (i - 1)
    if ((x & mask) !== 0) digit = (parseInt(digit) + 1).toString()
    if ((y & mask) !== 0) {
      digit = (parseInt(digit) + 2).toString()
    }
    quadKey.push(digit)
  }
  return quadKey.join("")
}

/**
 * Generate a geodesic line between two coordinates.
 * @param start - [lat, lon]
 * @param end - [lat, lon]
 * @param segments - Number of interpolation points
 * @returns Array of [lon, lat] points (for GeoJSON, static maps, etc.)
 */
export function createGeodesicLine(
  start: Coordinate,
  end: Coordinate,
  segments: number = 70
): Coordinate[] {
  const toRadians = (deg: number): number => (deg * Math.PI) / 180
  const toDegrees = (rad: number): number => (rad * 180) / Math.PI

  const lat1 = toRadians(start[0])
  const lon1 = toRadians(start[1])
  const lat2 = toRadians(end[0])
  const lon2 = toRadians(end[1])

  const delta = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  )

  if (delta === 0)
    return [
      [start[1], start[0]],
      [end[1], end[0]],
    ] // [lon, lat]

  const geodesic: Coordinate[] = []

  for (let i = 0; i <= segments; i++) {
    const f = i / segments
    const A = Math.sin((1 - f) * delta) / Math.sin(delta)
    const B = Math.sin(f * delta) / Math.sin(delta)

    const x =
      A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lon = Math.atan2(y, x)

    geodesic.push([toDegrees(lon), toDegrees(lat)]) // [lon, lat]
  }

  return geodesic
}

/**
 * Smooths a series of coordinates using the Chaikin's algorithm.
 *
 * @param {Array<Coordinate>} coords The input coordinates to smooth.
 * @param {number} [iterations=2] The number of iterations for smoothing.
 *
 * @returns {Array<Coordinate>} The smoothed set of coordinates.
 */
export function chaikinSmooth(
  coords: Coordinate[],
  iterations: number = 2
): Coordinate[] {
  if (coords.length < 2) return coords // early return for empty or single point

  for (let i = 0; i < iterations; i++) {
    const newCoords: Coordinate[] = []
    for (let j = 0; j < coords.length - 1; j++) {
      const [x0, y0] = coords[j]
      const [x1, y1] = coords[j + 1]
      const q: Coordinate = [0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1]
      const r: Coordinate = [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]
      newCoords.push(q, r)
    }
    coords = [coords[0], ...newCoords, coords[coords.length - 1]]
  }
  return coords
}

/**
 * Simplifies a series of coordinates using the Douglas-Peucker algorithm.
 *
 * @param {Array<Coordinate>} coords The input coordinates to simplify.
 * @param {number} epsilon The maximum distance allowed between original and simplified points.
 *
 * @returns {Array<Coordinate>} The simplified set of coordinates.
 */
/**
 * Simplifies a series of coordinates using the Douglas-Peucker algorithm.
 *
 * @param {Array<Coordinate>} coords The input coordinates to simplify.
 * @param {number} epsilon The maximum distance allowed between original and simplified points.
 *
 * @returns {Array<Coordinate>} The simplified set of coordinates.
 */
export function douglasPeucker(
  coords: Coordinate[],
  epsilon: number
): Coordinate[] {
  const dmax = (
    points: Coordinate[],
    from: number,
    to: number
  ): { index: number; dist: number } => {
    let maxDist = 0
    let index = from
    const [x1, y1] = points[from]
    const [x2, y2] = points[to]
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy

    for (let i = from + 1; i < to; i++) {
      const [x0, y0] = points[i]
      const t = len2 === 0 ? 0 : ((x0 - x1) * dx + (y0 - y1) * dy) / len2
      const px = x1 + t * dx
      const py = y1 + t * dy
      const dist = Math.sqrt((x0 - px) ** 2 + (y0 - py) ** 2)
      if (dist > maxDist) {
        index = i
        maxDist = dist
      }
    }
    return { index, dist: maxDist }
  }

  const simplify = (
    points: Coordinate[],
    from: number,
    to: number
  ): Coordinate[] => {
    const { index, dist } = dmax(points, from, to)
    if (dist > epsilon) {
      const rec1 = simplify(points, from, index)
      const rec2 = simplify(points, index, to)
      return rec1.slice(0, -1).concat(rec2)
    } else {
      return [points[from], points[to]]
    }
  }

  if (coords.length < 3) return coords
  return simplify(coords, 0, coords.length - 1)
}

/**
 * Validates and normalizes a strokeDasharray option.
 *
 * Ensures the value is an array of non-negative numbers.
 * Throws an error if the validation fails.
 *
 * @param {any} strokeDasharray - The strokeDasharray value to validate.
 * @returns {number[]} The validated strokeDasharray array.
 * @throws {Error} If strokeDasharray is not an array of non-negative numbers.
 */
export function normalizeStrokeDasharray(strokeDasharray: any): number[] {
  if (strokeDasharray === undefined) {
    return []
  }
  if (
    Array.isArray(strokeDasharray) &&
    strokeDasharray.every(
      (n) => typeof n === "number" && n >= 0 && Number.isFinite(n)
    )
  ) {
    return strokeDasharray
  }
  throw new Error(
    "Invalid strokeDasharray: must be an array of non-negative finite numbers"
  )
}
