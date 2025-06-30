import { IconOptions, Coordinate } from "../../types/types"

/**
 * Represents an icon to be rendered at a specific coordinate with optional image and sizing settings.
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

  /**
   * Creates a new Icon instance.
   *
   * @param {IconOptions} [options={}] - Configuration options for the icon.
   * @param {Coordinate} [options.coord] - Geographic coordinate ([lon, lat]) where the icon will be placed.
   * @param {string} [options.img] - URL or path to the image used for the icon.
   * @param {number} [options.height] - Natural image height in pixels.
   * @param {number} [options.width] - Natural image width in pixels.
   * @param {string} [options.color="#d9534f"] - Fallback color used for the icon.
   * @param {number} [options.drawWidth] - Rendered width in pixels.
   * @param {number} [options.drawHeight] - Rendered height in pixels.
   * @param {string} [options.resizeMode="cover"] - Resize mode for image rendering, e.g., "cover" or "contain".
   * @param {number} [options.offsetX] - Horizontal offset from the icon anchor.
   * @param {number} [options.offsetY] - Vertical offset from the icon anchor.
   */
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

  /**
   * Updates the intrinsic size of the icon and adjusts draw dimensions if necessary.
   *
   * @param {number} width - New intrinsic width of the icon.
   * @param {number} height - New intrinsic height of the icon.
   */
  setSize(width: number, height: number): void {
    this.width = Number(width)
    this.height = Number(height)

    if (!Number.isFinite(this.drawWidth) || this.drawWidth === 0) {
      this.drawWidth = Number.isFinite(this.width) ? this.width : 0
    }

    if (!Number.isFinite(this.drawHeight) || this.drawHeight === 0) {
      this.drawHeight = Number.isFinite(this.height) ? this.height : 0
    }
  }

  /**
   * Sets the image data to be used for rendering (e.g., base64 encoded image).
   *
   * @param {string} img - Image data as a base64 string or binary string.
   */
  set(img: string): void {
    this.imgData = img
  }

  /**
   * Calculates the bounding box of the polyline or polygon.
   *
   * @returns {[number, number, number, number]} Bounding box as [minLon, minLat, maxLon, maxLat].
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
