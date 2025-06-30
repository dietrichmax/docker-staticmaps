import sharp from "sharp"
import Image from "../../src/staticmaps/image"
import { TileData, TilePart } from "../../src/types/types"
import PDFDocument from "pdfkit"
import { Writable } from "stream"

// Mock sharp and PDFKit for isolated testing
jest.mock("sharp")
jest.mock("pdfkit")

const mockedSharp = sharp as jest.MockedFunction<typeof sharp>
const mockedPDFDocument = PDFDocument as jest.MockedClass<typeof PDFDocument>

describe("Image class", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("constructor", () => {
    it("should initialize with default values", () => {
      const img = new Image()
      expect(img["width"]).toBe(800)
      expect(img["height"]).toBe(600)
      expect(img["quality"]).toBe(100)
    })

    it("should accept custom options", () => {
      const img = new Image({ width: 300, height: 400, quality: 80 })
      expect(img["width"]).toBe(300)
      expect(img["height"]).toBe(400)
      expect(img["quality"]).toBe(80)
    })
  })

  describe("prepareTileParts", () => {
    it("should return success false if metadata missing width/height", async () => {
      const tileMock = {
        metadata: jest
          .fn()
          .mockResolvedValue({ width: undefined, height: undefined }),
      }
      mockedSharp.mockReturnValueOnce(tileMock as any)

      const img = new Image()
      const tileData: TileData = {
        body: Buffer.from(""),
        box: [0, 0],
      }

      const result = await img.prepareTileParts(tileData)
      expect(result.success).toBe(false)
    })

    it("should extract the correct part and return success true", async () => {
      const fakeBuffer = Buffer.from("tilepart")
      const tileMock = {
        metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
        extract: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(fakeBuffer),
      }
      mockedSharp.mockReturnValueOnce(tileMock as any)

      const img = new Image({ width: 150, height: 150 })
      const tileData: TileData = {
        body: Buffer.from(""),
        box: [10, 10],
      }

      const result = await img.prepareTileParts(tileData)

      expect(result.success).toBe(true)
      expect(result.position).toEqual({ top: 10, left: 10 })
      expect(result.data).toBe(fakeBuffer)
      expect(tileMock.extract).toHaveBeenCalled()
      expect(tileMock.toBuffer).toHaveBeenCalled()
    })

    it("should return success false if extraction fails", async () => {
      const tileMock = {
        metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
        extract: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error("fail")),
      }
      mockedSharp.mockReturnValueOnce(tileMock as any)

      const img = new Image()
      const tileData: TileData = {
        body: Buffer.from(""),
        box: [0, 0],
      }

      const result = await img.prepareTileParts(tileData)
      expect(result.success).toBe(false)
    })
  })

  describe("draw", () => {
    it("should create base image if no image set", async () => {
      const blankBuffer = Buffer.from("blank")
      const compositeBuffer = Buffer.from("composited")

      // sharp({create: ...}).png().toBuffer() returns blankBuffer
      const sharpInstance = {
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(blankBuffer),
      }
      mockedSharp.mockReturnValueOnce(sharpInstance as any)

      // sharp(baseImage).composite(...).toBuffer() returns compositeBuffer
      const compositeSharpInstance = {
        composite: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(compositeBuffer),
      }
      mockedSharp.mockReturnValueOnce(compositeSharpInstance as any)

      const img = new Image()
      img["image"] = undefined

      // Mock prepareTileParts to return one valid tile part
      jest.spyOn(img, "prepareTileParts").mockResolvedValue({
        success: true,
        position: { top: 0, left: 0 },
        data: Buffer.from("tile"),
      })

      const result = await img.draw([{ body: Buffer.from("x"), box: [0, 0] }])

      expect(result).toBe(true)
      expect(img["image"]).toBe(compositeBuffer)
      expect(sharpInstance.png).toHaveBeenCalled()
      expect(compositeSharpInstance.composite).toHaveBeenCalled()
    })

    it("should use existing image as base", async () => {
      const existingBuffer = Buffer.from("existing")
      const compositeBuffer = Buffer.from("composited")

      // sharp(baseImage).composite(...).toBuffer() returns compositeBuffer
      const compositeSharpInstance = {
        composite: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(compositeBuffer),
      }
      mockedSharp.mockReturnValueOnce(compositeSharpInstance as any)

      const img = new Image()
      img["image"] = existingBuffer

      jest.spyOn(img, "prepareTileParts").mockResolvedValue({
        success: true,
        position: { top: 0, left: 0 },
        data: Buffer.from("tile"),
      })

      const result = await img.draw([{ body: Buffer.from("x"), box: [0, 0] }])

      expect(result).toBe(true)
      expect(img["image"]).toBe(compositeBuffer)
      expect(mockedSharp).toHaveBeenCalledWith(existingBuffer)
      expect(compositeSharpInstance.composite).toHaveBeenCalled()
    })
  })

  describe("compositeSVG", () => {
    it("should composite svgBuffer on image", async () => {
      const existingBuffer = Buffer.from("existing")
      const compositeBuffer = Buffer.from("composited")

      const compositeSharpInstance = {
        composite: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(compositeBuffer),
      }
      mockedSharp.mockReturnValueOnce(compositeSharpInstance as any)

      const img = new Image()
      img["image"] = existingBuffer

      await expect(
        img.compositeSVG(Buffer.from("svgdata"), { top: 10, left: 20 })
      ).resolves.toBe(img)
      expect(mockedSharp).toHaveBeenCalledWith(existingBuffer)
      expect(compositeSharpInstance.composite).toHaveBeenCalledWith([
        { input: Buffer.from("svgdata"), top: 10, left: 20 },
      ])
      expect(img["image"]).toBe(compositeBuffer)
    })

    it("should throw if no image", async () => {
      const img = new Image()
      await expect(img.compositeSVG(Buffer.from("svgdata"))).rejects.toThrow(
        "No image to composite on"
      )
    })
  })

  describe("buffer", () => {
    it("should throw if no image buffer", async () => {
      const img = new Image()
      await expect(img.buffer()).rejects.toThrow("No image buffer to convert")
    })

    it("should convert to webp", async () => {
      const fakeBuffer = Buffer.from("webpbuffer")
      const sharpInstance = {
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(fakeBuffer),
      }
      mockedSharp.mockReturnValueOnce(sharpInstance as any)

      const img = new Image()
      img["image"] = Buffer.from("image")

      const result = await img.buffer("webp", { quality: 80 })

      expect(result).toBe(fakeBuffer)
      expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 80 })
    })

    it("should convert to jpeg", async () => {
      const fakeBuffer = Buffer.from("jpegbuffer")
      const sharpInstance = {
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(fakeBuffer),
      }
      mockedSharp.mockReturnValueOnce(sharpInstance as any)

      const img = new Image()
      img["image"] = Buffer.from("image")

      const result = await img.buffer("jpeg")

      expect(result).toBe(fakeBuffer)
      expect(sharpInstance.jpeg).toHaveBeenCalled()
    })

    it("should convert to png", async () => {
      const fakeBuffer = Buffer.from("pngbuffer")
      const sharpInstance = {
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(fakeBuffer),
      }
      mockedSharp.mockReturnValueOnce(sharpInstance as any)

      const img = new Image()
      img["image"] = Buffer.from("image")

      const result = await img.buffer("png")

      expect(result).toBe(fakeBuffer)
      expect(sharpInstance.png).toHaveBeenCalled()
    })

    it("should convert to pdf", async () => {
      const img = new Image()
      img["image"] = Buffer.from("image")

      // Mock sharpInstance.metadata() to provide width/height
      const sharpMetadataInstance = {
        metadata: jest.fn().mockResolvedValue({ width: 400, height: 300 }),
      }
      mockedSharp.mockReturnValueOnce(sharpMetadataInstance as any)

      // Mock private toPDFBuffer method (access via any)
      const pdfBuffer = Buffer.from("pdfbuffer")
      ;(img as any).toPDFBuffer = jest.fn().mockResolvedValue(pdfBuffer)

      const result = await img.buffer("pdf")

      expect(result).toBe(pdfBuffer)
      expect(sharpMetadataInstance.metadata).toHaveBeenCalled()
      expect((img as any).toPDFBuffer).toHaveBeenCalled()
    })

    it("should throw on unsupported mime", async () => {
      const img = new Image()
      img["image"] = Buffer.from("image")

      await expect(img.buffer("unknown/mime")).rejects.toThrow(
        /Unsupported image format/
      )
    })
  })

  describe("toPDFBuffer", () => {
    /*it("should return pdf buffer", async () => {
      const img = new Image()
      img["image"] = Buffer.from("imagebuffer")

      // Mock PDFDocument pipe and writable stream behavior
      const chunks: Buffer[] = []
      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(Buffer.from(chunk))
          callback()
        },
      })

      const endMock = jest.fn(() => writable.emit("finish"))
      mockedPDFDocument.mockImplementation(() => {
        return {
          pipe: jest.fn().mockReturnValue(writable),
          image: jest.fn(),
          end: endMock,
          on: jest.fn(),
        } as any
      })

      // Call private method through any cast
      const pdfBufferPromise = (img as any).toPDFBuffer(300, 200)
      const result = await pdfBufferPromise

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
      expect(mockedPDFDocument).toHaveBeenCalledWith({ size: [300, 200], margin: 0 })
    })*/

    it("should throw if no image", async () => {
      const img = new Image()
      await expect((img as any).toPDFBuffer(300, 200)).rejects.toThrow(
        "Image buffer missing"
      )
    })
  })
})
