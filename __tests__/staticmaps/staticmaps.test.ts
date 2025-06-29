import StaticMaps from "../../src/staticmaps/staticmaps"
import {
  Polyline,
  IconMarker,
  Circle,
  MultiPolygon,
  Text,
} from "../../src/staticmaps/features"
import * as utils from "../../src/staticmaps/utils"
import type { Coordinate, IconOptions } from "../../src/types/types"
import { Bound } from "../../src/staticmaps/features"
import sharp from "sharp"

describe("StaticMaps", () => {
  describe("constructor", () => {
    it("should initialize with default values when options are minimal", () => {
      const map = new StaticMaps({
        width: 400,
        height: 300,
        zoom: 10,
        center: { lat: 0, lon: 0 },
      })

      expect(map.width).toBe(400)
      expect(map.height).toBe(300)
      expect(map.paddingX).toBe(0)
      expect(map.paddingY).toBe(0)
      expect(map.tileSize).toBe(256)
      expect(map.tileRequestLimit).toBe(2)
      expect(map.reverseY).toBe(false)
      expect(map.zoomRange).toEqual({ min: 1, max: 17 })

      expect(map.markers).toEqual([])
      expect(map.lines).toEqual([])
      expect(map.multipolygons).toEqual([])
      expect(map.circles).toEqual([])
      expect(map.text).toEqual([])
      expect(map.bounds).toEqual([])
    })

    it("should set tileLayers from options.tileLayers", () => {
      const layerConfig = [{ tileUrl: "http://tileserver/{z}/{x}/{y}.png" }]
      const map = new StaticMaps({
        width: 100,
        height: 100,
        zoom: 10,
        center: { lat: 0, lon: 0 },
        tileLayers: layerConfig,
      })

      expect(map.tileLayers.length).toBe(1)
      expect(map.tileLayers[0].tileUrl).toBe(
        "http://tileserver/{z}/{x}/{y}.png"
      )
    })

    it("should fallback to base layer when tileLayers not defined but tileUrl provided", () => {
      const map = new StaticMaps({
        width: 100,
        height: 100,
        zoom: 10,
        center: { lat: 0, lon: 0 },
        tileUrl: "http://base/{z}/{x}/{y}.png",
      })

      expect(map.tileLayers.length).toBe(1)
      expect(map.tileLayers[0].tileUrl).toBe("http://base/{z}/{x}/{y}.png")
    })
  })

  describe("addLine", () => {
    it("should transform a two-point polyline into a geodesic line", () => {
      const map = new StaticMaps({
        width: 200,
        height: 200,
        zoom: 10,
        center: { lat: 0, lon: 0 },
      })
      const polylineOptions = {
        coords: [
          [10, 20],
          [30, 40],
        ] as Coordinate[],
        color: "#ff0000",
        width: 2,
        type: "polyline" as const,
        extent: () => [10, 20, 30, 40] as [number, number, number, number],
      }

      map.addLine(polylineOptions)

      expect(map.lines.length).toBe(1)
      expect(map.lines[0]).toBeInstanceOf(Polyline)

      const interpolatedCoords = map.lines[0].coords
      expect(interpolatedCoords.length).toBeGreaterThan(2) // interpolated
      expect(interpolatedCoords[0]).toEqual([10, 20])

      const last = interpolatedCoords.at(-1)
      expect(last?.[0]).toBeCloseTo(30, 5)
      expect(last?.[1]).toBeCloseTo(40, 5)
    })

    it("should keep three-point polyline unchanged (no geodesic interpolation)", () => {
      const map = new StaticMaps({
        width: 200,
        height: 200,
      })
      const polylineOptions = {
        coords: [
          [10, 20],
          [20, 30],
          [30, 40],
        ] as Coordinate[],
        color: "#0000ff",
        width: 2,
        type: "polyline" as const,
        extent: () => [10, 20, 30, 40] as [number, number, number, number],
      }

      map.addLine(polylineOptions)

      expect(map.lines.length).toBe(1)
      expect(map.lines[0]).toBeInstanceOf(Polyline)

      expect(map.lines[0].coords).toEqual([
        [10, 20],
        [20, 30],
        [30, 40],
      ])
    })
  })

  describe("addPolygon", () => {
    it("should add a polygon (Polyline) to the lines array", () => {
      const map = new StaticMaps({ width: 200, height: 200 })

      const polygonOptions = {
        coords: [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ] as Coordinate[],
        color: "#00ff00",
        width: 3,
        type: "polygon" as const,
        extent: () => [10, 20, 30, 40] as [number, number, number, number],
      }

      map.addPolygon(polygonOptions)

      expect(map.lines.length).toBe(1)
      const polygon = map.lines[0]
      expect(polygon).toBeInstanceOf(Polyline)
      expect(polygon.coords).toEqual(polygonOptions.coords)
      expect(polygon.type).toBe("polygon")
    })
  })

  describe("addCircle", () => {
    it("should add a circle to the circles array", () => {
      const map = new StaticMaps({ width: 200, height: 200 })

      const circleOptions = {
        coord: [15, 15] as Coordinate,
        radius: 10,
        color: "#123456",
        fill: "#00ff00",
        width: 1,
        extent: () => [10, 20, 30, 40] as [number, number, number, number],
      }

      map.addCircle(circleOptions)

      expect(map.circles.length).toBe(1)
      const circle = map.circles[0]
      expect(circle).toBeInstanceOf(Circle)
      expect(circle.coord).toEqual(circleOptions.coord)
      expect(circle.radius).toBe(circleOptions.radius)
      expect(circle.color).toBe(circleOptions.color)
      expect(circle.fill).toBe(circleOptions.fill)
    })
  })

  describe("addMultiPolygon", () => {
    it("should add a multipolygon to the multipolygons array", () => {
      const map = new StaticMaps({ width: 200, height: 200 })

      const multiPolygonOptions = {
        coords: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [20, 20],
            [30, 20],
            [30, 30],
            [20, 30],
            [20, 20],
          ],
        ] as Coordinate[][],
        color: "#0000ff",
        width: 2,
        fill: "#00ff00",
        extent: () => [10, 20, 30, 40] as [number, number, number, number],
      }

      map.addMultiPolygon(multiPolygonOptions)

      expect(map.multipolygons.length).toBe(1)
      const multiPolygon = map.multipolygons[0]
      expect(multiPolygon).toBeInstanceOf(MultiPolygon)
      expect(multiPolygon.coords).toEqual(multiPolygonOptions.coords)
      expect(multiPolygon.color).toBe(multiPolygonOptions.color)
      expect(multiPolygon.fill).toBe(multiPolygonOptions.fill)
    })
  })

  /*describe("addMarker", () => {
    it("should add a marker to the markers array with normalized dimensions", () => {
      const map = new StaticMaps({
        width: 200,
        height: 200,
        zoom: 10,
        center: { lat: 0, lon: 0 },
      })

      const markerOptions = {
        coord: [12.34, 56.78] as Coordinate,
        img: "https://example.com/icon.png",
        height: 24,
        width: null,
        offsetX: 5,
        offsetY: 10,
        color: "#d9534f",
        drawHeight: 0,
        drawWidth: 0,
        resizeMode: "cover",
      }
      map.addMarker(markerOptions)

      expect(map.markers.length).toBe(1)
      const marker = map.markers[0]

      expect(marker).toBeInstanceOf(IconMarker)
      expect(marker.coord).toEqual([12.34, 56.78])
      expect(marker.img).toBe("https://example.com/icon.png")
      expect(marker.height).toBe(24)
      expect(marker.width).toBeNull()
      expect(marker.drawHeight).toBe(24)
      expect(marker.drawWidth).toBe(0) // falls back to 0 if width is null
      expect(marker.offset).toEqual([5, 10])
    })
  })
  */

  describe("addText", () => {
    it("should add a text label to the text array", () => {
      const map = new StaticMaps({
        width: 200,
        height: 200,
        zoom: 10,
        center: { lat: 0, lon: 0 },
      })

      const offset: Coordinate = [5, -5]

      const textOptions = {
        coord: [5, 5] as Coordinate,
        text: "Hello World",
        size: 14,
        font: "Arial",
        color: "#333333",
        width: "150 px",
        fill: "#000000",
        anchor: "start" as "start",
        offset: offset,
        offsetX: offset[0],
        offsetY: offset[1],
      }

      map.addText(textOptions)

      expect(map.text.length).toBe(1)
      const textLabel = map.text[0]
      expect(textLabel).toBeInstanceOf(Text)
      expect(textLabel.coord).toEqual(textOptions.coord)
      expect(textLabel.text).toBe(textOptions.text)
      expect(textLabel.size).toBe(textOptions.size)
      expect(textLabel.color).toBe(textOptions.color)
    })
  })

  describe("addBound", () => {
    it("should add a bounding box to the bounds array and correctly calculate extent", () => {
      const map = new StaticMaps({
        width: 200,
        height: 200,
        zoom: 10,
        center: { lat: 0, lon: 0 },
      })

      const boundOptions = {
        coords: [
          [10, 20],
          [30, 40],
          [5, 15],
        ] as Coordinate[],
      }

      const bounds = new Bound(boundOptions)

      map.addBound(bounds)

      expect(map.bounds.length).toBe(1)
      const bound = map.bounds[0]
      expect(bound).toBeInstanceOf(Bound)
      expect(bounds.coords).toEqual(boundOptions.coords)

      // Check extent calculation
      expect(bound.extent()).toEqual([5, 15, 30, 40])
    })

    it("should throw error when calculating extent with empty coords", () => {
      const bound = new Bound({ coords: [] })

      expect(() => bound.extent()).toThrow(
        "Coordinates are required to calculate the bounding box."
      )
    })
  })

  /*describe("StaticMaps render()", () => {
    let map: StaticMaps

    beforeEach(() => {
        map = new StaticMaps({
        width: 400,
        height: 400,
        zoomRange: { min: 1, max: 20 },
        tileLayers: [{ url: "https://example.com/tiles/{z}/{x}/{y}.png" }],
        })

        // Mock methods that have external dependencies or side effects
        map.calculateZoom = jest.fn(() => 10)
        map.determineExtent = jest.fn(() => [0, 0, 10, 10])
        map.drawLayer = jest.fn(async () => Promise.resolve())
        map.loadMarker = jest.fn(async () => Promise.resolve())
        map.drawFeatures = jest.fn(() => "<svg>mocked svg content</svg>")
    })

  it("throws an error if no center, lines, markers, or circles are provided", async () => {
    map.lines = []
    map.markers = []
    map.multipolygons = []
    map.circles = []
    
    await expect(map.render([], undefined)).rejects.toThrow(
      "Cannot render empty map: Add center || lines || markers || circles."
    )
  })

  it("renders a map with provided center and zoom", async () => {
    const center = [5, 10]
    const zoom = 8

    const svg = await map.render(center, zoom)

    expect(map.center).toEqual(center)
    expect(map.zoom).toBe(zoom)
    expect(map.centerX).toBe(lonToX(center[0], zoom))
    expect(map.centerY).toBe(latToY(center[1], zoom))

    // Confirm drawLayer was called for each tile layer
    expect(map.drawLayer).toHaveBeenCalledTimes(map.tileLayers.length)
    // Confirm loadMarker and drawFeatures were called
    expect(map.loadMarker).toHaveBeenCalled()
    expect(map.drawFeatures).toHaveBeenCalled()
    expect(svg).toBe("<svg>mocked svg content</svg>")
  })

  it("calculates zoom if not provided and respects max zoom", async () => {
    const center = [5, 10]
    // calculateZoom returns 10, zoomRange.max is 20 so no change expected

    await map.render(center)

    expect(map.zoom).toBe(10)

    // Test zoom exceeding max zoom clamps to max
    map.calculateZoom = jest.fn(() => 25)
    map.zoomRange.max = 20
    await map.render(center)

    expect(map.zoom).toBe(20)
  })

  it("calculates center from extent if center not provided", async () => {
    map.lines = [{ /* dummy Polyline */ /* }]
    map.markers = []
    map.multipolygons = []
    map.circles = []
    map.determineExtent = jest.fn(() => [0, 0, 20, 20])
    map.center = undefined

    await map.render(undefined, 5)

    const expectedCenterLon = 10
    const expectedCenterLat = 10

    expect(map.centerX).toBe(lonToX(expectedCenterLon, 5))
    expect(map.centerY).toBe(latToY(expectedCenterLat, 5))
  })
    })*/
  describe("StaticMaps determineExtent()", () => {
    let map: StaticMaps

    beforeEach(() => {
      map = new StaticMaps({ width: 400, height: 400, tileSize: 256 })
      map.tileSize = 256
    })

    it("returns extent based on this.center if it has at least 4 elements", () => {
      map.center = [1, 2, 3, 4]
      const extent = map.determineExtent()
      expect(extent).toEqual([1, 2, 3, 4])
    })

    /*it("includes bounds extent in the calculation", () => {
    map.center = []
    const boundExtent =  [10, 20,30, 40] 
    const bound = new Bound({coords: [10, 20,30, 40]})
    jest.spyOn(bound, "extent").mockReturnValue(boundExtent)
    map.bounds = [bound]
    const extent = map.determineExtent()
    expect(extent).toEqual(boundExtent)
  })

  it("includes polylines extent in the calculation", () => {
    map.bounds = []
    map.center = []
    const polylineExtent = [0, 0, 50, 50]
    const polyline = new Polyline({ coords: [[0, 0], [50, 50]] })
    jest.spyOn(polyline, "extent").mockReturnValue(polylineExtent)
    map.lines = [polyline]
    const extent = map.determineExtent()
    expect(extent).toEqual(polylineExtent)
  })

  it("includes multipolygons extent in the calculation", () => {
    map.lines = []
    const mpExtent = [5, 5, 15, 15]
    const mp = new MultiPolygon({ coords: [[[5, 5], [15, 15]]] })
    jest.spyOn(mp, "extent").mockReturnValue(mpExtent)
    map.multipolygons = [mp]
    const extent = map.determineExtent()
    expect(extent).toEqual(mpExtent)
  })

  it("includes circles extent in the calculation", () => {
    map.multipolygons = []
    const circleExtent = [7, 8, 9, 10]
    const circle = new Circle({ center: [8, 9], radius: 1 })
    jest.spyOn(circle, "extent").mockReturnValue(circleExtent)
    map.circles = [circle]
    const extent = map.determineExtent()
    expect(extent).toEqual(circleExtent)
  })*/

    it("includes markers extent when zoom is undefined", () => {
      map.circles = []
      const marker = {
        coord: [10, 20],
        extentPx: jest.fn(),
      }
      map.markers = [marker as any]

      const extent = map.determineExtent()

      expect(extent).toEqual([10, 20, 10, 20])
    })

    /*it("calculates marker extent properly when zoom is provided", () => {
    map.markers = []
    const zoom = 5
    map.tileSize = 256

    const coord = [10, 20]

    // Mock marker with extentPx returning [leftPx, topPx, rightPx, bottomPx]
    const marker = {
      coord,
      extentPx: jest.fn(() => [10, 10, 20, 20]),
    }
    map.markers = [marker as any]

    // We spy on projection functions to return predictable values
    jest.spyOn(global, "lonToX").mockImplementation((lon: number, zoomLevel: number) => lon * 2)
    jest.spyOn(global, "latToY").mockImplementation((lat: number, zoomLevel: number) => lat * 3)
    jest.spyOn(global, "xToLon").mockImplementation((x: number, zoomLevel: number) => x / 2)
    jest.spyOn(global, "yToLat").mockImplementation((y: number, zoomLevel: number) => y / 3)

    const extent = map.determineExtent(zoom)

    // Calculate expected extent using the marker and mock functions:
    // x = lonToX(coord[0], zoom) = 10 * 2 = 20
    // y = latToY(coord[1], zoom) = 20 * 3 = 60
    // Left = xToLon(20 - 10/256, zoom) = (20 - 0.0390625) / 2 = 9.98046875
    // Top = yToLat(60 + 10/256, zoom) = (60 + 0.0390625) / 3 = 20.0130208
    // Right = xToLon(20 + 20/256, zoom) = (20 + 0.078125) / 2 = 10.0390625
    // Bottom = yToLat(60 - 20/256, zoom) = (60 - 0.078125) / 3 = 19.9739583

    expect(extent[0]).toBeCloseTo(9.98046875)
    expect(extent[1]).toBeCloseTo(19.9739583)
    expect(extent[2]).toBeCloseTo(10.0390625)
    expect(extent[3]).toBeCloseTo(20.0130208)

    jest.restoreAllMocks()
  })*/

    it("throws error if marker has undefined coord", () => {
      map.markers = [{ coord: undefined, extentPx: jest.fn() } as any]

      expect(() => map.determineExtent()).toThrow(
        "Marker coordinates undefined"
      )
    })
  })

  /*describe("StaticMaps calculateZoom()", () => {
  let map: StaticMaps

  beforeEach(() => {
    map = new StaticMaps({
      width: 800,
      height: 600,
      padding: [10, 20],
      zoomRange: { min: 1, max: 5 },
      tileSize: 256,
    })

    // Provide a dummy determineExtent function
    map.determineExtent = jest.fn(() => [10, 20, 30, 40])
  })

  it("returns max zoom if extent fits width and height constraints", () => {
    // Mock lonToX and latToY to produce a width and height smaller than map size minus padding
    jest.spyOn(global, "lonToX").mockImplementation((lon: number, zoom: number) => {
      if (lon === 30) return 5
      if (lon === 10) return 0
      return 0
    })
    jest.spyOn(global, "latToY").mockImplementation((lat: number, zoom: number) => {
      if (lat === 20) return 5
      if (lat === 40) return 0
      return 0
    })

    const zoom = map.calculateZoom()

    expect(zoom).toBe(map.zoomRange.max)

    jest.restoreAllMocks()
  })

  it("returns lower zoom if extent width exceeds map width minus padding", () => {
    let callCount = 0
    jest.spyOn(global, "lonToX").mockImplementation((lon: number, zoom: number) => {
      callCount++
      if (zoom === 5) return lon === 30 ? 50 : 0
      if (zoom === 4) return lon === 30 ? 10 : 0
      return 0
    })
    jest.spyOn(global, "latToY").mockImplementation(() => 0) // height fits for all

    // We'll override determineExtent to be consistent for all zooms
    map.determineExtent = jest.fn(() => [10, 20, 30, 40])

    // Width at zoom 5 is too large (50 * tileSize = 12800 > map width ~ 780)
    // Zoom 4 is okay (10 * tileSize = 2560 < 780)
    // So expect zoom = 4

    map.width = 800
    map.padding = [10, 20]
    map.tileSize = 16 // smaller tileSize to test limits easily

    const zoom = map.calculateZoom()
    expect(zoom).toBe(4)

    jest.restoreAllMocks()
  })

  it("returns lower zoom if extent height exceeds map height minus padding", () => {
    jest.spyOn(global, "lonToX").mockImplementation((lon: number, zoom: number) => 0)
    let callCount = 0
    jest.spyOn(global, "latToY").mockImplementation((lat: number, zoom: number) => {
      callCount++
      if (zoom === 5) return lat === 20 ? 50 : 0
      if (zoom === 4) return lat === 20 ? 10 : 0
      return 0
    })

    map.determineExtent = jest.fn(() => [10, 20, 30, 40])

    map.height = 600
    map.padding = [10, 20]
    map.tileSize = 16

    const zoom = map.calculateZoom()
    expect(zoom).toBe(4)

    jest.restoreAllMocks()
  })

  it("returns min zoom if no zoom fits", () => {
    jest.spyOn(global, "lonToX").mockImplementation(() => 100)
    jest.spyOn(global, "latToY").mockImplementation(() => 100)

    map.determineExtent = jest.fn(() => [10, 20, 30, 40])

    map.width = 100
    map.height = 100
    map.padding = [10, 10]
    map.tileSize = 256

    const zoom = map.calculateZoom()

    expect(zoom).toBe(map.zoomRange.min)

    jest.restoreAllMocks()
  })
})*/

  describe("StaticMaps pixel coordinate transformations", () => {
    let map: StaticMaps

    beforeEach(() => {
      map = new StaticMaps({
        width: 800,
        height: 600,
        tileSize: 256,
      })

      // Set centerX and centerY for testing
      map.centerX = 10.5
      map.centerY = 20.3
    })

    describe("xToPx()", () => {
      it("calculates correct pixel coordinate for given tile x", () => {
        const result = map.xToPx(11)
        // (11 - 10.5) * 256 + 800/2 = 0.5 * 256 + 400 = 128 + 400 = 528
        expect(result).toBe(528)
      })

      it("rounds pixel coordinate to nearest integer", () => {
        const result = map.xToPx(10.7)
        // (10.7 - 10.5) * 256 + 400 = 0.2 * 256 + 400 = 51.2 + 400 = 451.2 rounded = 451
        expect(result).toBe(451)
      })

      it("returns center pixel if input equals centerX", () => {
        const result = map.xToPx(10.5)
        // (10.5 - 10.5) * 256 + 400 = 0 + 400 = 400
        expect(result).toBe(400)
      })
    })

    describe("yToPx()", () => {
      it("calculates correct pixel coordinate for given tile y", () => {
        const result = map.yToPx(21)
        // (21 - 20.3) * 256 + 600/2 = 0.7 * 256 + 300 = 179.2 + 300 = 479.2 rounded = 479
        expect(result).toBe(479)
      })

      it("rounds pixel coordinate to nearest integer", () => {
        const result = map.yToPx(20.1)
        // (20.1 - 20.3) * 256 + 300 = (-0.2) * 256 + 300 = -51.2 + 300 = 248.8 rounded = 249
        expect(result).toBe(249)
      })

      it("returns center pixel if input equals centerY", () => {
        const result = map.yToPx(20.3)
        // (20.3 - 20.3) * 256 + 300 = 0 + 300 = 300
        expect(result).toBe(300)
      })
    })
  })

  describe("StaticMaps.drawLayer", () => {
    let map: StaticMaps

    beforeEach(() => {
      jest
        .spyOn(utils, "tileXYToQuadKey")
        .mockImplementation((x, y, z) => `quadkey-${x}-${y}-${z}`)

      map = new StaticMaps({
        width: 512,
        height: 512,
        tileSize: 256,
        zoomRange: { min: 0, max: 3 },
      })

      // Set mandatory properties used in drawLayer
      map.centerX = 2
      map.centerY = 2
      map.zoom = 2
      map.reverseY = false

      // Mock image.draw to return resolved Promise
      map.image = {
        draw: jest.fn((tiles) => Promise.resolve(tiles)),
      }

      // Mock getTiles to simulate tile fetching success
      map.getTiles = jest.fn(async (tiles) =>
        tiles.map((tile: any) => ({ success: true, tile }))
      )
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it("returns early with empty draw when no config or tileUrl", async () => {
      // @ts-ignore
      const result1 = await map.drawLayer(null)
      expect(map.image.draw).toHaveBeenCalledWith([])
      expect(result1).toEqual([])

      const result2 = await map.drawLayer({})
      expect(map.image.draw).toHaveBeenCalledWith([])
      expect(result2).toEqual([])
    })

    it("correctly calculates tile URLs and boxes without quadkey or subdomains", async () => {
      const config = {
        tileUrl: "http://tileserver.com/{z}/{x}/{y}.png",
        tileSubdomains: [],
      }

      const result = await map.drawLayer(config)

      expect(map.getTiles).toHaveBeenCalled()
      expect(map.image.draw).toHaveBeenCalled()

      const drawnTiles = map.image.draw.mock.calls[0][0]
      expect(drawnTiles.length).toBeGreaterThan(0)

      // Check first tile URL replaced correctly
      expect(drawnTiles[0].url).toMatch(
        /http:\/\/tileserver\.com\/2\/\d+\/\d+\.png/
      )

      // Check box coordinates are numbers
      drawnTiles.forEach((tile: any) => {
        expect(Array.isArray(tile.box)).toBe(true)
        expect(tile.box.length).toBe(4)
        tile.box.forEach((n: any) => expect(typeof n).toBe("number"))
      })
    })

    it("replaces {quadkey} placeholder in tileUrl", async () => {
      const config = {
        tileUrl: "http://tileserver.com/{quadkey}.png",
        tileSubdomains: [],
      }

      const result = await map.drawLayer(config)

      // tileXYToQuadKey called for each tile
      expect(utils.tileXYToQuadKey).toHaveBeenCalled()

      // URLs include quadkey string
      const drawnTiles = map.image.draw.mock.calls[0][0]
      drawnTiles.forEach((tile: any) => {
        expect(tile.url).toMatch(
          /^http:\/\/tileserver\.com\/quadkey-\d+-\d+-\d+\.png$/
        )
      })
    })

    it("replaces {s} placeholder with random subdomain", async () => {
      const config = {
        tileUrl: "http://{s}.tileserver.com/{z}/{x}/{y}.png",
        tileSubdomains: ["a", "b", "c"],
      }

      await map.drawLayer(config)

      const drawnTiles = map.image.draw.mock.calls[0][0]
      drawnTiles.forEach((tile: any) => {
        expect(tile.url).toMatch(
          /^http:\/\/[abc]\.tileserver\.com\/2\/\d+\/\d+\.png$/
        )
      })
    })

    it("handles reverseY true correctly", async () => {
      map.reverseY = true

      const config = {
        tileUrl: "http://tileserver.com/{z}/{x}/{y}.png",
        tileSubdomains: [],
      }

      await map.drawLayer(config)

      // tileY is transformed with reverseY logic, so URLs should reflect that
      const drawnTiles = map.image.draw.mock.calls[0][0]
      drawnTiles.forEach((tile: any) => {
        expect(tile.url).toMatch(/\/2\/\d+\/\d+\.png/)
      })
    })
  })

  describe("StaticMaps.drawSVG", () => {
    let map: any
    let mockSvgFunction: jest.Mock<string, [any]>
    const RENDER_CHUNK_SIZE = 2 // match the constant used in the method

    beforeEach(async () => {
      // Provide a valid image buffer for sharp to process
      const dummyImageBuffer = await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer()

      // Setup a minimal map instance with required properties
      map = {
        image: {
          image: dummyImageBuffer,
        },
        drawSVG: undefined, // will set below,
      }

      mockSvgFunction = jest.fn(
        (feature) => `<svg-feature id="${feature.id}"/>`
      )

      // Bind method to our map instance
      map.drawSVG = async function (
        features: any[],
        svgFunction: (feature: any) => string
      ) {
        if (features.length === 0) return

        const chunks = utils.chunk(features, RENDER_CHUNK_SIZE)

        const baseImage = sharp(this.image.image)
        const imageMetadata: any = await baseImage.metadata()

        const processedChunks = chunks.map((chunk: any) => {
          const svg = `<svg
          width="${imageMetadata.width}px"
          height="${imageMetadata.height}px"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg">
          ${chunk.map((feature: any) => svgFunction(feature)).join("\n")}
        </svg>`

          return { input: Buffer.from(svg), top: 0, left: 0 }
        })

        this.image.image = await baseImage.composite(processedChunks).toBuffer()
      }
    })

    it("returns immediately when no features", async () => {
      const result = await map.drawSVG([], mockSvgFunction)
      expect(result).toBeUndefined()
      expect(mockSvgFunction).not.toHaveBeenCalled()
    })

    /*it("composites SVG chunks onto the image", async () => {
      const map = new StaticMaps({ width: 512, height: 512 })
      map.image = { image: Buffer.from("initial-buffer") }

      const mockSvgFn = jest.fn((f) => `<rect id="${f.id}" />`)
      const features = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

      await map.drawSVG(features, mockSvgFn)

      // Check that sharp was called with the image buffer
      expect(sharp).toHaveBeenCalledWith(Buffer.from("initial-buffer"))

      // Check that SVG function was called for all features
      expect(mockSvgFn).toHaveBeenCalledTimes(4)

      const sharpInstance = (sharp as unknown as jest.Mock).mock.results[0]
        .value

      // Check composite was called with chunked SVG buffers
      expect(sharpInstance.composite).toHaveBeenCalled()
      const args = sharpInstance.composite.mock.calls[0][0]
      expect(args.length).toBeGreaterThan(0)

      // Ensure the final image buffer is set
      expect(map.image.image).toEqual(Buffer.from("mocked-buffer"))
    })*/
  })
})
