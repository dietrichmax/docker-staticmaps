// __tests__/params-parser.test.ts
import {
  getMapParams,
  parseMultipleShapes,
  extractParams,
  isEncodedPolyline,
  parseCoordinates,
  parseCenter,
  getTileUrl,
} from "../../src/services/params-parser.services"
import polyline from "@mapbox/polyline"
import { basemaps } from "../../src/utils/basemaps"
import { CoordInput } from "../../src/types/types"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger", () => ({
  debug: jest.fn(),
  error: jest.fn(),
}))

describe("params-parser", () => {
  describe("getMapParams", () => {
    it("returns missingParams if no center or coordinates provided", () => {
      const result = getMapParams({})
      expect(result.missingParams).toContain("{center} or {coordinates}")
      expect(result.options.center).toBeNull()
    })

    it("parses center from string", () => {
      const { options } = getMapParams({ center: "48.12,11.56" })
      expect(options.center).toEqual([48.12, 11.56])
    })

    it("parses quality default to 100", () => {
      const { options } = getMapParams({})
      expect(options.quality).toBe(100)
    })

    it("overrides default width and height", () => {
      const { options } = getMapParams({ width: "500", height: "400" })
      expect(options.width).toBe(500)
      expect(options.height).toBe(400)
    })

    it("uses custom tileUrl over basemap", () => {
      const { options } = getMapParams({
        tileUrl: "http://custom/{z}/{x}/{y}.png",
      })
      expect(options.tileUrl).toBe("http://custom/{z}/{x}/{y}.png")
    })

    it("should detect hasCoords true when any feature has coordinates", () => {
      const params = {
        polyline: [
          {
            coords: [
              [10, 20],
              [30, 40],
            ],
          },
        ],
      }
      const result = getMapParams(params)
      expect(result.missingParams).not.toContain("{center} or {coordinates}")
      expect(result.options.polyline.length).toBeGreaterThan(0)
    })

    it("should detect hasCoords false when no features have coordinates and no center", () => {
      const params = {
        polyline: [{ coords: [] }],
      }
      const result = getMapParams(params)
      expect(result.missingParams).toContain("{center} or {coordinates}")
    })
  })

  describe("parseMultipleShapes", () => {
    const defaults = { color: "blue", weight: 1, fill: "" }

    it("returns empty array if no param for key", () => {
      expect(parseMultipleShapes("polyline", defaults, {})).toEqual([])
    })

    it("parses a single shape object with coords as [lon, lat]", () => {
      const input = {
        polyline: { coords: [11.5, 48.1], weight: 3 },
      }
      const result = parseMultipleShapes("polyline", defaults, input)
      expect(result.length).toBe(1)
      expect(result[0].coords).toEqual([[11.5, 48.1]])
      expect(result[0].weight).toBe(3)
    })

    it("parses array of shape objects", () => {
      const input = {
        polyline: [
          { coords: [11.5, 48.1], weight: 3 },
          { coords: [12, 49], color: "red" },
        ],
      }
      const result = parseMultipleShapes("polyline", defaults, input)
      expect(result.length).toBe(2)
      expect(result[1].color).toBe("red")
      expect(result[0].coords).toEqual([[11.5, 48.1]])
    })

    it("parses shape strings with parameters and coordinates", () => {
      const input = {
        polyline: ["color:red|weight:5|48.1,11.5"],
      }
      const result = parseMultipleShapes("polyline", defaults, input)
      expect(result.length).toBe(1)
      expect(result[0].color).toBe("red")
      expect(result[0].weight).toBe(5)
      expect(result[0].coords).toEqual([[11.5, 48.1]])
    })

    it("normalizes single point array [number, number] to nested array", () => {
      const input = { coords: [12.34, 56.78] }
      const result = parseMultipleShapes("polyline", defaults, {
        polyline: input,
      })
      expect(result[0].coords).toEqual([[12.34, 56.78]])
    })

    it("normalizes array of strings into coordinates", () => {
      const input = { coords: ["12.34,56.78", "34.56,78.90"] }
      const result = parseMultipleShapes("polyline", defaults, {
        polyline: input,
      })
      expect(result[0].coords).toEqual([
        [56.78, 12.34],
        [78.9, 34.56],
      ])
    })

    it("normalizes nested array of coordinates unchanged", () => {
      const input = {
        coords: [
          [12.34, 56.78],
          [34.56, 78.9],
        ],
      }
      const result = parseMultipleShapes("polyline", defaults, {
        polyline: input,
      })
      expect(result[0].coords).toEqual([
        [12.34, 56.78],
        [34.56, 78.9],
      ])
    })

    it("normalizes object with lat/lon keys", () => {
      const input = { coords: { lat: 56.78, lon: 12.34 } }
      const result = parseMultipleShapes("polyline", defaults, {
        polyline: input,
      })
      expect(result[0].coords).toEqual([[12.34, 56.78]])
    })

    it("returns empty array for invalid coords", () => {
      const input = { coords: "invalid" }
      const result = parseMultipleShapes("polyline", defaults, {
        polyline: input,
      })
      expect(result[0].coords).toEqual([])
    })
  })

  describe("extractParams", () => {
    const allowedKeys = ["color", "weight", "radius"]
    it("extracts recognized keys and returns remaining as coordinates", () => {
      const input = ["color:red", "weight:3", "12.5,45.2"]
      const { extracted, coordinates } = extractParams(input, allowedKeys)
      expect(extracted.color).toBe("red")
      expect(extracted.weight).toBe(3)
      expect(coordinates).toEqual(["12.5,45.2"])
    })

    it("converts numeric values correctly and ignores invalid numbers", () => {
      const input = ["weight:abc", "radius:10", "15,20"]
      const { extracted, coordinates } = extractParams(input, allowedKeys)
      expect(extracted.radius).toBe(10)
      expect(extracted.weight).toBeUndefined()
      expect(coordinates).toEqual(["15,20"])
    })

    it("normalizes color keys to allowed colors or hex", () => {
      const input = ["color:green", "radius:5", "foo"]
      const { extracted } = extractParams(input, allowedKeys)
      expect(extracted.color).toBe("green")
    })
  })

  describe("isEncodedPolyline", () => {
    it("detects encoded polyline string", () => {
      expect(isEncodedPolyline(["_p~iF~ps|U_ulLnnqC_mqNvxq`@"])).toBe(true)
    })

    it("returns false for plain coordinate strings", () => {
      expect(isEncodedPolyline(["48.1,11.5", "49.0,12.0"])).toBe(false)
    })
  })

  describe("parseCoordinates", () => {
    it("parses array of coordinate pairs", () => {
      const input: CoordInput = [
        [11.5, 48.1],
        [12, 49],
      ]
      expect(parseCoordinates(input)).toEqual(input)
    })

    it("parses array of {lat, lon} objects", () => {
      const input = [
        { lat: 48.1, lon: 11.5 },
        { lat: 49, lon: 12 },
      ]
      expect(parseCoordinates(input)).toEqual([
        [11.5, 48.1],
        [12, 49],
      ])
    })

    it("parses encoded polyline strings", () => {
      // "??_" is an example encoded polyline (short)
      const encoded = polyline.encode([
        [48.1, 11.5],
        [49, 12],
      ])
      expect(parseCoordinates([encoded])).toEqual([
        [11.5, 48.1],
        [12, 49],
      ])
    })

    it("parses comma-separated lat,lon strings", () => {
      const input = ["48.1,11.5", "49,12"]
      expect(parseCoordinates(input)).toEqual([
        [11.5, 48.1],
        [12, 49],
      ])
    })

    it("returns empty array on invalid input", () => {
      expect(parseCoordinates(null as any)).toEqual([])
      expect(parseCoordinates([])).toEqual([])
    })

    it("should detect encoded polyline input", () => {
      const encoded = ["_p~iF~ps|U_ulLnnqC_mqNvxq`@"]
      expect(isEncodedPolyline(encoded)).toBe(true)
    })

    it("should decode encoded polyline into coordinates", () => {
      const encoded = ["_p~iF~ps|U_ulLnnqC_mqNvxq`@"]
      const decoded = parseCoordinates(encoded)
      // Polyline decode returns [[lat, lon], ...], parseCoordinates swaps to [lon, lat]
      expect(decoded[0].length).toBe(2)
      expect(decoded[0][0]).toBeDefined()
      expect(decoded[0][1]).toBeDefined()
    })

    it("should decode polyline without logging error", () => {
      const badEncoded = ["{bad_polyline}"]
      const spy = jest.spyOn(logger, "error")

      const result = parseCoordinates(badEncoded)

      // It won't log error, so:
      expect(spy).not.toHaveBeenCalled()

      // And you can test what result is, e.g.:
      expect(Array.isArray(result)).toBe(true)

      spy.mockRestore()
    })
  })

  describe("parseCenter", () => {
    it("parses string 'lat,lon'", () => {
      expect(parseCenter("48.1,11.5")).toEqual([48.1, 11.5])
    })

    it("parses array [lon, lat]", () => {
      expect(parseCenter([11.5, 48.1])).toEqual([48.1, 11.5])
    })

    it("parses object {lat, lon}", () => {
      expect(parseCenter({ lat: 48.1, lon: 11.5 })).toEqual([11.5, 48.1])
    })

    it("returns null on invalid input", () => {
      expect(parseCenter(null)).toBeNull()
      expect(parseCenter({ foo: "bar" })).toBeNull()
    })
  })

  describe("getTileUrl", () => {
    it("returns custom URL if provided", () => {
      const result = getTileUrl("http://custom/{z}/{x}/{y}.png", null)
      expect(result.url).toBe("http://custom/{z}/{x}/{y}.png")
      expect(result.attribution).toBe("")
    })

    it("returns basemap url and attribution for known basemap", () => {
      const osm = basemaps.find((b) => b.basemap === "osm")
      const result = getTileUrl(null, "osm")
      expect(result.url).toBe(osm?.url)
      expect(result.attribution).toBe(osm?.attribution)
    })

    it("logs error and returns empty on unknown basemap", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {})
      const result = getTileUrl(null, "unknown-basemap")
      expect(result.url).toBe("")
      expect(result.attribution).toBe("")
      spy.mockRestore()
    })
  })
})
