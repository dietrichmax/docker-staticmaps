import sharp from "sharp"
import Image from "../../src/staticmaps/image"
import { TileData, Coordinate } from "../../src/types/types"

jest.mock("sharp")

const mockedSharp = sharp as unknown as jest.Mock

describe("Image class", () => {
  const mockToBuffer = jest.fn()
  const mockMetadata = jest.fn()
  const mockExtract = jest.fn()
  const mockComposite = jest.fn()
  const mockToFile = jest.fn()
  const mockWebp = jest.fn()
  const mockJpeg = jest.fn()
  const mockPng = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockToBuffer.mockReset()
    mockMetadata.mockReset()
    mockExtract.mockReset()
    mockComposite.mockReset()
    mockWebp.mockReset()
    mockJpeg.mockReset()
    mockPng.mockReset()
    mockToFile.mockReset()

    mockExtract.mockReturnValue({ toBuffer: mockToBuffer })
    mockComposite.mockReturnValue({ toBuffer: mockToBuffer })
    mockWebp.mockReturnValue({
      toFile: mockToFile,
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("webp")),
    })
    mockJpeg.mockReturnValue({
      toFile: mockToFile,
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("jpeg")),
    })
    mockPng.mockReturnValue({
      toFile: mockToFile,
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("png")),
    })

    mockedSharp.mockImplementation(() => ({
      metadata: mockMetadata,
      extract: mockExtract,
      composite: mockComposite,
      webp: mockWebp,
      jpeg: mockJpeg,
      png: mockPng,
      toBuffer: mockToBuffer,
      toFile: mockToFile,
    }))
  })

  test("constructor sets defaults", () => {
    const img = new Image()
    expect(img["width"]).toBe(800)
    expect(img["height"]).toBe(600)
    expect(img["quality"]).toBe(100)

    const img2 = new Image({ width: 100, height: 200, quality: 80 })
    expect(img2["width"]).toBe(100)
    expect(img2["height"]).toBe(200)
    expect(img2["quality"]).toBe(80)
  })

  test("returns success and position with extracted buffer", async () => {
    const fakeBuffer = Buffer.from("fake")
    mockMetadata.mockResolvedValue({ width: 100, height: 100 })
    mockToBuffer.mockResolvedValue(fakeBuffer)

    const img = new Image({ width: 80, height: 80 })
    const data = {
      body: Buffer.from("body"),
      box: [10, 20] as Coordinate,
    }

    const result = await img.prepareTileParts(data)

    expect(result.success).toBe(true)
    expect(result.position).toEqual({ top: 20, left: 10 })
    expect(result.data).toBe(fakeBuffer)
  })

  test("prepareTileParts returns failure if metadata missing width/height", async () => {
    mockMetadata.mockResolvedValue({ width: undefined, height: undefined })

    const img = new Image()
    const result = await img.prepareTileParts({
      body: Buffer.from("body"),
      box: [0, 0],
    })

    expect(result.success).toBe(false)
  })

  test("prepareTileParts returns failure if w or h are 0 or invalid", async () => {
    mockMetadata.mockResolvedValue({ width: 10, height: 10 })

    const img = new Image()
    // Simulate conditions that cause w or h to be 0 by setting large positive x,y
    const result = await img.prepareTileParts({
      body: Buffer.from("body"),
      box: [1000, 1000],
    })

    expect(result.success).toBe(false)
  })

  test("prepareTileParts catches errors and returns failure", async () => {
    mockMetadata.mockRejectedValue(new Error("fail"))

    const img = new Image()
    const result = await img.prepareTileParts({
      body: Buffer.from("body"),
      box: [0, 0],
    })

    expect(result.success).toBe(false)
  })

  test("draw initializes base image and composites tiles", async () => {
    const img = new Image()
    mockMetadata.mockResolvedValue({ width: 100, height: 100 })
    mockToBuffer.mockResolvedValue(Buffer.from("part"))

    // Provide one tile to draw
    const tiles: TileData[] = [
      {
        body: Buffer.from("body"),
        box: [0, 0] as Coordinate, // <-- cast as tuple
      },
    ]
    const success = await img.draw(tiles)
    expect(success).toBe(true)
    expect(mockComposite).toHaveBeenCalled()
  })

  test("draw uses existing image if set", async () => {
    const img = new Image()
    // Manually set image buffer
    img["image"] = Buffer.from("existing")
    mockMetadata.mockResolvedValue({ width: 100, height: 100 })
    mockToBuffer.mockResolvedValue(Buffer.from("part"))

    const tiles: TileData[] = [
      {
        body: Buffer.from("body"),
        box: [0, 0] as Coordinate, // <-- cast as tuple
      },
    ]
    const success = await img.draw(tiles)
    expect(success).toBe(true)
    expect(mockComposite).toHaveBeenCalled()
  })

  test("save calls sharp with correct format and options", async () => {
    const img = new Image()
    img["image"] = Buffer.from("img")

    await img.save("test.webp")
    expect(mockWebp).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 100 })
    )
    expect(mockToFile).toHaveBeenCalled()

    await img.save("test.jpg", { quality: 50 })
    expect(mockJpeg).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 50 })
    )

    await img.save("test.png")
    expect(mockPng).toHaveBeenCalled()
  })

  test("buffer returns buffer in requested format", async () => {
    const img = new Image()
    img["image"] = Buffer.from("img")

    const webpBuffer = await img.buffer("image/webp")
    expect(webpBuffer).toBeInstanceOf(Buffer)

    const jpegBuffer = await img.buffer("image/jpeg")
    expect(jpegBuffer).toBeInstanceOf(Buffer)

    const pngBuffer = await img.buffer("image/png")
    expect(pngBuffer).toBeInstanceOf(Buffer)
  })
})
