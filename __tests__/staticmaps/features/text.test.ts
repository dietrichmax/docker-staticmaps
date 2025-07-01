import { Text } from "../../../src/staticmaps/features"
import { TextOptions } from "../../../src/types/types"

describe("Text class", () => {
  const baseCoord: [number, number] = [-3.7038, 40.4168] // Madrid

  test("initializes with default values", () => {
    const text = new Text()

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

  test("initializes with custom values", () => {
    const text = new Text({
      coord: baseCoord,
      text: "Hello",
      color: "#FF0000",
      width: 2,
      fill: "#00FF00",
      size: 24,
      font: "Verdana",
      anchor: "middle",
      offsetX: 10,
      offsetY: -5,
    })

    expect(text.coord).toEqual(baseCoord)
    expect(text.text).toBe("Hello")
    expect(text.color).toBe("#FF0000")
    expect(text.width).toBe("2px")
    expect(text.fill).toBe("#00FF00")
    expect(text.size).toBe(24)
    expect(text.font).toBe("Verdana")
    expect(text.anchor).toBe("middle")
    expect(text.offsetX).toBe(10)
    expect(text.offsetY).toBe(-5)
    expect(text.offset).toEqual([10, -5])
  })

  test("uses color as fill if fill not set", () => {
    const text = new Text({ color: "#123456" })
    expect(text.fill).toBe("#123456")
  })

  test("width string is preserved", () => {
    const text = new Text({ width: "4px" })
    expect(text.width).toBe("4px")
  })

  test("extent throws if coord is undefined", () => {
    const text = new Text()
    expect(() => text.extent(5)).toThrow(
      "No coordinate defined for this text feature."
    )
  })

  test("extent returns single point if zoom is undefined", () => {
    const text = new Text({ coord: baseCoord })
    expect(text.extent(undefined)).toEqual([
      baseCoord[0],
      baseCoord[1],
      baseCoord[0],
      baseCoord[1],
    ])
  })

  test("extent returns a valid bounding box with zoom", () => {
    const text = new Text({
      coord: baseCoord,
      text: "TestText",
      size: 20,
      offsetX: 50,
      offsetY: 20,
    })

    const [minLon, minLat, maxLon, maxLat] = text.extent(5)

    expect(minLon).toBeLessThan(maxLon)
    expect(minLat).toBeLessThan(maxLat)
    expect(isFinite(minLon)).toBe(true)
    expect(isFinite(minLat)).toBe(true)
    expect(isFinite(maxLon)).toBe(true)
    expect(isFinite(maxLat)).toBe(true)
  })

  test("extent reflects offsetX and offsetY changes", () => {
    const base = new Text({ coord: baseCoord, text: "Text", size: 20 })
    const offset = new Text({
      coord: baseCoord,
      text: "Text",
      size: 20,
      offsetX: 100,
      offsetY: -50,
    })

    const baseExtent = base.extent(4)
    const offsetExtent = offset.extent(4)

    expect(offsetExtent[0]).not.toBeCloseTo(baseExtent[0])
    expect(offsetExtent[1]).not.toBeCloseTo(baseExtent[1])
  })
})
