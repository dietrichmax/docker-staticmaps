import { addMarkers } from "../../src/featureAdapters"
import StaticMaps from "../../src/staticmaps/staticmaps"
import { IconMarker } from "../../src/staticmaps/features"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger")

describe("addMarkers", () => {
  let map: StaticMaps

  beforeEach(() => {
    map = {
      addMarker: jest.fn(),
    } as unknown as StaticMaps

    jest.clearAllMocks()
  })

  it("adds markers for each coord in each marker config", () => {
    const markers = [
      {
        coords: [
          [1, 2],
          [3, 4],
        ],
        img: "icon1.png",
        width: 10,
        height: 20,
        offsetX: 5,
        offsetY: 6,
        color: "red",
        resizeMode: "contain",
        drawWidth: 100,
        drawHeight: 200,
      },
      {
        coords: [[5, 6]],
        img: "icon2.png",
        width: 15,
        height: 25,
        offsetX: 7,
        offsetY: 8,
        color: "blue",
        resizeMode: "stretch",
        drawWidth: 150,
        drawHeight: 250,
      },
    ]

    addMarkers(map, markers)

    // 3 total coords, so 3 calls expected
    expect(map.addMarker).toHaveBeenCalledTimes(3)

    // Check the first marker coords
    expect(map.addMarker).toHaveBeenCalledWith(
      expect.objectContaining({
        coord: [1, 2],
        img: "icon1.png",
        width: 10,
        height: 20,
        offsetX: 5,
        offsetY: 6,
        color: "red",
        resizeMode: "contain",
        drawWidth: 100,
        drawHeight: 200,
      })
    )

    // Check the second coord of first marker
    expect(map.addMarker).toHaveBeenCalledWith(
      expect.objectContaining({
        coord: [3, 4],
      })
    )

    // Check the coord of second marker
    expect(map.addMarker).toHaveBeenCalledWith(
      expect.objectContaining({
        coord: [5, 6],
        img: "icon2.png",
        width: 15,
        height: 25,
        offsetX: 7,
        offsetY: 8,
        color: "blue",
        resizeMode: "stretch",
        drawWidth: 150,
        drawHeight: 250,
      })
    )
  })

  it("logs debug info for each marker coord", () => {
    const markers = [
      {
        coords: [
          [1, 2],
          [3, 4],
        ],
        img: "icon.png",
      },
    ]

    addMarkers(map, markers)

    expect(logger.debug).toHaveBeenCalledTimes(2)
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      "Adding marker [0][0]",
      markers[0]
    )
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      "Adding marker [0][1]",
      markers[0]
    )
  })

  it("handles empty coords arrays gracefully", () => {
    const markers = [{ coords: [] }, {}]

    addMarkers(map, markers)

    // No markers should be added
    expect(map.addMarker).not.toHaveBeenCalled()
    // No debug logs either since no coords to iterate
    expect(logger.debug).not.toHaveBeenCalled()
  })
})
