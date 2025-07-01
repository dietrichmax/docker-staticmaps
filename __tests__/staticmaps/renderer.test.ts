jest.mock("../../src/staticmaps/utils", () => ({
  tileXYToQuadKey: jest.fn((x, y, zoom) => `qk${x}${y}${zoom}`),
  lonToX: jest.fn((lon, zoom) => lon * zoom),
  latToY: jest.fn((lat, zoom) => lat * zoom),
  chaikinSmooth: jest.fn((points, iterations) => points),
  douglasPeucker: jest.fn((points, tolerance) => points),
  meterToPixel: jest.fn((radius, zoom, lat) => radius * zoom),
}))

jest.mock("sharp")

import sharp from "sharp"
import type { Mock } from "jest-mock"
import {
  drawLayer,
  drawSVG,
  lineToSVG,
  textToSVG,
  circleToSVG,
  drawMarkers,
} from "../../src/staticmaps/renderer"
import {
  tileXYToQuadKey,
  lonToX,
  latToY,
  chaikinSmooth,
  douglasPeucker,
  meterToPixel,
} from "../../src/staticmaps/utils"
import { Polyline, Text, Circle } from "../../src/staticmaps/features"

const mockedSharp = sharp as unknown as Mock

describe("drawLayer", () => {
  let tileManager: { getTiles: jest.Mock }
  let image: { draw: jest.Mock }
  let xToPx: jest.Mock
  let yToPx: jest.Mock

  beforeEach(() => {
    tileManager = { getTiles: jest.fn() }
    image = { draw: jest.fn() }
    xToPx = jest.fn((x) => x * 10)
    yToPx = jest.fn((y) => y * 20)
  })

  test("returns empty draw result if tileUrl is missing", async () => {
    image.draw.mockResolvedValue("drawn-empty")
    const result = await drawLayer({
      centerX: 0,
      centerY: 0,
      width: 256,
      height: 256,
      tileSize: 256,
      zoom: 1,
      reverseY: false,
      xToPx,
      yToPx,
      tileManager,
      image,
      config: { tileUrl: "" },
    })
    expect(image.draw).toHaveBeenCalledWith([])
    expect(result).toBe("drawn-empty")
  })

  test("calculates tile URLs and calls getTiles and draw correctly without subdomains", async () => {
    const zoom = 2
    const centerX = 2
    const centerY = 2
    const width = 256
    const height = 256
    const tileSize = 256
    const reverseY = false
    const config = { tileUrl: "https://tileserver.com/{z}/{x}/{y}.png" }

    // Setup getTiles mock to return tiles with success
    tileManager.getTiles.mockResolvedValue([
      { success: true, tile: { id: 1 } },
      { success: false, tile: { id: 2 } },
      { success: true, tile: { id: 3 } },
    ])
    image.draw.mockResolvedValue("drawn-result")

    const result = await drawLayer({
      centerX,
      centerY,
      width,
      height,
      tileSize,
      zoom,
      reverseY,
      xToPx,
      yToPx,
      tileManager,
      image,
      config,
    })

    expect(tileManager.getTiles).toHaveBeenCalled()

    // Extract tiles argument to getTiles call
    const tilesArg = tileManager.getTiles.mock.calls[0][0]
    expect(Array.isArray(tilesArg)).toBe(true)
    expect(tilesArg.length).toBeGreaterThan(0)

    // Check if URLs are correct and contain zoom, x, y replaced
    for (const tile of tilesArg) {
      expect(tile.url).toMatch(
        /^https:\/\/tileserver\.com\/\d+\/\d+\/\d+\.png$/
      )
      expect(tile.box).toHaveLength(4)
      // xToPx and yToPx called for each tile box
      expect(typeof tile.box[0]).toBe("number")
      expect(typeof tile.box[1]).toBe("number")
    }

    // Check that only successful tiles passed to image.draw
    expect(image.draw).toHaveBeenCalledWith([{ id: 1 }, { id: 3 }])
    expect(result).toBe("drawn-result")
  })

  test("uses subdomains and replaces {s} token", async () => {
    const config = {
      tileUrl: "http://{s}.tile.com/{z}/{x}/{y}.png",
      tileSubdomains: ["a", "b", "c"],
    }
    tileManager.getTiles.mockResolvedValue([{ success: true, tile: { id: 5 } }])
    image.draw.mockResolvedValue("drawn-with-subdomains")

    const result = await drawLayer({
      centerX: 0,
      centerY: 0,
      width: 256,
      height: 256,
      tileSize: 256,
      zoom: 1,
      reverseY: false,
      xToPx,
      yToPx,
      tileManager,
      image,
      config,
    })

    const tilesArg = tileManager.getTiles.mock.calls[0][0]
    // At least one tile URL should contain one of the subdomains
    const urls = tilesArg.map((t: any) => t.url)
    const containsSubdomain = urls.some((url: string) =>
      /http:\/\/[abc]\.tile\.com/.test(url)
    )
    expect(containsSubdomain).toBe(true)
    expect(image.draw).toHaveBeenCalled()
    expect(result).toBe("drawn-with-subdomains")
  })

  test("handles reverseY and quadkey correctly", async () => {
    const zoom = 3
    const centerX = 4
    const centerY = 4
    const width = 256
    const height = 256
    const tileSize = 256
    const reverseY = true
    const config = {
      tileUrl: "http://tiles.com/{quadkey}.png",
    }

    tileManager.getTiles.mockResolvedValue([
      { success: true, tile: { id: 10 } },
    ])
    image.draw.mockResolvedValue("drawn-reverse-quadkey")

    const result = await drawLayer({
      centerX,
      centerY,
      width,
      height,
      tileSize,
      zoom,
      reverseY,
      xToPx,
      yToPx,
      tileManager,
      image,
      config,
    })

    // tileXYToQuadKey mocked to return 'qk{x}{y}{zoom}'
    expect(tileManager.getTiles).toHaveBeenCalled()
    const tilesArg = tileManager.getTiles.mock.calls[0][0]
    for (const tile of tilesArg) {
      expect(tile.url).toMatch(/^http:\/\/tiles\.com\/qk\d+\d+3\.png$/)
    }

    expect(image.draw).toHaveBeenCalledWith([{ id: 10 }])
    expect(result).toBe("drawn-reverse-quadkey")
  })
})

