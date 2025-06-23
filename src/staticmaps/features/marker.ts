import { IconOptions, Coordinate } from "../../types/types"

/**
 * Class to handle icon operations.
 */
export default class Icon {
  coord?: Coordinate
  img?: string
  height: number | null
  width: number | null
  color: string
  drawWidth: number
  drawHeight: number
  resizeMode: string
  offsetX: number
  offsetY: number
  offset: Coordinate
  imgData?: string

  constructor(options: IconOptions = {}) {
    this.coord = options.coord
    this.img = options.img

    // Use Number.isFinite after coercion, else null
    this.height = Number.isFinite(Number(options.height))
      ? Number(options.height)
      : null
    this.width = Number.isFinite(Number(options.width))
      ? Number(options.width)
      : null

    this.color = options.color || "#d9534f"

    // Use drawWidth or fallback to width or 0
    this.drawWidth = Number.isFinite(Number(options.drawWidth))
      ? Number(options.drawWidth)
      : (this.width ?? 0)

    this.drawHeight = Number.isFinite(Number(options.drawHeight))
      ? Number(options.drawHeight)
      : (this.height ?? 0)

    this.resizeMode = options.resizeMode || "cover"

    // Use offsetX or default to half of drawWidth
    this.offsetX = Number.isFinite(Number(options.offsetX))
      ? Number(options.offsetX)
      : this.drawWidth / 2

    // Use offsetY or default to full drawHeight
    this.offsetY = Number.isFinite(Number(options.offsetY))
      ? Number(options.offsetY)
      : this.drawHeight

    this.offset = [this.offsetX, this.offsetY]
  }

  setSize(width: number, height: number): void {
    this.width = Number(width)
    this.height = Number(height)

    // Only update drawWidth if current drawWidth is NaN or 0
    if (!Number.isFinite(this.drawWidth) || this.drawWidth === 0) {
      this.drawWidth = this.width ?? 0
    }

    if (!Number.isFinite(this.drawHeight) || this.drawHeight === 0) {
      this.drawHeight = this.height ?? 0
    }
  }

  set(img: string): void {
    this.imgData = img
  }

  extentPx(): [number, number, number, number] {
    return [
      this.offset[0],
      (this.height ?? 0) - this.offset[1],
      (this.width ?? 0) - this.offset[0],
      this.offset[1],
    ]
  }
}
