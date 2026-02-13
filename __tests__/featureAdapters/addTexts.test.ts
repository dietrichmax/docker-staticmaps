import { addTexts } from "../../src/featureAdapters/addTexts"
import StaticMaps from "../../src/staticmaps/staticmaps"
import { Text } from "../../src/staticmaps/features"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger")

describe("addTexts", () => {
  let map: StaticMaps

  beforeEach(() => {
    map = {
      addText: jest.fn(),
    } as unknown as StaticMaps

    jest.clearAllMocks()
  })

  it("adds text features for valid coords", () => {
    const texts = [
      {
        coords: [[10, 20]],
        text: "Hello",
        color: "red",
        width: 2,
        fill: true,
        size: 12,
        font: "Arial",
        anchor: "center",
        offsetX: "5",
        offsetY: "10",
      },
      {
        coords: [[30, 40]],
        text: "World",
        color: "blue",
        width: 1,
        fill: false,
        size: 14,
        font: "Times New Roman",
        anchor: "left",
        offsetX: 3,
        offsetY: 6,
      },
    ]

    addTexts(map, texts)

    expect(map.addText).toHaveBeenCalledTimes(2)

    texts.forEach((txt, i) => {
      const calledArg = (map.addText as jest.Mock).mock.calls[i][0] as Text
      expect(calledArg.coord).toEqual(txt.coords[0])
      expect(calledArg.text).toBe(txt.text)
      expect(calledArg.color).toBe(txt.color)
      expect(calledArg.width).toBe(`${txt.width}px`)
      expect(calledArg.fill).toBe(txt.fill)
      expect(calledArg.size).toBe(txt.size)
      expect(calledArg.font).toBe(txt.font)
      expect(calledArg.anchor).toBe(txt.anchor)
      expect(calledArg.offsetX).toBe(parseInt(txt.offsetX as any, 10) || 0)
      expect(calledArg.offsetY).toBe(parseInt(txt.offsetY as any, 10) || 0)
    })
  })

  it("skips text features without coords and logs a warning", () => {
    const texts = [
      { text: "No coords here" },
      { coords: [], text: "Empty coords" },
    ]

    addTexts(map, texts)

    expect(map.addText).not.toHaveBeenCalled()

    expect(logger.warn).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping text [0] due to missing coords"),
      texts[0]
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping text [1] due to missing coords"),
      texts[1]
    )
  })

  it("logs debug info when adding text features", () => {
    const texts = [{ coords: [[1, 2]], text: "Debug test", color: "black" }]

    addTexts(map, texts)

    expect(logger.debug).toHaveBeenCalledWith("Adding text [0]", texts[0])
  })
})
