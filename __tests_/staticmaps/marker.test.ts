import { IconMarker } from "../../src/staticmaps/features"

describe("Icon class", () => {
  test("constructor sets default values correctly", () => {
    const icon = new IconMarker()

    expect(icon.coord).toBeUndefined()
    expect(icon.img).toBeUndefined()
    expect(icon.height).toBeNull()
    expect(icon.width).toBeNull()
    expect(icon.drawWidth).toBeNaN()
    expect(icon.drawHeight).toBeNaN()
    expect(icon.resizeMode).toBe("cover")
    expect(icon.offsetX).toBeNaN()
    expect(icon.offsetY).toBeNaN()
    expect(icon.offset).toEqual([icon.offsetX, icon.offsetY])
  })

  test("constructor uses provided valid options", () => {
    const icon = new IconMarker({
      coord: [1, 2],
      img: "image.png",
      width: 30,
      height: 40,
      drawWidth: 35,
      drawHeight: 45,
      resizeMode: "contain",
      offsetX: 5,
      offsetY: 10,
    })

    expect(icon.coord).toEqual([1, 2])
    expect(icon.img).toBe("image.png")
    expect(icon.width).toBe(30)
    expect(icon.height).toBe(40)
    expect(icon.drawWidth).toBe(35)
    expect(icon.drawHeight).toBe(45)
    expect(icon.resizeMode).toBe("contain")
    expect(icon.offsetX).toBe(5)
    expect(icon.offsetY).toBe(10)
    expect(icon.offset).toEqual([5, 10])
  })

  test("constructor calculates drawWidth, drawHeight, and offsets if undefined", () => {
    const icon = new IconMarker({
      width: 20,
      height: 40,
    })

    expect(icon.drawWidth).toBe(20)
    expect(icon.drawHeight).toBe(40)
    expect(icon.offsetX).toBe(10) // drawWidth / 2
    expect(icon.offsetY).toBe(40) // drawHeight
    expect(icon.offset).toEqual([10, 40])
  })

  test("setSize updates width and height and drawWidth/drawHeight if NaN", () => {
    const icon = new IconMarker({
      width: 10,
      height: 15,
      drawWidth: NaN,
      drawHeight: NaN,
    })

    icon.setSize(50, 60)
    expect(icon.width).toBe(50)
    expect(icon.height).toBe(60)
    expect(icon.drawWidth).toBe(50)
    expect(icon.drawHeight).toBe(60)
  })

  test("setSize updates width and height but does not overwrite drawWidth/drawHeight if not NaN", () => {
    const icon = new IconMarker({
      width: 10,
      height: 15,
      drawWidth: 12,
      drawHeight: 18,
    })

    icon.setSize(50, 60)
    expect(icon.width).toBe(50)
    expect(icon.height).toBe(60)
    expect(icon.drawWidth).toBe(12)
    expect(icon.drawHeight).toBe(18)
  })

  test("set sets imgData", () => {
    const icon = new IconMarker()
    icon.set("someImageData")
    expect(icon.imgData).toBe("someImageData")
  })

  test("extentPx returns correct pixel extent array", () => {
    const icon = new IconMarker({
      width: 50,
      height: 100,
      drawWidth: 50,
      drawHeight: 100,
      offsetX: 10,
      offsetY: 20,
    })

    const extent = icon.extentPx()
    expect(extent).toEqual([
      10, // offset[0] = offsetX
      100 - 20, // height - offsetY = 80
      50 - 10, // width - offsetX = 40
      20, // offset[1] = offsetY
    ])
  })

  test("extentPx handles null width and height gracefully", () => {
    const icon = new IconMarker({
      offsetX: 5,
      offsetY: 7,
    })

    icon.width = null
    icon.height = null

    const extent = icon.extentPx()
    expect(extent).toEqual([
      5,
      0 - 7, // (height ?? 0) - offsetY
      0 - 5, // (width ?? 0) - offsetX
      7,
    ])
  })
})
