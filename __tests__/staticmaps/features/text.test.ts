import { Text } from "../../../src/staticmaps/features"
import { TextOptions } from "../../../src/types/types"

describe("Text class", () => {
  it("should initialize with default values", () => {
    const text = new Text()

    expect(text.coord).toBeUndefined()
    expect(text.text).toBeUndefined()
    expect(text.color).toBe("#000000BB")
    expect(text.width).toBe("1px")
    expect(text.fill).toBe("#000000BB")
    expect(text.size).toBe(12)
    expect(text.font).toBe("Arial")
    expect(text.anchor).toBe("start")
    expect(text.offsetX).toBe(0)
    expect(text.offsetY).toBe(0)
    expect(text.offset).toEqual([0, 0])
  })

  it("should apply provided values correctly", () => {
    const options: TextOptions = {
      coord: [12.34, 56.78],
      text: "Test Label",
      color: "#ff0000",
      width: 2,
      fill: "#00ff00",
      size: 16,
      font: "Verdana",
      anchor: "middle",
      offsetX: 10,
      offsetY: -5,
    }

    const text = new Text(options)

    expect(text.coord).toEqual([12.34, 56.78])
    expect(text.text).toBe("Test Label")
    expect(text.color).toBe("#ff0000")
    expect(text.width).toBe("2px")
    expect(text.fill).toBe("#00ff00")
    expect(text.size).toBe(16)
    expect(text.font).toBe("Verdana")
    expect(text.anchor).toBe("middle")
    expect(text.offsetX).toBe(10)
    expect(text.offsetY).toBe(-5)
    expect(text.offset).toEqual([10, -5])
  })

  it("should handle string width correctly", () => {
    const text = new Text({ width: "5px" })
    expect(text.width).toBe("5px")
  })

  it("should fallback to default offset if invalid", () => {
    const text = new Text({ offsetX: NaN, offsetY: undefined })
    expect(text.offset).toEqual([0, 0])
  })

  it("should handle missing text and coord", () => {
    const text = new Text({})
    expect(text.text).toBeUndefined()
    expect(text.coord).toBeUndefined()
  })
})
