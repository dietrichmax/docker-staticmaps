import { TextOptions, Coordinate } from "src/types/types"

/**
 * Class to handle Text operations.
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
   * Constructor for the Text class.
   * @param options - Options for the text including coordinate, text content, color, width, fill, size, font, anchor, and offsets.
   */
  constructor(options: TextOptions = {}) {
    this.coord = options.coord
    this.text = options.text
    this.color = options.color ?? "#000000BB"
    this.width =
      typeof options.width === "number"
        ? `${options.width}px`
        : (options.width ?? "1px")
    this.fill = options.fill ?? "#000000"
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
}
