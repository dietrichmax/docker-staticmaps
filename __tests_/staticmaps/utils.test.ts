// utils.test.ts
import { Coordinate } from "../../src/types/types"
import {
  lonToX,
  latToY,
  xToLon,
  yToLat,
  meterToPixel,
  workOnQueue,
  chunk,
  tileXYToQuadKey,
  createGeodesicLine,
  chaikinSmooth,
  douglasPeucker,
} from "../../src/staticmaps/utils"

describe("Coordinate conversions", () => {
  test("lonToX and xToLon are inverses", () => {
    const lon = 13.405
    const zoom = 10
    const x = lonToX(lon, zoom)
    const lonBack = xToLon(x, zoom)
    expect(lonBack).toBeCloseTo(lon, 5)
  })

  test("latToY and yToLat are inverses", () => {
    const lat = 52.52
    const zoom = 10
    const y = latToY(lat, zoom)
    const latBack = yToLat(y, zoom)
    expect(latBack).toBeCloseTo(lat, 5)
  })
})

describe("meterToPixel", () => {
  test("returns correct pixel size", () => {
    const pixels = meterToPixel(1000, 10, 52.52)
    expect(pixels).toBeGreaterThan(0)
  })
})

describe("workOnQueue", () => {
  test("runs async queue in order", async () => {
    const output: number[] = []
    const queue = [async () => output.push(1), async () => output.push(2)]
    const result = await workOnQueue(queue)
    expect(output).toEqual([1, 2])
    expect(result).toBe(true)
  })
})

describe("chunk", () => {
  test("splits array into chunks", () => {
    const input = [1, 2, 3, 4, 5]
    const chunks = chunk(input, 2)
    expect(chunks).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe("tileXYToQuadKey", () => {
  test("generates correct QuadKey", () => {
    const quadKey = tileXYToQuadKey(3, 5, 3)
    expect(quadKey).toBe("213")
  })
})

describe("createGeodesicLine", () => {
  test("returns expected number of segments", () => {
    const start: Coordinate = [52.52, 13.405]
    const end: Coordinate = [48.8566, 2.3522]
    const result = createGeodesicLine(start, end, 10)
    expect(result.length).toBe(11)
    expect(result[0].length).toBe(2)
  })

  test("returns correct result for same point", () => {
    const pt: Coordinate = [40, 20]
    const result = createGeodesicLine(pt, pt)
    expect(result.length).toBe(71)
    expect(result[0][0]).toBeCloseTo(20, 5)
    expect(result[0][1]).toBeCloseTo(40, 5)
  })
})

describe("chaikinSmooth", () => {
  test("smooths a line with Chaikin's algorithm", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
      [2, 0],
    ]
    const smoothed = chaikinSmooth(coords, 1)
    expect(smoothed.length).toBeGreaterThan(coords.length)
  })
})

describe("douglasPeucker", () => {
  test("simplifies line while preserving endpoints", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [0.5, 0.1],
      [1, 0],
    ]
    const simplified = douglasPeucker(coords, 0.2)
    expect(simplified.length).toBeLessThan(coords.length)
    expect(simplified[0]).toEqual([0, 0])
    expect(simplified[simplified.length - 1]).toEqual([1, 0])
  })

  test("returns input if length < 3", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
    ]
    expect(douglasPeucker(coords, 1)).toEqual(coords)
  })
})
