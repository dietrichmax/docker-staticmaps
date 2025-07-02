jest.mock("../../src/staticmaps/features")
jest.mock("../../src/staticmaps/tilemanager")
jest.mock("../../src/staticmaps/renderer", () => ({
  drawLayer: jest.fn().mockResolvedValue("<layer />"),
  loadMarkers: jest.fn().mockResolvedValue(undefined),
  drawMarkers: jest.fn().mockResolvedValue("<markers />"),
  drawSVG: jest.fn().mockImplementation(() => "<svg><g>mocked</g></svg>"),
  circleToSVG: jest.fn(),
  textToSVG: jest.fn(),
  lineToSVG: jest.fn(),
}))

import StaticMaps from "../../src/staticmaps/staticmaps"
import {
  IconMarker,
  Polyline,
  Circle,
  Text,
  Bound,
} from "../../src/staticmaps/features"
import {
  drawLayer,
  drawSVG,
  drawMarkers,
  loadMarkers,
} from "../../src/staticmaps/renderer"
import { TileServerConfig } from "../../src/staticmaps/tilemanager"
import { MapOptions } from "../../src/types/types"

describe("StaticMaps", () => {
  const baseOptions: MapOptions = {
    width: 800,
    height: 600,
    tileUrl: "https://example.com/{z}/{x}/{y}.png",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    StaticMaps.prototype.drawSVG = jest
      .fn()
      .mockResolvedValue("<svg><g>mocked</g></svg>")
    StaticMaps.prototype.drawMarkers = jest
      .fn()
      .mockResolvedValue("<markers />")
  })

  it("should initialize with default tile layer when none provided", () => {
    const map = new StaticMaps(baseOptions)
    expect(map.tileLayers.length).toBe(1)
    expect(map.tileLayers[0]).toBeInstanceOf(TileServerConfig)
  })

  it("should allow adding a line", () => {
    const map = new StaticMaps(baseOptions)
    map.addLine({
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    } as any)
    expect(map.lines.length).toBe(1)
    expect(Polyline).toHaveBeenCalled()
  })

  it("should allow adding a polygon", () => {
    const map = new StaticMaps(baseOptions)
    map.addPolygon({
      coordinates: [
        [0, 0],
        [1, 1],
        [0, 1],
      ],
    } as any)
    expect(map.lines.length).toBe(1)
    expect(Polyline).toHaveBeenCalled()
  })

  it("should allow adding a marker", () => {
    const map = new StaticMaps(baseOptions)
    map.addMarker({ coord: [10, 10] } as any)
    expect(map.markers.length).toBe(1)
    expect(IconMarker).toHaveBeenCalled()
  })

  it("should allow adding a circle", () => {
    const map = new StaticMaps(baseOptions)
    map.addCircle({ coord: [0, 0], radius: 1000 } as any)
    expect(map.circles.length).toBe(1)
    expect(Circle).toHaveBeenCalled()
  })

  it("should allow adding text", () => {
    const map = new StaticMaps(baseOptions)
    map.addText({ coord: [0, 0], text: "Test" } as any)
    expect(map.text.length).toBe(1)
    expect(Text).toHaveBeenCalled()
  })

  it("should allow adding a bounding box", () => {
    const map = new StaticMaps(baseOptions)
    map.addBound({ extent: [0, 0, 1, 1] } as any)
    expect(map.bounds.length).toBe(1)
    expect(Bound).toHaveBeenCalled()
  })

  it("should throw if rendering with no features or center", async () => {
    const map = new StaticMaps(baseOptions)
    await expect(map.render()).rejects.toThrow("Cannot render empty map")
  })

  it("should render a map with center and zoom", async () => {
    const map = new StaticMaps(baseOptions)
    map.addMarker({ coord: [10, 10] } as any)

    const svg = await map.render([10, 10], 5)
    expect(svg).toContain("<svg")
  })

  it("should clamp zoom to maxZoom", async () => {
    const map = new StaticMaps({
      ...baseOptions,
      zoomRange: { max: 2 },
    })
    map.addMarker({ coord: [10, 10] } as any)
    const svg = await map.render([10, 10], 10)
    expect(map.zoom).toBe(2)
  })

  it("determineExtent should throw if marker coord is undefined", () => {
    const map = new StaticMaps(baseOptions)
    map.markers.push({ coord: undefined } as any)
    expect(() => map.determineExtent()).toThrow("Marker coordinates undefined")
  })

  it("calculateZoom should fallback to min zoom on invalid extent", () => {
    const map = new StaticMaps(baseOptions)
    expect(map.calculateZoom()).toBe(1)
  })

  it("xToPx and yToPx should compute correct canvas positions", () => {
    const map = new StaticMaps(baseOptions)
    map.centerX = 0
    map.centerY = 0
    expect(map.xToPx(1)).toBeGreaterThan(0)
    expect(map.yToPx(1)).toBeGreaterThan(0)
  })
})
