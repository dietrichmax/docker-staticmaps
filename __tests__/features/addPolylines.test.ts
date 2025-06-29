import { addPolylines } from "../../src/features/addPolylines"
import StaticMaps from "../../src/staticmaps/staticmaps"
import { Polyline } from "../../src/staticmaps/features"
import logger from "../../src/utils/logger"
import { Coordinate } from "../../src/types/types"
import * as utils from "../../src/staticmaps/utils"

jest.mock("../../src/utils/logger")
jest.mock("../../src/staticmaps/features", () => {
  return {
    Polyline: jest
      .fn()
      .mockImplementation(({ coords, color, width, fill }) => ({
        coords,
        color,
        width,
        fill,
      })),
  }
})

describe("addPolylines", () => {
  let map: StaticMaps

  beforeEach(() => {
    map = {
      addLine: jest.fn(),
      addPolygon: jest.fn(),
    } as unknown as StaticMaps

    jest.clearAllMocks()
  })

  it("adds geodesic polyline with exactly two coords", () => {
    const items = [
      {
        coords: [
          [1, 2],
          [3, 4],
        ] as Coordinate[],
        color: "red",
        weight: 2,
        fill: false,
      },
    ]

    addPolylines(map, items, false)

    expect(map.addLine).toHaveBeenCalledTimes(1)
    const calledArg = (map.addLine as jest.Mock).mock.calls[0][0]

    // Check that a Polyline instance (or at least an object with expected props) was created
    expect(calledArg).toBeDefined()
    expect(calledArg.coords).toEqual(items[0].coords)
    expect(calledArg.color).toBe(items[0].color)
    expect(calledArg.width).toBe(items[0].weight)
    expect(calledArg.fill).toBe(items[0].fill)
  })

  it("adds polyline for three or more coords", () => {
    const items = [
      {
        coords: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        color: "blue",
        weight: 3,
        fill: false,
      },
    ]

    addPolylines(map, items, false)

    expect(map.addLine).toHaveBeenCalledTimes(1)
    const calledArg = (map.addLine as jest.Mock).mock.calls[0][0] as Polyline

    // Should match exactly, no interpolation
    expect(calledArg.coords).toEqual(items[0].coords)

    expect(calledArg.color).toBe(items[0].color)
    expect(calledArg.width).toBe(items[0].weight)
    expect(calledArg.fill).toBe(items[0].fill)
  })

  it("adds polygons for valid coords", () => {
    const items = [
      {
        coords: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
        color: "green",
        weight: 1,
        fill: true,
      },
    ]

    addPolylines(map, items, true)

    expect(map.addPolygon).toHaveBeenCalledTimes(1)
    expect(map.addLine).not.toHaveBeenCalled()

    const calledArg = (map.addPolygon as jest.Mock).mock.calls[0][0] as Polyline
    expect(calledArg.coords).toEqual(items[0].coords)
    expect(calledArg.color).toBe(items[0].color)
    expect(calledArg.width).toBe(items[0].weight)
    expect(calledArg.fill).toBe(items[0].fill)
  })

  it("skips items with fewer than 2 coords and logs a warning", () => {
    const items = [
      { coords: [[1, 2]], color: "red" },
      { coords: [], color: "blue" },
    ]

    addPolylines(map, items)

    expect(map.addLine).not.toHaveBeenCalled()
    expect(map.addPolygon).not.toHaveBeenCalled()

    expect(logger.warn).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Skipping polyline [0] due to insufficient coords"
      ),
      items[0]
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Skipping polyline [1] due to insufficient coords"
      ),
      items[1]
    )
  })

  it("logs debug info when adding polylines and polygons", () => {
    const polyline = {
      coords: [
        [1, 2],
        [3, 4],
      ],
      color: "red",
      weight: 2,
    }
    const polygon = {
      coords: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      color: "green",
      weight: 1,
    }

    addPolylines(map, [polyline], false)
    addPolylines(map, [polygon], true)

    expect(logger.debug).toHaveBeenCalledWith("Adding polyline [0]", polyline)
    expect(logger.debug).toHaveBeenCalledWith("Adding polygon [0]", polygon)
  })

  it("warns and skips polyline with insufficient coords", () => {
    const polylines = [
      { coords: [[1, 2]] }, // only 1 coordinate, insufficient
    ]

    const mapInstance = {
      addLine: jest.fn(),
      addPolygon: jest.fn(),
    }

    addPolylines(mapInstance as any, polylines, false)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Skipping polyline"),
      expect.objectContaining({ coords: [[1, 2]] })
    )
    expect(mapInstance.addLine).not.toHaveBeenCalled()
  })
})
