// __tests__/params-parser.test.ts
import {
  getMapParams,
  parseMultipleShapes,
  extractParams,
  isEncodedPolyline,
  parseCoordinates,
  parseCenter,
  getTileUrl,
} from "../../src/generate/generateParams"
import polyline from "@mapbox/polyline"
import logger from "../../src/utils/logger"
import { basemaps } from "../../src/utils/basemaps"
import { CoordInput } from "../../src/types/types"

// Mocks
jest.mock("../../src/utils/logger")
jest.mock("@mapbox/polyline")

describe("generateParams", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("getMapParams", () => {
    it("returns defaults and parses features correctly", () => {
      const input = {
        center: "50,10",
        width: "500",
        height: "400",
        quality: "80",
      }

      const result = getMapParams(input)

      expect(logger.debug).toHaveBeenCalled()
      expect(result.missingParams).toHaveLength(0)
      expect(result.options.center).toEqual([10, 50])
      expect(result.options.width).toBe(500)
      expect(result.options.height).toBe(400)
      expect(result.options.tileUrl).toBe(getTileUrl(null, null).url)
      expect(result.options.quality).toBe(80)
      expect(result.options.attribution?.text).toContain(
        getTileUrl(null, null).attribution
      )
    })

    it("detects missing center and coordinates", () => {
      const result = getMapParams({})
      expect(result.missingParams).toContain("{center} or {coordinates}")
    })

    it("appends hillshade attribution when ?hillshade=true", () => {
      const result = getMapParams({
        center: "50,10",
        basemap: "osm",
        hillshade: "true",
      })

      expect(result.options.hillshade).toBe(true)
      expect(result.options.attribution?.text).toContain(
        "© OpenStreetMap contributors"
      )
      expect(result.options.attribution?.text).toContain(
        "Hillshade: Mapzen / AWS Terrain Tiles"
      )
    })

    it("does not append hillshade attribution when hillshade is off", () => {
      const result = getMapParams({
        center: "50,10",
        basemap: "osm",
      })

      expect(result.options.hillshade).toBeUndefined()
      expect(result.options.attribution?.text).not.toContain("Hillshade:")
    })

    it("user attribution override wins over hillshade-appended text", () => {
      const result = getMapParams({
        center: "50,10",
        basemap: "osm",
        hillshade: "true",
        attribution: "text:Custom note",
      })

      expect(result.options.attribution?.text).toBe("Custom note")
      expect(result.options.attribution?.text).not.toContain("Hillshade:")
    })
  })

  describe("parseMultipleShapes", () => {
    const defaults = {
      weight: 2,
      color: "red",
      fill: "none",
    }

    it("returns empty array when no param key", () => {
      expect(parseMultipleShapes("polyline", defaults, {})).toEqual([])
    })

    it("parses a single object shape", () => {
      const params = {
        polyline: {
          coords: [1, 2],
          weight: 5,
          color: "green",
        },
      }
      const result = parseMultipleShapes("polyline", defaults, params)
      expect(result).toHaveLength(1)
      expect(result[0].weight).toBe(5)
      expect(result[0].color).toBe("green")
      expect(result[0].coords).toEqual([[1, 2]])
    })

    it("parses array of shapes", () => {
      const params = {
        polyline: [
          { coords: [1, 2], color: "blue" },
          {
            coords: [
              [3, 4],
              [5, 6],
            ],
            weight: 3,
          },
        ],
      }
      const result = parseMultipleShapes("polyline", defaults, params)
      expect(result).toHaveLength(2)
      expect(result[0].coords).toEqual([[1, 2]])
      expect(result[1].coords).toEqual([
        [3, 4],
        [5, 6],
      ])
    })

    it("parses raw string with params and coordinates", () => {
      const params = {
        polyline: ["color:red|weight:3|12.34,56.78|90,45"],
      }
      const result = parseMultipleShapes("polyline", defaults, params)
      expect(result).toHaveLength(1)
      expect(result[0].color).toBe("red")
      expect(result[0].weight).toBe(3)
      expect(result[0].coords).toEqual([
        [56.78, 12.34],
        [45, 90],
      ])
    })
  })

  describe("extractParams", () => {
    it("extracts color, numeric keys and coordinates", () => {
      const items = [
        "color:Red",
        "weight:4",
        "radius:10",
        "offsetX:5",
        "offsetY:6",
        "foo:bar", // invalid key
        "12.34,56.78",
      ]
      const { extracted, coordinates } = extractParams(items, [
        "color",
        "weight",
        "radius",
        "offsetX",
        "offsetY",
      ])

      expect(extracted.color).toBe("red") // forced lowercase and allowed color
      expect(extracted.weight).toBe(4)
      expect(extracted.radius).toBe(10)
      expect(extracted.offsetX).toBe(5)
      expect(extracted.offsetY).toBe(6)

      expect(coordinates).toEqual(["foo:bar", "12.34,56.78"])
    })

    it("prefix with # if color is not allowed", () => {
      const items = ["color:ABCDEF"]
      const { extracted } = extractParams(items, ["color"])
      expect(extracted.color).toBe("#ABCDEF")
    })
  })

  describe("isEncodedPolyline", () => {
    it("detects encoded polylines correctly", () => {
      expect(isEncodedPolyline(["abcd"])).toBe(true)
      expect(isEncodedPolyline(["123", "456"])).toBe(false)
      expect(isEncodedPolyline(["_p~iF~ps|U"])).toBe(true)
    })
  })

  describe("parseCoordinates", () => {
    it("returns empty array for invalid input", () => {
      expect(parseCoordinates(null as any)).toEqual([])
      expect(parseCoordinates([])).toEqual([])
    })

    it("parses array of coordinates pairs", () => {
      const input: CoordInput = [
        [10, 20],
        [30, 40],
      ]
      expect(parseCoordinates(input)).toEqual(input)
    })

    it("parses array of {lat, lon} objects", () => {
      const input = [
        { lat: 10, lon: 20 },
        { lat: 30, lon: 40 },
      ]
      expect(parseCoordinates(input)).toEqual([
        [20, 10],
        [40, 30],
      ])
    })

    it("decodes encoded polyline strings", () => {
      ;(polyline.decode as jest.Mock).mockReturnValue([
        [10, 20],
        [30, 40],
      ])
      const input = ["_p~iF~ps|U"]
      const result = parseCoordinates(input)
      expect(polyline.decode).toHaveBeenCalled()
      expect(result).toEqual([
        [20, 10],
        [40, 30],
      ])
    })

    it("parses lat,lon string pairs", () => {
      const input = ["10,20", "30,40", "foo,bar"]
      expect(parseCoordinates(input)).toEqual([
        [20, 10],
        [40, 30],
      ])
    })
  })

  describe("parseCenter", () => {
    it("returns null if no input", () => {
      expect(parseCenter(null)).toBeNull()
      expect(parseCenter(undefined)).toBeNull()
    })

    it("parses string 'lat,lon' into [lat, lon]", () => {
      expect(parseCenter("10,20")).toEqual([20, 10])
    })

    it("parses array [lon, lat] into [lat, lon]", () => {
      expect(parseCenter([20, 10])).toEqual([10, 20])
    })

    it("parses object with lat/lon", () => {
      expect(parseCenter({ lat: 10, lon: 20 })).toEqual([20, 10])
    })

    it("returns null for invalid string", () => {
      expect(parseCenter("invalid")).toBeNull()
    })

    it("returns null for invalid array length", () => {
      expect(parseCenter([11.6])).toBeNull()
    })

    it("returns null for missing lat/lon object keys", () => {
      expect(parseCenter({ lat: 48.1 })).toBeNull()
    })
  })

  describe("getTileUrl", () => {
    it("returns custom URL when provided", () => {
      const result = getTileUrl("http://custom.url/{z}/{x}/{y}.png", null)
      expect(result.url).toBe("http://custom.url/{z}/{x}/{y}.png")
      expect(result.attribution).toBe("")
    })

    it("returns basemap url and attribution when basemap exists", () => {
      basemaps.push({
        basemap: "test",
        url: "http://test.url/{z}/{x}/{y}.png",
        attribution: "Test Attribution",
      })
      const result = getTileUrl(null, "test")
      expect(result.url).toBe("http://test.url/{z}/{x}/{y}.png")
      expect(result.attribution).toBe("Test Attribution")
      basemaps.pop()
    })

    it("logs error and returns empty when basemap unknown", () => {
      const result = getTileUrl(null, "nonexistent")
      expect(logger.error).toHaveBeenCalledWith("Unknown basemap: nonexistent")
      expect(result.url).toBe("")
      expect(result.attribution).toBe("")
    })

    it("blocks private/internal tile URL", () => {
      const result = getTileUrl("http://192.168.1.1/{z}/{x}/{y}.png", null)
      expect(result.url).toBe("")
      expect(result.attribution).toBe("")
      expect(logger.error).toHaveBeenCalledWith(
        "Blocked private/internal tile URL: http://192.168.1.1/{z}/{x}/{y}.png"
      )
    })

    it("blocks localhost tile URL", () => {
      const result = getTileUrl("http://localhost:8080/{z}/{x}/{y}.png", null)
      expect(result.url).toBe("")
    })
  })

  describe("security boundary validation", () => {
    it("clamps quality below 1 to 1", () => {
      const result = getMapParams({ center: "50,10", quality: "0" })
      expect(result.options.quality).toBe(1)
    })

    it("clamps quality above 100 to 100", () => {
      const result = getMapParams({ center: "50,10", quality: "999" })
      expect(result.options.quality).toBe(100)
    })

    it("clamps negative quality to 1", () => {
      const result = getMapParams({ center: "50,10", quality: "-50" })
      expect(result.options.quality).toBe(1)
    })

    it("throws on unsupported format", () => {
      expect(() =>
        getMapParams({ center: "50,10", format: "svg" })
      ).toThrow(/Unsupported format/)
    })

    it("throws on executable format", () => {
      expect(() =>
        getMapParams({ center: "50,10", format: "exe" })
      ).toThrow(/Unsupported format/)
    })

    it("accepts allowed formats", () => {
      for (const fmt of ["png", "jpeg", "jpg", "webp", "pdf"]) {
        const result = getMapParams({ center: "50,10", format: fmt })
        expect(result.options.format).toBe(fmt)
      }
    })

    it("caps zoom at 20", () => {
      const result = getMapParams({ center: "50,10", zoom: "25" })
      expect(result.options.zoom).toBe(20)
    })

    it("throws when dimensions exceed max", () => {
      expect(() =>
        getMapParams({ center: "50,10", width: "9000", height: "100" })
      ).toThrow(/exceeds maximum/)
    })

    it("throws when pixel budget exceeded", () => {
      expect(() =>
        getMapParams({ center: "50,10", width: "6000", height: "5000" })
      ).toThrow(/pixel budget/)
    })

    it("throws when dimensions are zero", () => {
      expect(() =>
        getMapParams({ center: "50,10", width: "0", height: "100" })
      ).toThrow(/at least/)
    })
  })
})
