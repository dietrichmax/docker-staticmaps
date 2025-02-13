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

/**
 * Creates a geodesic (great circle) line between two coordinates.
 *
 * @param start - Starting coordinate as [latitude, longitude] in degrees.
 * @param end - Ending coordinate as [latitude, longitude] in degrees.
 * @param segments - Optional number of segments to divide the route into (default is 50).
 * @returns An array of coordinates [latitude, longitude] in degrees along the geodesic.
 */
export function createGeodesicLine(
  start: [number, number],
  end: [number, number],
  segments: number = 24
): [number, number][] {
  // Helper functions for conversion
  const toRadians = (deg: number): number => (deg * Math.PI) / 180;
  const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

  // Convert start and end coordinates from degrees to radians
  const lat1 = toRadians(start[0]);
  const lon1 = toRadians(start[1]);
  const lat2 = toRadians(end[0]);
  const lon2 = toRadians(end[1]);

  // Calculate the angular distance using the spherical law of cosines
  const delta = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  // If the two points are identical (or extremely close), return the endpoints.
  if (delta === 0) {
    return [start, end];
  }

  // Array to hold the geodesic points
  const geodesicPoints: [number, number][] = [];

  // Generate points along the great circle using spherical linear interpolation (slerp)
  for (let i = 0; i <= segments; i++) {
    const f = i / segments; // fraction along the route

    // Interpolation coefficients
    const A = Math.sin((1 - f) * delta) / Math.sin(delta);
    const B = Math.sin(f * delta) / Math.sin(delta);

    // Compute the interpolated point in Cartesian coordinates (on the unit sphere)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    // Convert the Cartesian point back to latitude and longitude (in radians)
    const latInterp = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lonInterp = Math.atan2(y, x);

    // Convert back to degrees and store the result
    geodesicPoints.push([toDegrees(latInterp), toDegrees(lonInterp)]);
  }

  return geodesicPoints;
}
