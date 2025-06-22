import { IconOptions, Coordinate } from "../../types/types"

/**
 * Class to handle icon operations.
 */
export default class Icon {
  coord?: Coordinate
  img?: string
  height: number | null
  width: number | null
  drawWidth: number
  drawHeight: number
  resizeMode: string
  offsetX: number
  offsetY: number
  offset: Coordinate
  imgData?: string

  /**
   * Constructor for the Icon class.
   * @param options - Icon options including coordinates, image source, dimensions, and resizing mode.
   */
  constructor(options: IconOptions = {}) {
    this.coord = options.coord
    this.img = options.img

    this.height = Number.isFinite(options.height)
      ? Number(options.height)
      : null
    this.width = Number.isFinite(options.width) ? Number(options.width) : null

    this.drawWidth = Number(options.drawWidth ?? options.width)
    this.drawHeight = Number(options.drawHeight ?? options.height)
    this.resizeMode = options.resizeMode || "cover"

    this.offsetX = Number.isFinite(options.offsetX)
      ? Number(options.offsetX)
      : this.drawWidth / 2
    this.offsetY = Number.isFinite(options.offsetY)
      ? Number(options.offsetY)
      : this.drawHeight
    this.offset = [this.offsetX, this.offsetY]
  }

  /**
   * Set the size of the icon.
   * @param width - The new width of the icon.
   * @param height - The new height of the icon.
   */
  setSize(width: number, height: number): void {
    this.width = Number(width)
    this.height = Number(height)

    if (Number.isNaN(this.drawWidth)) {
      this.drawWidth = this.width
    }

    if (Number.isNaN(this.drawHeight)) {
      this.drawHeight = this.height
    }
  }

  /**
   * Set icon data.
   * @param img - The image data for the icon.
   */
  set(img: string): void {
    this.imgData = img
  }

  /**
   * Get the extent of the icon in pixels.
   * @returns An array representing the extent [left, bottom, right, top].
   */
  extentPx(): [number, number, number, number] {
    return [
      this.offset[0],
      (this.height ?? 0) - this.offset[1],
      (this.width ?? 0) - this.offset[0],
      this.offset[1],
    ]
  }
}
