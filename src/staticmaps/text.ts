/**
 * Interface for Text options.
 */
interface TextOptions {
  /**
   * Optional coordinate where the text should be placed.
   */
  coord?: [number, number]

  /**
   * Optional text string to display.
   */
  text?: string

  /**
   * Optional color string in hexadecimal format (e.g., "#000000BB").
   * @default "#000000BB"
   */
  color?: string

  /**
   * Optional width of the text border.
   * @default "1px"
   */
  width?: number | string

  /**
   * Optional fill color for the text background.
   * @default "#000000"
   */
  fill?: string

  /**
   * Optional size of the text in pixels.
   * @default 12
   */
  size?: number

  /**
   * Optional font family for the text.
   * @default "Arial"
   */
  font?: string

  /**
   * Optional anchor position for the text ("start", "middle", or "end").
   * @default "start"
   */
  anchor?: "start" | "middle" | "end"

  /**
   * Optional horizontal offset from the coordinate.
   * @default 0
   */
  offsetX?: number

  /**
   * Optional vertical offset from the coordinate.
   * @default 0
   */
  offsetY?: number
}

/**
 * Class to handle Text operations.
 */
export default class Text {
  private coord?: [number, number]
  private text?: string
  public readonly color: string
  public readonly width: string
  public readonly fill: string
  public readonly size: number
  public readonly font: string
  public readonly anchor: "start" | "middle" | "end"
  private offsetX: number
  private offsetY: number
  public readonly offset: [number, number]

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
