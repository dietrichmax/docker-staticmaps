import { determineExtent, calculateZoom } from "../../src/staticmaps/staticmaps"
import { Polyline, Circle, Text, Bound } from "../../src/staticmaps/features"

describe("determineExtent (standalone)", () => {
  const emptyInput = {
    center: [],
    bounds: [],
    lines: [],
    circles: [],
    text: [],
    markers: [],
    tileSize: 256,
  }

  it("returns Infinity box when no features", () => {
    const result = determineExtent(emptyInput)
    expect(result[0]).toBe(Infinity)
    expect(result[3]).toBe(-Infinity)
  })

  it("computes extent from a single polyline", () => {
    const line = new Polyline({
      coords: [
        [10, 20],
        [30, 40],
      ],
      withGeodesicLine: false,
    })
    const result = determineExtent({ ...emptyInput, lines: [line] })
    expect(result[0]).toBe(10) // minLon
    expect(result[1]).toBe(20) // minLat
    expect(result[2]).toBe(30) // maxLon
    expect(result[3]).toBe(40) // maxLat
  })

  it("computes extent from a circle", () => {
    const circle = new Circle({ coord: [10, 50], radius: 1000 })
    const result = determineExtent({ ...emptyInput, circles: [circle] })
    expect(result[0]).toBeLessThan(10)
    expect(result[1]).toBeLessThan(50)
    expect(result[2]).toBeGreaterThan(10)
    expect(result[3]).toBeGreaterThan(50)
  })

  it("combines extents from multiple feature types", () => {
    const line = new Polyline({
      coords: [
        [0, 0],
        [1, 1],
      ],
      withGeodesicLine: false,
    })
    const circle = new Circle({ coord: [10, 50], radius: 100 })
    const result = determineExtent({
      ...emptyInput,
      lines: [line],
      circles: [circle],
    })
    expect(result[0]).toBeLessThan(1) // includes line's min
    expect(result[2]).toBeGreaterThan(9) // includes circle's max
  })

  it("includes center as extent when it has 4 elements", () => {
    const result = determineExtent({
      ...emptyInput,
      center: [5, 10, 15, 20],
    })
    expect(result).toEqual([5, 10, 15, 20])
  })

  it("ignores center when it has 2 elements", () => {
    const result = determineExtent({
      ...emptyInput,
      center: [5, 10],
    })
    // Should be Infinity since no features and center not a bbox
    expect(result[0]).toBe(Infinity)
  })

  it("computes marker extent as point when no zoom", () => {
    const marker = { coord: [10, 50], extentPx: () => [14, 0, 14, 28] } as any
    const result = determineExtent({ ...emptyInput, markers: [marker] })
    expect(result).toEqual([10, 50, 10, 50])
  })

  it("expands marker extent using pixel size when zoom is provided", () => {
    const marker = { coord: [10, 50], extentPx: () => [14, 0, 14, 28] } as any
    const result = determineExtent({ ...emptyInput, markers: [marker] }, 10)
    // With zoom, the extent should be wider than just the point
    expect(result[0]).toBeLessThan(10)
    expect(result[2]).toBeGreaterThan(10)
  })

  it("throws if marker has undefined coord", () => {
    const marker = { coord: undefined } as any
    expect(() =>
      determineExtent({ ...emptyInput, markers: [marker] })
    ).toThrow("Marker coordinates undefined")
  })
})

describe("calculateZoom (standalone)", () => {
  const baseInput = {
    center: [],
    bounds: [],
    lines: [],
    circles: [],
    text: [],
    markers: [],
    tileSize: 256,
    zoomRange: { min: 1, max: 17 },
    width: 800,
    height: 600,
    padding: [0, 0],
  }

  it("returns min zoom when no features", () => {
    expect(calculateZoom(baseInput)).toBe(1)
  })

  it("returns a reasonable zoom for a small feature area", () => {
    const line = new Polyline({
      coords: [
        [10, 50],
        [10.001, 50.001],
      ],
      withGeodesicLine: false,
    })
    const zoom = calculateZoom({ ...baseInput, lines: [line] })
    expect(zoom).toBeGreaterThan(10) // Small area = high zoom
    expect(zoom).toBeLessThanOrEqual(17)
  })

  it("returns lower zoom for a large feature area", () => {
    const line = new Polyline({
      coords: [
        [-50, -40],
        [50, 40],
      ],
      withGeodesicLine: false,
    })
    const zoom = calculateZoom({ ...baseInput, lines: [line] })
    expect(zoom).toBeLessThan(5) // Large area = low zoom
  })

  it("respects custom zoomRange", () => {
    const line = new Polyline({
      coords: [
        [10, 50],
        [10.001, 50.001],
      ],
      withGeodesicLine: false,
    })
    const zoom = calculateZoom({
      ...baseInput,
      lines: [line],
      zoomRange: { min: 5, max: 8 },
    })
    expect(zoom).toBeGreaterThanOrEqual(5)
    expect(zoom).toBeLessThanOrEqual(8)
  })
})
