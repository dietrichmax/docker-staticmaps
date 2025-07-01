import { TextOptions, Coordinate } from "../../types/types"
import { lonToX, latToY, xToLon, yToLat } from "../utils"

/**
 * Represents a text label to be rendered at a specific geographic coordinate.
 * Includes support for styling such as font size, color, anchor alignment, and pixel offsets.
 */
export default class Text {
  coord?: Coordinate
  text?: string
  public readonly color: string
  public readonly width: string
  public readonly fill: string
  public readonly size: number
  public readonly font: string
  public readonly anchor: "start" | "middle" | "end"
  offsetX: number
  offsetY: number
  public readonly offset: Coordinate

  /**
   * Creates a new Text instance.
   *
   * @param {TextOptions} [options={}] - Configuration options for the text label.
   * @param {Coordinate} [options.coord] - Geographic coordinate ([lon, lat]) for the label.
   * @param {string} [options.text] - Text content to render.
   * @param {string} [options.color="#000000BB"] - Stroke (outline) color for the text.
   * @param {string|number} [options.width="1px"] - Stroke width as a string or number. If a number, it will be converted to a string in "px".
   * @param {string} [options.fill] - Fill color for the text (defaults to `color` if not set).
   * @param {number} [options.size=12] - Font size in pixels.
   * @param {string} [options.font="Arial"] - Font family name.
   * @param {"start"|"middle"|"end"} [options.anchor="start"] - Text alignment relative to the coordinate.
   * @param {number} [options.offsetX=0] - Horizontal offset in pixels from the anchor point.
   * @param {number} [options.offsetY=0] - Vertical offset in pixels from the anchor point.
   */
  constructor(options: TextOptions = {}) {
    this.coord = options.coord
    this.text = options.text
    this.color = options.color ?? "#000000BB"
    this.width =
      typeof options.width === "number"
        ? `${options.width}px`
        : (options.width ?? "1px")
    this.fill = options.fill ?? this.color
    this.size = options.size ?? 12
    this.font = options.font ?? "Arial"
    this.anchor = options.anchor ?? "start"
    this.offsetX = Number.isFinite(options.offsetX)
      ? Number(options.offsetX)
      : 0
    this.offsetY = Number.isFinite(options.offsetY)
      ? Number(options.offsetY)
      : 0
    this.offset = [this.offsetX, this.offsetY]
  }

  /**
   * Calculates the bounding box of the text.
   *
   * @returns {[number, number, number, number]} Bounding box as [minLon, minLat, maxLon, maxLat].
   */
  extent(zoom?: number, tileSize = 256): [number, number, number, number] {
    if (!this.coord)
      throw new Error("No coordinate defined for this text feature.")
    if (!zoom)
      return [this.coord[0], this.coord[1], this.coord[0], this.coord[1]]

    const [lon, lat] = this.coord
    const x = lonToX(lon, zoom)
    const y = latToY(lat, zoom)

    const offsetX = this.offsetX ?? 0
    const offsetY = this.offsetY ?? 0

    const fontSize = this.size ?? 20
    const textLength = this.text?.length ?? 10

    // Rough width/height estimate in pixels
    const estWidthPx = textLength * (fontSize * 0.6)
    const estHeightPx = fontSize

    const minX = x + offsetX / tileSize
    const minY = y - offsetY / tileSize

    const maxX = minX + estWidthPx / tileSize
    const maxY = minY - estHeightPx / tileSize

    return [
      Math.min(xToLon(minX, zoom), xToLon(maxX, zoom)),
      Math.min(yToLat(minY, zoom), yToLat(maxY, zoom)),
      Math.max(xToLon(minX, zoom), xToLon(maxX, zoom)),
      Math.max(yToLat(minY, zoom), yToLat(maxY, zoom)),
    ]
  }
}
