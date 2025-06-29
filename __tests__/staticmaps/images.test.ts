import sharp from "sharp"
import Image from "../../src/staticmaps/image"
import { TileData, Coordinate } from "../../src/types/types"

jest.mock("sharp")

const mockedSharp = sharp as unknown as jest.Mock

describe("Image class", () => {
  let mockToBuffer: jest.Mock
  let mockMetadata: jest.Mock
  let mockExtract: jest.Mock
  let mockComposite: jest.Mock
  let mockToFile: jest.Mock
  let mockWebp: jest.Mock
  let mockJpeg: jest.Mock
  let mockPng: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockToBuffer = jest.fn()
    mockMetadata = jest.fn()
    mockExtract = jest.fn()
    mockComposite = jest.fn()
    mockToFile = jest.fn()
    mockWebp = jest.fn()
    mockJpeg = jest.fn()
    mockPng = jest.fn()

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

    mockedSharp.mockImplementation((input?: Buffer | object) => {
      // If input is object with create: { ... }, simulate base image creation
      if (typeof input === "object" && input !== null && "create" in input) {
        return {
          png: jest.fn().mockReturnValue({ toBuffer: mockToBuffer }),
          toBuffer: mockToBuffer,
          metadata: mockMetadata,
          extract: mockExtract,
          composite: mockComposite,
          webp: mockWebp,
          jpeg: mockJpeg,
          toFile: mockToFile,
        }
      }

      // If input is Buffer or undefined (like this.image)
      return {
        metadata: mockMetadata,
        extract: mockExtract,
        composite: mockComposite,
        webp: mockWebp,
        jpeg: mockJpeg,
        png: mockPng,
        toBuffer: mockToBuffer,
        toFile: mockToFile,
      }
    })
  })

  describe("constructor", () => {
    it("sets defaults", () => {
      const img = new Image()
      expect(img["width"]).toBe(800)
      expect(img["height"]).toBe(600)
      expect(img["quality"]).toBe(100)
    })
    it("sets passed options", () => {
      const img = new Image({ width: 123, height: 456, quality: 78 })
      expect(img["width"]).toBe(123)
      expect(img["height"]).toBe(456)
      expect(img["quality"]).toBe(78)
    })
  })

  describe("prepareTileParts", () => {
    it("returns success and extracted buffer with correct position", async () => {
      mockMetadata.mockResolvedValue({ width: 100, height: 100 })
      mockToBuffer.mockResolvedValue(Buffer.from("extracted"))

      const img = new Image({ width: 80, height: 80 })
      const tileData: TileData = {
        body: Buffer.from("body"),
        box: [10, 20],
      }
      const result = await img.prepareTileParts(tileData)

      expect(result.success).toBe(true)
      expect(result.position).toEqual({ top: 20, left: 10 })
      expect(result.data).toEqual(Buffer.from("extracted"))
      expect(mockExtract).toHaveBeenCalled()
      expect(mockToBuffer).toHaveBeenCalled()
    })

    it("returns failure if metadata missing width or height", async () => {
      mockMetadata.mockResolvedValue({ width: undefined, height: undefined })
      const img = new Image()
      const result = await img.prepareTileParts({
        body: Buffer.from("b"),
        box: [0, 0],
      })
      expect(result.success).toBe(false)
    })

    it("returns failure if computed width or height <= 0", async () => {
      mockMetadata.mockResolvedValue({ width: 10, height: 10 })
      const img = new Image({ width: 5, height: 5 })
      // large positive x,y so w or h will be 0 or less
      const result = await img.prepareTileParts({
        body: Buffer.from("b"),
        box: [1000, 1000],
      })
      expect(result.success).toBe(false)
    })

    it("returns failure if sharp metadata call throws error", async () => {
      mockMetadata.mockRejectedValue(new Error("fail"))
      const img = new Image()
      const result = await img.prepareTileParts({
        body: Buffer.from("b"),
        box: [0, 0],
      })
      expect(result.success).toBe(false)
    })
  })

  describe("draw", () => {
    it("creates new base image if no existing image", async () => {
      mockToBuffer.mockResolvedValue(Buffer.from("basebuffer"))
      mockMetadata.mockResolvedValue({ width: 10, height: 10 })

      const img = new Image()
      // Only one tile
      const tiles: TileData[] = [{ body: Buffer.from("b"), box: [0, 0] }]
      mockToBuffer.mockResolvedValueOnce(Buffer.from("partbuffer")) // for tile.extract.toBuffer
      const result = await img.draw(tiles)

      expect(result).toBe(true)
      expect(mockedSharp).toHaveBeenCalled() // sharp called multiple times
      expect(mockComposite).toHaveBeenCalled()
      expect(img["image"]).toBeDefined()
    })

    it("uses existing image if set", async () => {
      mockToBuffer.mockResolvedValue(Buffer.from("basebuffer"))
      mockMetadata.mockResolvedValue({ width: 10, height: 10 })

      const img = new Image()
      img["image"] = Buffer.from("existingimage")
      const tiles: TileData[] = [{ body: Buffer.from("b"), box: [0, 0] }]
      mockToBuffer.mockResolvedValueOnce(Buffer.from("partbuffer")) // for tile.extract.toBuffer
      const result = await img.draw(tiles)

      expect(result).toBe(true)
      expect(mockComposite).toHaveBeenCalled()
      expect(img["image"]).toBeDefined()
    })
  })

  describe("buffer", () => {
    it("returns buffer in webp format", async () => {
      const img = new Image()
      img["image"] = Buffer.from("imgdata")
      const buf = await img.buffer("image/webp")
      expect(buf).toBeInstanceOf(Buffer)
    })

    it("returns buffer in jpeg format", async () => {
      const img = new Image()
      img["image"] = Buffer.from("imgdata")
      const buf = await img.buffer("image/jpeg")
      expect(buf).toBeInstanceOf(Buffer)
    })

    it("returns buffer in png format by default", async () => {
      const img = new Image()
      img["image"] = Buffer.from("imgdata")
      const buf = await img.buffer("image/png")
      expect(buf).toBeInstanceOf(Buffer)
    })

    it("throws an error for unsupported image format", async () => {
      const img = new Image()
      img["image"] = Buffer.from("imgdata")
      await expect(img.buffer("image/unknown")).rejects.toThrow(
        'Unsupported image format: "image/unknown"'
      )
    })

    it("throws if no image buffer is set", async () => {
      const img = new Image()
      await expect(img.buffer("png")).rejects.toThrow(
        "No image buffer to convert"
      )
    })

    it("uses passed quality option if given", async () => {
      const img = new Image()
      img["image"] = Buffer.from("imgdata")
      await img.buffer("image/jpeg", { quality: 25 })
      expect(mockJpeg).toHaveBeenCalledWith(
        expect.objectContaining({ quality: 25 })
      )
    })
  })
})