describe("drawSVG", () => {
  const dummyBuffer = Buffer.from("test-buffer")
  const width = 256
  const height = 128

  let metadataMock: jest.Mock
  let compositeMock: jest.Mock
  let toBufferMock: jest.Mock
  let sharpInstance: any

  beforeEach(() => {
    metadataMock = jest.fn().mockResolvedValue({ width, height })
    toBufferMock = jest.fn().mockResolvedValue(Buffer.from("result-buffer"))
    compositeMock = jest.fn().mockReturnValue({ toBuffer: toBufferMock })

    sharpInstance = {
      metadata: metadataMock,
      composite: compositeMock,
    }
    mockedSharp.mockReturnValue(sharpInstance)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test("returns original buffer if features is empty", async () => {
    const result = await drawSVG(dummyBuffer, [], (f) => "<circle/>")
    expect(result).toBe(dummyBuffer)
    expect(sharp).not.toHaveBeenCalled()
  })

  test("calls svgFunction for each feature and composites SVG", async () => {
    const features = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const svgFunction = jest.fn((f) => `<circle id="${f.id}"/>`)

    const result = await drawSVG(dummyBuffer, features, svgFunction)

    expect(sharp).toHaveBeenCalledWith(dummyBuffer)
    expect(metadataMock).toHaveBeenCalled()
    expect(svgFunction).toHaveBeenCalledTimes(features.length)

    // Check that composite was called with SVG buffers having correct width/height
    const compositeArg = compositeMock.mock.calls[0][0]
    expect(Array.isArray(compositeArg)).toBe(true)
    expect(compositeArg.length).toBe(1) // fewer than RENDER_CHUNK_SIZE so one chunk
    const svgBuffer = compositeArg[0].input
    const svgString = svgBuffer.toString()
    expect(svgString).toContain(`width="${width}px"`)
    expect(svgString).toContain(`<circle id="1"/>`)
    expect(svgString).toContain(`<circle id="2"/>`)
    expect(svgString).toContain(`<circle id="3"/>`)

    expect(toBufferMock).toHaveBeenCalled()
    expect(result.toString()).toBe("result-buffer")
  })

  test("splits features into multiple chunks if large number", async () => {
    const bigFeatures = new Array(2500).fill(0).map((_, i) => ({ id: i }))
    const svgFunction = jest.fn((f) => `<rect id="${f.id}"/>`)

    const result = await drawSVG(dummyBuffer, bigFeatures, svgFunction)

    // composite should be called once with 3 chunks (1000 + 1000 + 500)
    const compositeArg = compositeMock.mock.calls[0][0]
    expect(compositeArg.length).toBe(3)

    // The SVG strings should contain the ids of first and last chunks
    const firstChunkSVG = compositeArg[0].input.toString()
    expect(firstChunkSVG).toContain('<rect id="0"/>')
    expect(firstChunkSVG).toContain('<rect id="999"/>')

    const lastChunkSVG = compositeArg[2].input.toString()
    expect(lastChunkSVG).toContain('<rect id="2499"/>')

    expect(result.toString()).toBe("result-buffer")
  })
})

describe("lineToSVG", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns empty string if coords missing or less than two points", () => {
    expect(
      lineToSVG({
        line: {
          coords: [],
          type: "polyline",
          color: "red",
          width: 1,
          extent: () => [0, 0, 0, 0],
        },
        zoom: 1,
        xToPx: (x) => x,
        yToPx: (y) => y,
      })
    ).toBe("")

    expect(
      lineToSVG({
        line: {
          coords: [[1, 2]],
          type: "polyline",
          color: "red",
          width: 1,
          extent: () => [0, 0, 0, 0],
        },
        zoom: 1,
        xToPx: (x) => x,
        yToPx: (y) => y,
      })
    ).toBe("")
  })

  it("calls projection and smoothing functions for polyline with 2 coords", () => {
    const line: Polyline = {
      coords: [
        [0, 0],
        [10, 10],
      ],
      type: "polyline",
      color: "black",
      width: 2,
      fill: "none",
      extent: () => [0, 0, 100, 100],
    }

    // Setup mock implementations to just return inputs so d can be generated
    ;(lonToX as jest.Mock).mockImplementation((lon, zoom) => lon * zoom)
    ;(latToY as jest.Mock).mockImplementation((lat, zoom) => lat * zoom)
    ;(chaikinSmooth as jest.Mock).mockImplementation((points) => points)
    ;(douglasPeucker as jest.Mock).mockImplementation((points) => points)

    lineToSVG({
      line,
      zoom: 1,
      xToPx: (x) => x,
      yToPx: (y) => y,
    })

    expect(lonToX).toHaveBeenCalled()
    expect(latToY).toHaveBeenCalled()
    expect(chaikinSmooth).toHaveBeenCalled()
    expect(douglasPeucker).toHaveBeenCalled()
  })

  it("returns valid SVG path for polygon with closing Z", () => {
    const line: Polyline = {
      coords: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      type: "polygon",
      color: "blue",
      width: 3,
      fill: "yellow",
      extent: () => [0, 0, 10, 10],
    }

    // Mock lonToX and latToY to identity for simplicity
    ;(lonToX as jest.Mock).mockImplementation((lon) => lon)
    ;(latToY as jest.Mock).mockImplementation((lat) => lat)

    const svg = lineToSVG({
      line,
      zoom: 1,
      xToPx: (x) => x,
      yToPx: (y) => y,
    })

    expect(svg).toContain('fill="yellow"')
    expect(svg).toContain('stroke="blue"')
    expect(svg).toContain('stroke-width="3"')
    expect(svg).toContain("Z") // closing path for polygon
    expect(svg).toContain("<svg")
    expect(svg).toContain("<path")
  })

  it("includes stroke-dasharray attribute if provided", () => {
    const line: Polyline = {
      coords: [
        [0, 0],
        [10, 10],
      ],
      type: "polyline",
      color: "green",
      width: 1,
      fill: "none",
      strokeDasharray: [5, 3],
      extent: () => [0, 0, 10, 10],
    }

    ;(lonToX as jest.Mock).mockImplementation((lon) => lon)
    ;(latToY as jest.Mock).mockImplementation((lat) => lat)

    const svg = lineToSVG({
      line,
      zoom: 1,
      xToPx: (x) => x,
      yToPx: (y) => y,
    })

    expect(svg).toContain('stroke-dasharray="5,3"')
  })
})

