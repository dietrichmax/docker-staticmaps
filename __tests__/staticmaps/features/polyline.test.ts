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
  ];

  const poly = new Polyline({ coords });

  // Polyline constructor swaps x/y in output?
  const inputStart = coords[0];
  const polyStart = poly.coords[0];
  expect(polyStart[0]).toBeCloseTo(inputStart[1], 9); // poly x ~ input y
  expect(polyStart[1]).toBeCloseTo(inputStart[0], 9); // poly y ~ input x

  const inputEnd = coords[coords.length - 1];
  const polyEnd = poly.coords[poly.coords.length - 1];
  expect(polyEnd[0]).toBeCloseTo(inputEnd[1], 9);
  expect(polyEnd[1]).toBeCloseTo(inputEnd[0], 9);

  expect(poly.coords.length).toBeGreaterThan(3);  // more points due to interpolation
  expect(poly.color).toBe("#000000BB");
  expect(poly.fill).toBeUndefined();
  expect(poly.width).toBe(3);
  expect(poly.type).toBe("polyline");
});



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

  test("constructor calls createGeodesicLine for exactly two coords and swaps lat/lon", () => {
    const coords: Coordinate[] = [
      [10, 20],
      [30, 40],
    ]

    // Spy on createGeodesicLine and mock return value
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
    const swappedCoords = geodesicCoords.map(([lat, lon]) => [lon, lat]);
    expect(poly.coords).toStrictEqual(swappedCoords);
  })

  /*test("extent calculates bounding box correctly", () => {
    const coords: Coordinate[] = [
      [-10, 20],
      [30, 40],
      [5, 15],
      [25, 35],
    ]
    const poly = new Polyline({ coords })
    const extent = poly.extent()
    expect(extent).toEqual([-10, 15, 30, 40])
  })*/

  test("extent works with single coordinate", () => {
    const coords: Coordinate[] = [[2, 3]]
    const poly = new Polyline({ coords })
    expect(poly.extent()).toEqual([2, 3, 2, 3])
  })
})
