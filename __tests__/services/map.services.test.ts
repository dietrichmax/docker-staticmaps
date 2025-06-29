import {
  generateMap,
  addCircles,
  addPolylines,
  addTexts,
  addMarkers,
  asArray,
} from "../../src/services/map.services" // adjust the import path as needed
import StaticMaps from "../../src/staticmaps/staticmaps"
import { createAttributionSVG } from "../../src/utils/attribution"
import sharp from "sharp"
import logger from "../../src/utils/logger"
import { IconMarker } from "../../src/staticmaps/features"

// Mock dependencies
jest.mock("../../src/staticmaps/staticmaps")
jest.mock("../../src/utils/logger", () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))
jest.mock("../../src/utils/attribution", () => ({
  createAttributionSVG: jest.fn(() => Buffer.from("<svg></svg>")),
}))
jest.mock("sharp")

describe("generateMap", () => {
  let renderMock: jest.Mock
  let bufferMock: jest.Mock

  beforeEach(() => {
    renderMock = jest.fn()
    bufferMock = jest.fn(() => Promise.resolve(Buffer.from("image-buffer")))
    ;(StaticMaps as jest.Mock).mockImplementation(() => ({
      render: renderMock,
      image: {
        buffer: bufferMock,
      },
      addMarker: jest.fn(),
      addLine: jest.fn(),
      addPolygon: jest.fn(),
      addCircle: jest.fn(),
      addText: jest.fn(),
    }))
    ;(sharp as unknown as jest.Mock).mockReturnValue({
      composite: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("composited-image")),
    })
  })

  it("renders a map with all feature types", async () => {
    const options = {
      width: 800,
      height: 600,
      format: "png",
      zoom: 10,
      center: [0, 0],
      markers: [{ coords: [[1, 2]], img: "pin.png", width: 20, height: 20 }],
      polyline: [
        {
          coords: [
            [0, 0],
            [1, 1],
          ],
          color: "#ff0000",
          weight: 2,
        },
      ],
      polygon: [
        {
          coords: [
            [0, 0],
            [1, 1],
            [1, 0],
          ],
          color: "#00ff00",
          fill: "#00ff00",
        },
      ],
      circle: [{ coords: [[1, 1]], radius: 100, color: "#0000ff", width: 1 }],
      text: [{ coords: [[2, 2]], text: "Hello", size: 12 }],
    }

    const buffer = await generateMap(options)

    expect(renderMock).toHaveBeenCalledWith(options.center, options.zoom)
    expect(buffer.equals(Buffer.from("image-buffer"))).toBe(true)
  })

  it("adds attribution overlay if enabled", async () => {
    const options = {
      width: 800,
      height: 600,
      format: "png",
      zoom: 10,
      center: [0, 0],
      attribution: {
        show: true,
        text: "© OpenStreetMap contributors",
      },
    }

    const buffer = await generateMap(options)

    expect(createAttributionSVG).toHaveBeenCalledWith(
      options.attribution.text,
      options.width,
      options.height
    )
    expect(buffer.equals(Buffer.from("composited-image"))).toBe(true)
  })

  /*it("does not add attribution overlay if disabled", async () => {
    const options = {
      width: 800,
      height: 600,
      format: "png",
      zoom: 10,
      center: [0, 0],
      attribution: "show:false"
    }

    const buffer = await generateMap(options)

    expect(createAttributionSVG).not.toHaveBeenCalled()
    expect(buffer.equals(Buffer.from("image-buffer"))).toBe(true)
  })*/

  it("throws if map.image is undefined", async () => {
    ;(StaticMaps as jest.Mock).mockImplementation(() => ({
      render: renderMock,
      image: undefined,
    }))

    await expect(
      generateMap({ center: [0, 0], zoom: 10, format: "png" })
    ).rejects.toThrow("Map image is undefined after rendering")
  })

  it("returns expected buffer snapshot", async () => {
    const buffer = await generateMap({
      center: [0, 0],
      zoom: 10,
      format: "png",
    })
    expect(buffer.toString()).toMatchSnapshot()
  })
})

describe("asArray", () => {
  it("returns an empty array when input is falsy", () => {
    expect(asArray(null)).toEqual([])
    expect(asArray(undefined)).toEqual([])
  })

  it("wraps non-array input into an array", () => {
    expect(asArray("marker")).toEqual(["marker"])
    expect(asArray(1)).toEqual([1])
  })

  it("returns the same array if input is already an array", () => {
    const input = [1, 2, 3]
    expect(asArray(input)).toBe(input)
  })
})