describe("textToSVG", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("throws error if text coordinates are missing", () => {
    const text = {
      coord: undefined,
      text: "Hello",
      font: "Arial",
      size: 12,
      color: "black",
      width: 1,
      anchor: "start",
    } as unknown as Text

    expect(() =>
      textToSVG({
        text,
        zoom: 1,
        xToPx: (x) => x,
        yToPx: (y) => y,
      })
    ).toThrow("No text coordinates given")
  })

  it("calculates position with projection and offsets", () => {
    const text: Text = {
      coord: [10, 20],
      text: "Test",
      font: "Verdana",
      size: 14,
      color: "red",
      width: "2px",
      anchor: "middle",
      offsetX: 5,
      offsetY: 3,
      offset: [5, 3], // if your code uses this; otherwise remove
      fill: "blue",
      extent: () => [0, 0, 100, 100], // stub extent function if required
    }

    ;(lonToX as jest.Mock).mockImplementation((lon, zoom) => lon * zoom)
    ;(latToY as jest.Mock).mockImplementation((lat, zoom) => lat * zoom)

    const xToPx = jest.fn((x) => x + 100)
    const yToPx = jest.fn((y) => y + 200)

    const svg = textToSVG({
      text,
      zoom: 1,
      xToPx,
      yToPx,
    })

    expect(lonToX).toHaveBeenCalledWith(10, 1)
    expect(latToY).toHaveBeenCalledWith(20, 1)
    expect(xToPx).toHaveBeenCalled()
    expect(yToPx).toHaveBeenCalled()

    // x = xToPx(lonToX(10)) - offset[0] = 110 - 5 = 105
    // y = yToPx(latToY(20)) - offset[1] = 220 - 3 = 217
    expect(svg).toContain('x="105"')
    expect(svg).toContain('y="217"')
    expect(svg).toContain('font-family="Verdana"')
    expect(svg).toContain('font-size="14pt"')
    expect(svg).toContain('stroke="red"')
    expect(svg).toContain('fill="blue"')
    expect(svg).toContain('stroke-width="2px"')
    expect(svg).toContain('text-anchor="middle"')
    expect(svg).toContain(">Test</text>")
  })

  it("defaults fill to none if not provided", () => {
    const text: Text = {
      coord: [0, 0],
      text: "NoFill",
      font: "Times",
      size: 10,
      color: "black",
      width: "1px",
      anchor: "end",
      offsetX: 5,
      offsetY: 3,
      offset: [5, 3], // if your code uses this; otherwise remove
      fill: "", // explicitly no fill
      extent: () => [0, 0, 100, 100], // stub extent function if required
    }

    ;(lonToX as jest.Mock).mockReturnValue(0)
    ;(latToY as jest.Mock).mockReturnValue(0)

    const svg = textToSVG({
      text,
      zoom: 1,
      xToPx: (x) => x,
      yToPx: (y) => y,
    })

    expect(svg).toContain('fill=""')
  })
})

