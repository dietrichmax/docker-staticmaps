import sharp from "sharp"
import { drawMarkers, loadMarkers } from "../../src/staticmaps/renderer"

jest.mock("sharp")

const mockSharpInstance = {
  metadata: jest.fn(),
  resize: jest.fn(),
  toBuffer: jest.fn(),
  composite: jest.fn(),
}

const sharpMock = sharp as unknown as jest.Mock
const sharpInstance = {
  metadata: jest.fn(),
  resize: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
}

// Mock workOnQueue helper used inside drawMarkers
jest.mock("../../src/staticmaps/utils", () => ({
  workOnQueue: jest.fn((queue: Array<() => Promise<void>>) =>
    Promise.all(queue.map((fn) => fn()))
  ),
  lonToX: jest.fn((lon, zoom) => lon * zoom),
  latToY: jest.fn((lat, zoom) => lat * zoom),
}))

describe("drawMarkers", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock sharp calls to return mocked instance with chainable methods
    sharpMock.mockImplementation(() => mockSharpInstance)
    mockSharpInstance.metadata.mockResolvedValue({ width: 10, height: 10 })
    mockSharpInstance.resize.mockReturnThis()
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from("marker"))
    mockSharpInstance.composite.mockReturnThis()
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from("composited"))
  })

  it("composites one marker on base image", async () => {
    const baseBuffer = Buffer.from("base")
    const markers: any = [
      {
        coord: [5, 5],
        imgData: Buffer.from("img"),
        width: 10,
        height: 10,
        drawWidth: 10,
        drawHeight: 10,
        resizeMode: "cover",
        setSize: jest.fn(),
      },
    ]

    const result = await drawMarkers(baseBuffer, markers, 100, 100)

    expect(sharpMock).toHaveBeenCalled()
    expect(mockSharpInstance.composite).toHaveBeenCalled()
    expect(result).toEqual(Buffer.from("composited"))
    expect(markers[0].setSize).not.toHaveBeenCalled() // because width/height defined
  })

  it("throws if marker coord missing", async () => {
    const baseBuffer = Buffer.from("base")
    const markers: any = [
      {
        coord: undefined,
        imgData: Buffer.from("img"),
        width: 10,
        height: 10,
        drawWidth: 10,
        drawHeight: 10,
        resizeMode: "cover",
        setSize: jest.fn(),
      },
    ]

    await expect(drawMarkers(baseBuffer, markers, 100, 100)).rejects.toThrow(
      "No marker coord"
    )
  })

  it("skips marker if coord out of bounds", async () => {
    const baseBuffer = Buffer.from("base")
    const markers: any = [
      {
        coord: [200, 300], // out of 100x100 bounds
        imgData: Buffer.from("img"),
        width: 10,
        height: 10,
        drawWidth: 10,
        drawHeight: 10,
        resizeMode: "cover",
        setSize: jest.fn(),
      },
    ]

    const result = await drawMarkers(baseBuffer, markers, 100, 100)

    // composite should NOT be called because marker skipped
    expect(mockSharpInstance.composite).not.toHaveBeenCalled()
    expect(result).toBe(baseBuffer) // original buffer returned unchanged
  })

  it("calls setSize if width/height missing", async () => {
    const baseBuffer = Buffer.from("base")
    const markers: any = [
      {
        coord: [5, 5],
        imgData: Buffer.from("img"),
        width: undefined,
        height: undefined,
        drawWidth: 10,
        drawHeight: 10,
        resizeMode: "contain",
        setSize: jest.fn(),
      },
    ]

    const result = await drawMarkers(baseBuffer, markers, 100, 100)

    expect(mockSharpInstance.metadata).toHaveBeenCalled()
    expect(markers[0].setSize).toHaveBeenCalledWith(10, 10)
    expect(result).toEqual(Buffer.from("composited"))
  })

  it("resizes marker image when draw size differs", async () => {
    const baseBuffer = Buffer.from("base")
    const markers: any = [
      {
        coord: [5, 5],
        imgData: Buffer.from("img"),
        width: 10,
        height: 10,
        drawWidth: 20,
        drawHeight: 15,
        resizeMode: "fill",
        setSize: jest.fn(),
      },
    ]

    await drawMarkers(baseBuffer, markers, 100, 100)

    expect(mockSharpInstance.resize).toHaveBeenCalledWith({
      fit: "fill",
      width: 20,
      height: 15,
    })
  })

  it("throws error if metadata width/height cannot be detected", async () => {
    const baseBuffer = Buffer.from("base")
    const markers = [
      {
        coord: [10, 10],
        imgData: Buffer.from("imgdata"),
        width: null,
        height: null,
        img: "marker.png",
        setSize: jest.fn(),
      },
    ]

    // Simulate metadata with undefined/non-finite width and height
    mockSharpInstance.metadata.mockResolvedValue({
      width: NaN,
      height: NaN,
    })

    await expect(
      drawMarkers(baseBuffer, markers as any, 100, 100)
    ).rejects.toThrow(
      "Cannot detect image size of marker marker.png. Please define manually!"
    )
  })
})

