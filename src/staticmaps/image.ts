import sharp from "sharp"
import { ImageOptions, TileData, TilePart } from "../types/types"
import PDFDocument from "pdfkit"
import { Writable } from "stream"
import logger from "../utils/logger"

/**
 * Class to handle image operations such as drawing tiles and saving images.
 */
export default class Image {
  private width: number
  private height: number
  private quality: number
  private image?: Buffer
  private tempBuffer?: Buffer

  /**
   * Constructor for the Image class.
   * @param options - Image options including width, height, and quality.
   */
  constructor(options: ImageOptions = {}) {
    this.width = options.width || 800
    this.height = options.height || 600
    this.quality = options.quality || 100
  }

  /**
   * Prepare all tiles to fit the baselayer.
   * @param data - Tile data including image buffer and box coordinates.
   */
  async prepareTileParts(data: TileData): Promise<TilePart> {
    const tile = sharp(data.body)
    try {
      const metadata = await tile.metadata()
      if (!metadata.width || !metadata.height) {
        return { success: false }
      }

      const [x, y] = data.box
      const sx = Math.max(0, x)
      const sy = Math.max(0, y)
      const dx = Math.max(0, -x)
      const dy = Math.max(0, -y)
      const extraWidth = x + (metadata.width - this.width)
      const extraHeight = y + (metadata.height - this.height)
      const w = metadata.width + Math.min(0, x) - Math.max(0, extraWidth)
      const h = metadata.height + Math.min(0, y) - Math.max(0, extraHeight)

      if (w <= 0 || h <= 0) {
        return { success: false }
      }

      const part = await tile
        .extract({ left: dx, top: dy, width: w, height: h })
        .toBuffer()
      return {
        success: true,
        position: { top: Math.round(sy), left: Math.round(sx) },
        data: part,
      }
    } catch (error) {
      return { success: false }
    }
  }

  /**
   * Draw tiles on the base layer.
   * @param tiles - Array of tile data to be drawn.
   */
  async draw(tiles: TileData[]): Promise<boolean> {
    // Prepare base image: use this.image if available; otherwise create a transparent blank image
    let baseImage: Buffer
    if (!this.image) {
      baseImage = await sharp({
        create: {
          width: this.width,
          height: this.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer()
    } else {
      baseImage = this.image
    }

    // Prepare all tile parts asynchronously
    const preparedTiles = (
      await Promise.all(tiles.map((tile) => this.prepareTileParts(tile)))
    ).filter(
      (
        v
      ): v is TilePart & {
        position: { top: number; left: number }
        data: Buffer
      } => v.success && v.data !== undefined
    )

    // Composite all prepared tiles on the base image
    this.image = await sharp(baseImage)
      .composite(
        preparedTiles.map(({ position, data }) => ({
          input: data,
          ...position,
        }))
      )
      .toBuffer()

    return true
  }

  /**
   * Convert internal image buffer to a PDF buffer.
   */
  private async toPDFBuffer(width: number, height: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.image) throw new Error("Image buffer missing")
      const doc = new PDFDocument({ size: [width, height], margin: 0 })
      const chunks: Buffer[] = []

      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(Buffer.from(chunk))
          callback()
        },
      })

      doc.pipe(writable)
      doc.image(this.image, 0, 0, { width, height })
      doc.end()

      writable.on("finish", () => resolve(Buffer.concat(chunks)))
      writable.on("error", reject)
    })
  }

  /**
   * Composite an SVG buffer onto the image.
   */
  async compositeSVG(
    svgBuffer: Buffer,
    options?: { top?: number; left?: number }
  ): Promise<this> {
    if (!this.image) throw new Error("No image to composite on")

    this.image = await sharp(this.image)
      .composite([
        { input: svgBuffer, top: options?.top || 0, left: options?.left || 0 },
      ])
      .toBuffer()

    return this
  }

  /**
   * Adds a frame or padding around the current image.
   * @param options - Border options including background color and width.
   */
  async addFrame(options: {
    width?: number
    background?: string
  }): Promise<this> {
    if (!this.image) throw new Error("No image to extend")

    const borderWidth = options.width || 10
    const borderColor = options.background || "#ffffff"

    this.image = await sharp(this.image)
      .extend({
        top: borderWidth,
        bottom: borderWidth,
        left: borderWidth,
        right: borderWidth,
        background: borderColor,
      })
      .toBuffer()

    return this
  }

  /**
   * Return the image as a buffer.
   * @param mime - The MIME type or short format name (e.g., "png", "jpeg", "webp", "pdf").
   * @param outOpts - Additional options for converting to a buffer.
   */
  async buffer(
    mime = "image/png",
    outOpts: Record<string, any> = {}
  ): Promise<Buffer> {
    if (!this.image) {
      throw new Error("No image buffer to convert")
    }

    const normalized = mime.toLowerCase().trim()
    outOpts.quality = outOpts.quality || this.quality

    const sharpInstance = sharp(this.image)

    switch (normalized) {
      case "image/webp":
      case "webp":
        return sharpInstance.webp(outOpts).toBuffer()

      case "image/jpeg":
      case "image/jpg":
      case "jpeg":
      case "jpg":
        return sharpInstance.jpeg(outOpts).toBuffer()

      case "image/png":
      case "png":
        return sharpInstance.png(outOpts).toBuffer()

      case "application/pdf":
      case "pdf":
        const metadata = await sharpInstance.metadata()
        const originalWidth = metadata.width || 600
        const originalHeight = metadata.height || 600
        const width = outOpts.width ?? originalWidth
        const height =
          outOpts.height ??
          (originalWidth
            ? Math.round((originalHeight / originalWidth) * width)
            : originalHeight)

        return this.toPDFBuffer(width, height)
      default:
        logger.error(`Unsupported image format: "${mime}"`)
        throw new Error(`Unsupported image format: "${mime}"`)
    }
  }
}
