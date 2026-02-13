import { addCircles } from "../../src/featureAdapters/addCircles"
import StaticMaps from "../../src/staticmaps/staticmaps"
import { Circle } from "../../src/staticmaps/features"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger")

describe("addCircles", () => {
  let map: StaticMaps

  beforeEach(() => {
    // Create a minimal mock for StaticMaps with addCircle spy
    map = {
      addCircle: jest.fn(),
    } as unknown as StaticMaps

    jest.clearAllMocks()
  })

  it("adds circles for valid inputs", () => {
    const circles = [
      { coords: [[1, 2]], radius: 10, color: "red", width: 2, fill: true },
      { coords: [[3, 4]], radius: 5, color: "blue", width: 1, fill: false },
    ]

    addCircles(map, circles)

    expect(map.addCircle).toHaveBeenCalledTimes(2)

    expect(map.addCircle).toHaveBeenCalledWith(expect.any(Circle))

    // Check first call Circle properties
    const firstCallCircle = (map.addCircle as jest.Mock).mock
      .calls[0][0] as Circle
    expect(firstCallCircle.coord).toEqual([1, 2])
    expect(firstCallCircle.radius).toBe(10)
    expect(firstCallCircle.color).toBe("red")
    expect(firstCallCircle.width).toBe(2)
    expect(firstCallCircle.fill).toBe(true)
  })

  it("skips circles without coords and logs warning", () => {
    const circles = [
      { coords: [], radius: 10, color: "red" },
      { radius: 5, color: "blue" },
    ]

    addCircles(map, circles)

    expect(map.addCircle).not.toHaveBeenCalled()

    expect(logger.warn).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping circle [0] due to missing coords"),
      circles[0]
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping circle [1] due to missing coords"),
      circles[1]
    )
  })

  it("logs debug info when adding circles", () => {
    const circles = [{ coords: [[5, 6]], radius: 7, color: "green" }]

    addCircles(map, circles)

    expect(logger.debug).toHaveBeenCalledWith("Adding circle [0]", circles[0])
  })
})