describe("loadMarkers", () => {
  beforeEach(() => {
    jest.clearAllMocks()

    sharpMock.mockImplementation(() => sharpInstance as any)
    sharpInstance.toBuffer.mockResolvedValue(Buffer.from("imagebuffer"))

    // Reset fetch mock
    global.fetch = jest.fn()
  })

  it("returns true immediately if markers empty", async () => {
    const result = await loadMarkers([], 2, jest.fn(), jest.fn())
    expect(result).toBe(true)
  })

  it("fetches and resizes remote image marker", async () => {
    const markers = [
      {
        img: "https://example.com/marker.png",
        coord: [1, 2],
        set: jest.fn(),
        color: "#123456",
        width: 10,
        height: 15,
      },
    ]

    // Mock fetch to return a successful response with image data
    const arrayBuffer = new Uint8Array([1, 2, 3]).buffer
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer),
    })

    // mock xToPx and yToPx functions
    const xToPx = jest.fn((x) => x * 10)
    const yToPx = jest.fn((y) => y * 20)

    const result = await loadMarkers(markers as any, 2, xToPx, yToPx)

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/marker.png",
      { method: "GET" }
    )
    expect(sharpMock).toHaveBeenCalled()
    expect(sharpInstance.resize).toHaveBeenCalledWith(10, 15)
    expect(markers[0].set).toHaveBeenCalledWith(Buffer.from("imagebuffer"))

    // Check adjusted coordinates calculation
    // lonToX(1,2) = 2, xToPx(2)=20, offset x = 10/2=5 => 20-5=15
    // latToY(2,2) = 4, yToPx(4)=80, offset y = 15 => 80-15=65
    expect(markers[0].coord).toEqual([15, 65])

    expect(result).toBe(true)
  })

  it("generates default SVG icon when img is not a URL", async () => {
    const markers: any = [
      {
        img: "non-url-icon",
        coord: [3, 4],
        set: jest.fn(),
        color: "#abcdef",
        width: undefined,
        height: undefined,
      },
    ]

    // mock xToPx and yToPx functions
    const xToPx = jest.fn((x) => x * 5)
    const yToPx = jest.fn((y) => y * 10)

    const result = await loadMarkers(markers as any, 1, xToPx, yToPx)

    // sharp should be called once for SVG buffer
    expect(sharpMock).toHaveBeenCalledTimes(1)
    // resize is not called in this branch, only toBuffer
    expect(sharpInstance.resize).not.toHaveBeenCalled()
    expect(markers[0].set).toHaveBeenCalledWith(Buffer.from("imagebuffer"))

    expect(markers[0].offset).toEqual([20 / 2, 20]) // defaults

    // Coordinates calculated with defaults (width=20,height=20)
    // lonToX(3,1)=3, xToPx(3)=15, offset x=10, so 15-10=5
    // latToY(4,1)=4, yToPx(4)=40, offset y=20, so 40-20=20
    expect(markers[0].coord).toEqual([5, 20])

    expect(result).toBe(true)
  })

  it("throws error if fetch fails", async () => {
    const markers = [
      {
        img: "https://bad-url.com/icon.png",
        coord: [0, 0],
        set: jest.fn(),
        width: 10,
        height: 10,
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
    })

    await expect(
      loadMarkers(markers as any, 1, jest.fn(), jest.fn())
    ).rejects.toThrow(/Failed to fetch image from/)
  })
})