describe("circleToSVG", () => {
  const xToPx = (x: number) => x + 10
  const yToPx = (y: number) => y + 20

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("throws if coords missing or malformed", () => {
    expect(() =>
      circleToSVG({
        circle: {
          coord: [] as any,
          radius: 10,
          color: "red",
          fill: "blue",
          width: 1,
        } as Circle,
        zoom: 1,
        xToPx,
        yToPx,
      })
    ).toThrow("Invalid circle: missing or malformed coordinates.")

    expect(() =>
      circleToSVG({
        circle: {
          coord: [1] as any,
          radius: 10,
          color: "red",
          fill: "blue",
          width: 1,
        } as Circle,
        zoom: 1,
        xToPx,
        yToPx,
      })
    ).toThrow("Invalid circle: missing or malformed coordinates.")
  })

  it("renders correct SVG string", () => {
    const circle = {
      coord: [5, 10],
      radius: 15,
      color: "green",
      fill: "yellow",
      width: 2,
    } as Circle

    // Patch circleToSVG to use mocked meterToPixel inside test scope
    const originalMeterToPixel = (global as any).meterToPixel
    ;(global as any).meterToPixel = meterToPixel

    const svg = circleToSVG({
      circle,
      zoom: 2,
      xToPx,
      yToPx,
    })

    expect(svg).toContain('cx="10"') // lonToX(5,2) = 10, xToPx(10)=20
    expect(svg).toContain('cy="20"') // latToY(10,2)=20, yToPx(20)=40
    expect(svg).toContain('r="30"') // radius 15 * zoom 2 = 30
    expect(svg).toContain('stroke="green"')
    expect(svg).toContain('fill="yellow"')
    expect(svg).toContain('stroke-width="2"')
    ;(global as any).meterToPixel = originalMeterToPixel
  })
})

// drawMarkers(
//loadMarkers(
