import { forEachValidFeature } from "../../src/featureAdapters/adapterUtils"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger")

describe("forEachValidFeature", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calls callback for items with enough coords", () => {
    const callback = jest.fn()
    const items = [
      { coords: [[1, 2]] },
      { coords: [[3, 4]] },
    ]
    forEachValidFeature("test", items, 1, callback)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenCalledWith(items[0], 0)
    expect(callback).toHaveBeenCalledWith(items[1], 1)
  })

  it("skips items with fewer coords than minCoords", () => {
    const callback = jest.fn()
    const items = [
      { coords: [[1, 2]] },
      { coords: [] },
    ]
    forEachValidFeature("circle", items, 1, callback)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping circle [1]"),
      items[1]
    )
  })

  it("skips items without coords property", () => {
    const callback = jest.fn()
    forEachValidFeature("text", [{ text: "hello" }], 1, callback)
    expect(callback).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it("handles empty items array", () => {
    const callback = jest.fn()
    forEachValidFeature("test", [], 1, callback)
    expect(callback).not.toHaveBeenCalled()
  })

  it("logs debug for each valid item", () => {
    const items = [{ coords: [[1, 2], [3, 4]] }]
    forEachValidFeature("polyline", items, 2, jest.fn())
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Adding polyline [0]"),
      items[0]
    )
  })

  it("respects minCoords threshold of 2", () => {
    const callback = jest.fn()
    const items = [
      { coords: [[1, 2]] },
      { coords: [[1, 2], [3, 4]] },
    ]
    forEachValidFeature("polyline", items, 2, callback)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(items[1], 1)
  })
})
