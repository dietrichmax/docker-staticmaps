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

describe("lonToX()", () => {
  test("does not modify longitude inside [-180, 180]", () => {
    const lon = 100
    const zoom = 5
    const result = lonToX(lon, zoom)
    // Should be roughly the normalized tile X
    expect(result).toBeCloseTo(((lon + 180) / 360) * 2 ** zoom)
  })

  test("normalizes longitude > 180", () => {
    const lon = 200 // outside range
    const zoom = 3
    // normalized longitude: ((200+180)%360)-180 = (380%360)-180 = 20-180 = -160
    const expectedLon = -160
    const result = lonToX(lon, zoom)
    expect(result).toBeCloseTo(((expectedLon + 180) / 360) * 2 ** zoom)
  })

  test("normalizes longitude < -180", () => {
    const lon = -190 // outside range
    const zoom = 4
    // normalized longitude: ((-190 + 180)%360)-180 = (-10 % 360) - 180
    // JS modulo of negative numbers: (-10 % 360) === 350
    // So 350 - 180 = 170
    const expectedLon = 170
    const result = lonToX(lon, zoom)
    expect(result).toBeCloseTo(((expectedLon + 180) / 360) * 2 ** zoom)
  })
})

describe("latToY()", () => {
  test("does not modify latitude inside [-90, 90]", () => {
    const lat = 30
    const zoom = 5
    const result = latToY(lat, zoom)
    // Just check numeric output, no normalization needed
    expect(typeof result).toBe("number")
  })

  const MAX_LATITUDE = 85.05112878

  test("normalizes latitude > 90", () => {
    const lat = 100
    const zoom = 3
    const expectedLat = MAX_LATITUDE // clamp to max valid latitude
    const result = latToY(lat, zoom)
    const expectedResult = latToY(expectedLat, zoom)
    expect(result).toBeCloseTo(expectedResult)
  })

  test("normalizes latitude < -90", () => {
    const lat = -100
    const zoom = 4
    const expectedLat = -MAX_LATITUDE
    const result = latToY(lat, zoom)
    const expectedResult = latToY(expectedLat, zoom)
    expect(result).toBeCloseTo(expectedResult)
  })
})

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
  test("returns start and end points when delta is zero (start === end)", () => {
    const point: Coordinate = [48.8584, 2.2945] // Example: Eiffel Tower coordinates [lat, lon]

    const result = createGeodesicLine(point, point, 70)

    expect(result).toEqual([
      [point[1], point[0]], // [lon, lat]
      [point[1], point[0]],
    ])
  })
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
  test("smooths a simple line (1 iteration increases points)", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
      [2, 0],
    ]
    const smoothed = chaikinSmooth(coords, 1)
    expect(smoothed.length).toBeGreaterThan(coords.length)
  })

  test("returns original coords if less than 2 points", () => {
    const coords1: Coordinate[] = []
    const coords2: Coordinate[] = [[1, 1]]
    expect(chaikinSmooth(coords1, 3)).toEqual([])
    expect(chaikinSmooth(coords2, 3)).toEqual([[1, 1]])
  })

  test("uses default iterations=2 if not provided", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
      [2, 0],
    ]
    const smoothedDefault = chaikinSmooth(coords)
    const smoothedTwo = chaikinSmooth(coords, 2)
    expect(smoothedDefault).toEqual(smoothedTwo)
  })

  test("multiple iterations produce smoother curves", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
      [2, 0],
    ]
    const once = chaikinSmooth(coords, 1)
    const twice = chaikinSmooth(coords, 2)
    expect(twice.length).toBeGreaterThan(once.length)
  })

  test("first and last points remain unchanged after smoothing", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 2],
      [2, 0],
    ]
    const smoothed = chaikinSmooth(coords, 3)
    expect(smoothed[0]).toEqual(coords[0])
    expect(smoothed[smoothed.length - 1]).toEqual(coords[coords.length - 1])
  })
})

describe("douglasPeucker", () => {
  test("returns input if coords length < 3", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 1],
    ]
    expect(douglasPeucker(coords, 0.1)).toEqual(coords)
  })

  test("removes middle points on straight line when epsilon large", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
    ]
    const result = douglasPeucker(coords, 0.2)
    expect(result).toEqual([
      [0, 0],
      [1, 1],
    ])
  })

  test("keeps points off line when epsilon small", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [1, 0.1],
      [2, 0],
    ]
    const result = douglasPeucker(coords, 0.05)
    expect(result).toEqual(coords)
  })

  test("complex input keeps significant points and removes near-linear", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [0.5, 0.2],
      [1, 0],
      [1.5, -0.2],
      [2, 0],
    ]
    const epsilon = 0.1
    const result = douglasPeucker(coords, epsilon)
    expect(result).toEqual([
      [0, 0],
      [0.5, 0.2],
      [1.5, -0.2],
      [2, 0],
    ])
  })

  test("simplifies closed polygon with slight perturbation", () => {
    const coords: Coordinate[] = [
      [0, 0],
      [0.5, 0.01], // slight perturbation near edge
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]
    const result = douglasPeucker(coords, 0.05)
    expect(result[0]).toEqual(coords[0])
    expect(result[result.length - 1]).toEqual(coords[coords.length - 1])
    expect(result.length).toBeLessThan(coords.length) // Should remove the 0.5,0.01 point
  })
})
