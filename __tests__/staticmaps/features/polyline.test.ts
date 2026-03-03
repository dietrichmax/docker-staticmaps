import { Polyline } from "../../../src/staticmaps/features"
import * as utils from "../../../src/staticmaps/utils" // for mocking createGeodesicLine
import { Coordinate } from "../../../src/types/types"

describe("Polyline class", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  test("constructor sets coords, color, fill, width with defaults", () => {
    const coords: Coordinate[] = [
      [1, 2],
      [3, 4],
      [5, 6],
    ]

    const poly = new Polyline({ coords })

    // Geodesic interpolation preserves [lon, lat] order
    const inputStart = coords[0]
    const polyStart = poly.coords[0]
    expect(polyStart[0]).toBeCloseTo(inputStart[0], 9)
    expect(polyStart[1]).toBeCloseTo(inputStart[1], 9)

    const inputEnd = coords[coords.length - 1]
    const polyEnd = poly.coords[poly.coords.length - 1]
    expect(polyEnd[0]).toBeCloseTo(inputEnd[0], 9)
    expect(polyEnd[1]).toBeCloseTo(inputEnd[1], 9)

    expect(poly.coords.length).toBeGreaterThan(3) // more points due to interpolation
    expect(poly.color).toBe("#000000BB")
    expect(poly.fill).toBeUndefined()
    expect(poly.width).toBe(3)
    expect(poly.type).toBe("polyline")
  })

  test("constructor uses provided color, fill, width", () => {
    const coords: Coordinate[] = [
      [1, 2],
      [3, 4],
      [1, 2], // to make it polygon
    ]

    const poly = new Polyline({
      coords,
      color: "#FF0000AA",
      fill: "red",
      width: 5,
    })

    expect(poly.color).toBe("#FF0000AA")
    expect(poly.fill).toBe("red")
    expect(poly.width).toBe(5)
    expect(poly.type).toBe("polygon")
  })

  test("constructor detects polygon if first and last coords are equal", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
      [0, 0],
    ]
    const poly = new Polyline({ coords })
    expect(poly.type).toBe("polygon")
  })

  test("constructor detects polyline if first and last coords differ", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
      [2, 2],
    ]
    const poly = new Polyline({ coords })
    expect(poly.type).toBe("polyline")
  })

  test("constructor calls createGeodesicLine for exactly two coords", () => {
    const coords: Coordinate[] = [
      [10, 20],
      [30, 40],
    ]

    // Spy on createGeodesicLine and mock return value (already [lon, lat])
    const geodesicCoords: Coordinate[] = [
      [20, 10],
      [30, 40],
      [40, 30],
    ]
    const spy = jest
      .spyOn(utils, "createGeodesicLine")
      .mockReturnValue(geodesicCoords)

    const poly = new Polyline({ coords })

    // It should call createGeodesicLine once
    expect(spy).toHaveBeenCalledTimes(1)
    // createGeodesicLine returns [lon, lat] — no swap needed
    expect(poly.coords).toStrictEqual(geodesicCoords)
  })

  test("geodesic interpolation keeps coordinates in valid geographic range", () => {
    // Regression: a coordinate swap bug sent transatlantic routes to the south pole
    const coords: Coordinate[] = [
      [-3.7, 40.4], // Madrid [lon, lat]
      [-74, 40.7],  // New York [lon, lat]
    ]
    const poly = new Polyline({ coords })

    for (const [lon, lat] of poly.coords) {
      expect(lon).toBeGreaterThanOrEqual(-180)
      expect(lon).toBeLessThanOrEqual(180)
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
    }

    // Transatlantic route should curve north, all latitudes >= 40
    for (const [, lat] of poly.coords) {
      expect(lat).toBeGreaterThanOrEqual(39)
    }
  })

  test("withGeodesicLine=false skips geodesic interpolation", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [10, 10],
      [20, 20],
    ]
    const poly = new Polyline({ coords, withGeodesicLine: false })

    expect(poly.coords).toStrictEqual(coords)
    expect(poly.coords.length).toBe(3)
  })

  test("extent works with single coordinate", () => {
    const coords: Coordinate[] = [[2, 3]]
    const poly = new Polyline({ coords })
    expect(poly.extent()).toEqual([2, 3, 2, 3])
  })
})
