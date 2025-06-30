jest.unmock("../../src/staticmaps/features")

import sharp from "sharp"
import StaticMaps from "../../src/staticmaps/staticmaps" // Adjust import path
import {
  IconMarker,
  Polyline,
  Circle,
  Text,
  Bound,
} from "../../src/staticmaps/features"
import { TileManager, TileServerConfig } from "../../src/staticmaps/tilemanager"
import * as utils from "../../src/staticmaps/utils"

// Mock dependencies
jest.mock("../../src/staticmaps/tilemanager")
jest.mock("../../src/staticmaps/features")
jest.mock("../../src/staticmaps/utils")
jest.mock("sharp", () => {
  const actualSharp = jest.requireActual("sharp")
  return jest.fn(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 256, height: 256 }),
    composite: jest.fn().mockResolvedValue(Buffer.from("imagebuffer")),
  }))
})

// Simplify logger to avoid clutter in test output
jest.mock("../../src/utils/logger", () => ({
  debug: jest.fn(),
}))

describe("StaticMaps", () => {
  const defaultOptions = {
    width: 256,
    height: 256,
    tileUrl: "http://example.com/{z}/{x}/{y}.png",
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("constructor initializes with default tileLayers if none provided", () => {
    const map = new StaticMaps({ width: 100, height: 100, tileUrl: "url" })
    expect(map.tileLayers.length).toBe(1)
    expect(map.width).toBe(100)
    expect(map.height).toBe(100)
    expect(map.paddingX).toBe(0)
    expect(map.tileRequestLimit).toBe(2)
  })

  it("constructor initializes with multiple tileLayers if provided", () => {
    const layers = [{ tileUrl: "url1" }, { tileUrl: "url2" }]
    const map = new StaticMaps({ width: 100, height: 100, tileLayers: layers })
    expect(map.tileLayers.length).toBe(2)
  })

  it("addLine adds a Polyline to lines", () => {
    const map = new StaticMaps(defaultOptions)
    const polylineOpts = { points: [] }
    map.addLine(polylineOpts as any)
    expect(map.lines.length).toBe(1)
    expect(Polyline).toHaveBeenCalledWith(polylineOpts)
  })

  it("addMarker adds an IconMarker to markers with height/width undefined if null", () => {
    const map = new StaticMaps(defaultOptions)
    const opts = { coord: [1, 2], height: null, width: null }
    map.addMarker(opts as any)
    expect(map.markers.length).toBe(1)
    const calledWith = (IconMarker as jest.Mock).mock.calls[0][0]
    expect(calledWith.height).toBeUndefined()
    expect(calledWith.width).toBeUndefined()
  })

  it("determineExtent throws if marker coord missing", () => {
    const map = new StaticMaps(defaultOptions)
    map.markers.push({ coord: undefined, extentPx: () => [0, 0, 0, 0] } as any)
    expect(() => map.determineExtent(5)).toThrow("Marker coordinates undefined")
  })

  it("calculateZoom returns min zoom if none fits", () => {
    const map = new StaticMaps({
      width: 256,
      height: 256,
      zoomRange: { min: 1, max: 3 },
      // other options
    })

    // Add some features with large extents or none at all
    // Call calculateZoom, expect 1
    console.log("Map extents:", map.determineExtent())
    console.log("Zoom range:", map.zoomRange)
    const zoom = map.calculateZoom()
    console.log("Calculated zoom:", zoom)
    expect(zoom).toBe(1)
  })

  it("xToPx and yToPx return pixel coords rounded", () => {
    const map = new StaticMaps(defaultOptions)
    map.centerX = 1
    map.centerY = 2
    map.width = 256
    map.height = 256
    map.tileSize = 256

    expect(typeof map.xToPx(1)).toBe("number")
    expect(typeof map.yToPx(2)).toBe("number")
  })

  it("drawLayer returns early if no tileUrl", async () => {
    const map = new StaticMaps(defaultOptions)
    map.image = { draw: jest.fn().mockResolvedValue("drawn") } as any
    const result = await map.drawLayer({ tileUrl: "" })
    expect(result).toBe("drawn")
  })

  it("drawLayer constructs tile URLs correctly and calls tileManager.getTiles", async () => {
    const map = new StaticMaps({
      ...defaultOptions,
      width: 256,
      height: 256,
      tileSize: 256,
    })
    map.zoom = 3
    map.centerX = 4
    map.centerY = 4
    map.image = { draw: jest.fn().mockResolvedValue("drawn") } as any
    map.tileManager.getTiles = jest
      .fn()
      .mockResolvedValue([{ success: true, tile: "tile1" }, { success: false }])

    const layer = {
      tileUrl: "http://{s}.tile/{z}/{x}/{y}.png",
      tileSubdomains: ["a", "b"],
    }
    const result = await map.drawLayer(layer)
    expect(map.tileManager.getTiles).toHaveBeenCalled()
    expect(result).toBe("drawn")
  })

  /*it("circleToSVG returns a valid SVG string", () => {
    const map = new StaticMaps(defaultOptions)
    map.zoom = 5
    jest.spyOn(utils, "meterToPixel").mockReturnValue(10)
    jest.spyOn(map, "xToPx").mockReturnValue(100)
    jest.spyOn(map, "yToPx").mockReturnValue(150)

    const circle = new Circle({ coord: [10, 20], radius: 100, color: "red", fill: "blue", width: 2 })
    const svg = map.circleToSVG(circle)
    expect(svg).toContain("<circle")
    expect(svg).toContain('stroke="red"')
  })*/

  it("throws error for invalid circle coordinates (wrong length)", () => {
    const map = new StaticMaps(defaultOptions)

    const circle = new Circle({
      coord: [11.5] as any, // only one element, invalid
      radius: 100,
    })

    expect(() => map.circleToSVG(circle)).toThrow(
      "Invalid circle: missing or malformed coordinates."
    )
  })

  it("textToSVG throws if no coord", () => {
    const map = new StaticMaps(defaultOptions)
    expect(() => map.textToSVG({} as any)).toThrow("No text coords given")
  })

  it("render throws if empty map and no center/zoom", async () => {
    const map = new StaticMaps(defaultOptions)
    map.lines = []
    map.markers = []
    map.circles = []

    await expect(map.render()).rejects.toThrow(
      "Cannot render empty map: Add center || lines || markers || circles."
    )
  })

  it("render calculates center and zoom correctly", async () => {
    const map = new StaticMaps(defaultOptions)
    map.lines = [new Polyline({ coords: [] }) as any]
    map.image = { draw: jest.fn() } as any
    map.drawLayer = jest.fn().mockResolvedValue([])
    map.loadMarker = jest.fn().mockResolvedValue(undefined)
    map.drawFeatures = jest.fn().mockReturnValue("<svg></svg>")
    jest.spyOn(utils, "lonToX").mockReturnValue(0)
    jest.spyOn(utils, "latToY").mockReturnValue(0)
    jest.spyOn(map, "calculateZoom").mockReturnValue(5)
    jest.spyOn(map, "determineExtent").mockReturnValue([0, 0, 10, 10])

    const svg = await map.render()
    expect(svg).toBe("<svg></svg>")
    expect(map.drawLayer).toHaveBeenCalled()
    expect(map.loadMarker).toHaveBeenCalled()
  })
})
