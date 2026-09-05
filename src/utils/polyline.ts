/**
 * Decodes a Google encoded polyline string into coordinate pairs.
 *
 * Implements the Encoded Polyline Algorithm Format:
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * Values are stored as signed offsets from the previous coordinate, zig-zag
 * encoded into 5-bit chunks where a set 0x20 bit marks a continuation chunk.
 *
 * @param {string} str - The encoded polyline string.
 * @param {number} [precision=5] - Decimal places the coordinates were encoded with.
 * @returns {[number, number][]} Coordinates as [latitude, longitude] tuples.
 */
export function decodePolyline(
  str: string,
  precision: number = 5
): [number, number][] {
  const factor = Math.pow(10, precision)
  const coordinates: [number, number][] = []
  let index = 0
  let lat = 0
  let lon = 0

  const readOffset = (): number => {
    let shift = 1
    let result = 0
    let byte = 0

    do {
      byte = str.charCodeAt(index++) - 63
      result += (byte & 0x1f) * shift
      shift *= 32
    } while (byte >= 0x20)

    return result & 1 ? (-result - 1) / 2 : result / 2
  }

  while (index < str.length) {
    lat += readOffset()
    lon += readOffset()
    coordinates.push([lat / factor, lon / factor])
  }

  return coordinates
}