describe("addPolylines", () => {
  it("skips polyline with less than 2 coords and logs a warning", () => {
    const mockMap = { addLine: jest.fn(), addPolygon: jest.fn() }
    const item = { coords: [[1, 2]], color: "red", weight: 1 }

    addPolylines(mockMap as any, [item], false)

    expect(mockMap.addLine).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipping polyline [0] due to insufficient coords",
      item
    )
  })

  it("skips polygon with less than 2 coords and logs a warning", () => {
    const mockMap = { addPolygon: jest.fn() }
    const item = { coords: [[1, 2]], color: "blue", fill: "#0000ff" }

    addPolylines(mockMap as any, [item], true)

    expect(mockMap.addPolygon).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipping polygon [0] due to insufficient coords",
      item
    )
  })

  it("adds multiple polylines and polygons", () => {
    const mockMap = { addLine: jest.fn(), addPolygon: jest.fn() }
    const polylineItems = [
      {
        coords: [
          [0, 0],
          [1, 1],
        ],
        color: "red",
        weight: 1,
      },
      {
        coords: [
          [1, 1],
          [2, 2],
        ],
        color: "blue",
        weight: 2,
      },
    ]

    const polygonItems = [
      {
        coords: [
          [0, 0],
          [1, 1],
          [1, 0],
        ],
        color: "#00ff00",
        fill: "#00ff00",
      },
    ]

    addPolylines(mockMap as any, polylineItems, false)
    addPolylines(mockMap as any, polygonItems, true)

    expect(mockMap.addLine).toHaveBeenCalledTimes(2)
    expect(mockMap.addPolygon).toHaveBeenCalledTimes(1)
  })
})

describe("addCircles", () => {
  it("skips circle with no coords and logs a warning", () => {
    const mockMap = { addCircle: jest.fn() }
    const circ = { coords: [], radius: 100 }

    addCircles(mockMap as any, [circ])

    expect(mockMap.addCircle).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipping circle [0] due to missing coords",
      circ
    )
  })
})

describe("addTexts", () => {
  it("skips text with no coords and logs a warning", () => {
    const mockMap = { addText: jest.fn() }
    const txt = { coords: [], text: "Test Label" }

    addTexts(mockMap as any, [txt])

    expect(mockMap.addText).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Skipping text [0] due to missing coords",
      txt
    )
  })
})

describe("addMarkers", () => {
  const mockAddMarker = jest.fn()
  const mockMap = {
    addMarker: mockAddMarker,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("adds multiple markers with multiple coords each", () => {
    const markerData = [
      {
        coords: [
          [10, 20],
          [30, 40],
        ],
        img: "marker.png",
        width: 32,
        height: 32,
        offsetX: 0,
        offsetY: 0,
        color: "#f00",
      },
    ]

    addMarkers(mockMap as any, markerData)

    // Should call addMarker twice (2 coords)
    expect(mockAddMarker).toHaveBeenCalledTimes(2)

    // Check type and values
    const firstCallArg = mockAddMarker.mock.calls[0][0]
    expect(firstCallArg).toBeInstanceOf(IconMarker)
    expect(firstCallArg.coord).toEqual([10, 20])

    const secondCallArg = mockAddMarker.mock.calls[1][0]
    expect(secondCallArg.coord).toEqual([30, 40])

    // Debug logs called for both
    expect(logger.debug).toHaveBeenCalledTimes(2)
    expect(logger.debug).toHaveBeenCalledWith(
      "Adding marker [0][0]",
      markerData[0]
    )
    expect(logger.debug).toHaveBeenCalledWith(
      "Adding marker [0][1]",
      markerData[0]
    )
  })

  it("skips marker with empty coords array", () => {
    const markerData = [{ coords: [] }]
    addMarkers(mockMap as any, markerData)

    expect(mockAddMarker).not.toHaveBeenCalled()
    expect(logger.debug).not.toHaveBeenCalled()
  })

  it("does nothing if no markers provided", () => {
    addMarkers(mockMap as any, [])

    expect(mockAddMarker).not.toHaveBeenCalled()
    expect(logger.debug).not.toHaveBeenCalled()
  })
})
