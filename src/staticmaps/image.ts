import sharp from "sharp"
import { ImageOptions, TileData, TilePart } from "../types/types"

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
    if (!this.image) {
      const baselayer = sharp({
        create: {
          width: this.width,
          height: this.height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
      this.tempBuffer = await baselayer.png().toBuffer()
    } else {
      this.tempBuffer = this.image
    }

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

    this.tempBuffer = await sharp(this.tempBuffer)
      .composite(
        preparedTiles.map(({ position, data }) => ({
          input: data,
          ...position,
        }))
      )
      .toBuffer()

    this.image = this.tempBuffer
    return true
  }

  /**
   * Save the image to a file.
   * @param fileName - The name of the output file.
   * @param outOpts - Additional options for saving the image.
   */
  async save(
    fileName = "output.png",
    outOpts: Record<string, any> = {}
  ): Promise<void> {
    const format = (fileName.split(".").pop() || "").toLowerCase()
    outOpts.quality = outOpts.quality || this.quality

    const sharpInstance = sharp(this.image)
    switch (format) {
      case "webp":
        await sharpInstance.webp(outOpts).toFile(fileName)
        break
      case "jpg":
      case "jpeg":
        await sharpInstance.jpeg(outOpts).toFile(fileName)
        break
      default:
        await sharpInstance.png(outOpts).toFile(fileName)
    }
  }

  /**
   * Return the image as a buffer.
   * @param mime - The MIME type of the output image.
   * @param outOpts - Additional options for converting to a buffer.
   */
  async buffer(
    mime = "image/png",
    outOpts: Record<string, any> = {}
  ): Promise<Buffer> {
    outOpts.quality = outOpts.quality || this.quality
    const sharpInstance = sharp(this.image)
    switch (mime.toLowerCase()) {
      case "image/webp":
        return sharpInstance.webp(outOpts).toBuffer()
      case "image/jpeg":
      case "image/jpg":
        return sharpInstance.jpeg(outOpts).toBuffer()
      default:
        return sharpInstance.png(outOpts).toBuffer()
    }
  }
}
