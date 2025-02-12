// utils.ts

/**
 * Transform longitude to tile number.
 *
 * @param lon - Longitude value.
 * @param zoom - Zoom level.
 * @returns The tile number corresponding to the given longitude at the specified zoom level.
 */
export function lonToX(lon: number, zoom: number): number {
  if (!(lon >= -180 && lon <= 180)) {
    lon = ((lon + 180) % 360) - 180
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
  if (!(lat >= -90 && lat <= 90)) {
    lat = ((lat + 90) % 180) - 90
  }

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
 * Smooth a list of points using a moving average filter.
 *
 * @param points - List of [x, y] coordinate pairs.
 * @param windowSize - Number of points to average.
 * @returns Smoothed list of points.
 */
export function simplify(
  points: [number, number][],
  windowSize = 3
): [number, number][] {
  if (!points || points.length <= 2) return points

  const smoothedPoints: [number, number][] = []

  for (let i = 0; i < points.length; i++) {
    let xSum = 0,
      ySum = 0,
      count = 0

    for (
      let j = -Math.floor(windowSize / 2);
      j <= Math.floor(windowSize / 2);
      j++
    ) {
      const index = i + j
      if (index >= 0 && index < points.length) {
        xSum += points[index][0]
        ySum += points[index][1]
        count++
      }
    }

    smoothedPoints.push([xSum / count, ySum / count])
  }

  return smoothedPoints
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
export const workOnQueue = async (
  queue: (() => Promise<void>)[],
  index = 0
): Promise<boolean> => {
  if (!queue[index]) return true // Finished
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
