import { generateMap } from "../../src/generate/generateMap"

jest.mock("../../src/staticmaps/staticmaps")
jest.mock("../../src/features/addMarkers")
jest.mock("../../src/features/addPolylines")
jest.mock("../../src/features/addCircles")
jest.mock("../../src/features/addTexts")
jest.mock("../../src/features/asArray")
jest.mock("../../src/utils/attribution", () => ({
  createAttributionSVG: jest.fn(),
}))
jest.mock("../../src/utils/logger")

import StaticMaps from "../../src/staticmaps/staticmaps"
import logger from "../../src/utils/logger"
import * as addMarkersModule from "../../src/features/addMarkers"
import * as addPolylinesModule from "../../src/features/addPolylines"
import * as addCirclesModule from "../../src/features/addCircles"
import * as addTextsModule from "../../src/features/addTexts"
import * as asArrayModule from "../../src/features/asArray"
import * as attributionModule from "../../src/utils/attribution"

describe("generateMap", () => {
  let mockMapInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock asArray to return input directly for simplicity
    ;(asArrayModule.asArray as jest.Mock).mockImplementation((x) => x || [])

    // Setup a mock StaticMaps instance with needed methods & properties
    mockMapInstance = {
      render: jest.fn().mockResolvedValue(undefined),
      addMarker: jest.fn(),
      addLine: jest.fn(),
      addCircle: jest.fn(),
      addText: jest.fn(),
      image: {
        compositeSVG: jest.fn().mockResolvedValue(undefined),
        buffer: jest.fn().mockResolvedValue(Buffer.from("image-buffer")),
      },
    }
    ;(StaticMaps as jest.Mock).mockImplementation(() => mockMapInstance)

    const mockedCreateAttributionSVG =
      attributionModule.createAttributionSVG as jest.Mock
    mockedCreateAttributionSVG.mockReturnValue("<svg></svg>")
  })

  it("should generate a map buffer successfully", async () => {
    const options = {
      markers: [{ coords: [1, 2] }],
      polyline: [
        {
          coords: [
            [1, 2],
            [3, 4],
          ],
        },
      ],
      polygon: [
        {
          coords: [
            [1, 2],
            [3, 4],
            [5, 6],
          ],
        },
      ],
      circle: [{ coords: [1, 2], radius: 10 }],
      text: [{ coords: [1, 2], text: "Hello" }],
      center: [1, 2],
      zoom: 10,
      width: 300,
      height: 200,
      format: "png",
      attribution: { show: true, text: "© My Map" },
    }

    const buffer = await generateMap(options)

    expect(StaticMaps).toHaveBeenCalledWith(options)
    expect(addMarkersModule.addMarkers).toHaveBeenCalledWith(
      mockMapInstance,
      options.markers
    )
    expect(addPolylinesModule.addPolylines).toHaveBeenCalledWith(
      mockMapInstance,
      options.polyline,
      false
    )
    expect(addPolylinesModule.addPolylines).toHaveBeenCalledWith(
      mockMapInstance,
      options.polygon,
      true
    )
    expect(addCirclesModule.addCircles).toHaveBeenCalledWith(
      mockMapInstance,
      options.circle
    )
    expect(addTextsModule.addTexts).toHaveBeenCalledWith(
      mockMapInstance,
      options.text
    )
    expect(mockMapInstance.render).toHaveBeenCalledWith(
      options.center,
      options.zoom
    )
    expect(attributionModule.createAttributionSVG).toHaveBeenCalledWith(
      options.attribution.text,
      options.width,
      options.height
    )
    expect(mockMapInstance.image.compositeSVG).toHaveBeenCalledWith(
      "<svg></svg>"
    )
    expect(mockMapInstance.image.buffer).toHaveBeenCalledWith(options.format)
    expect(buffer).toBeInstanceOf(Buffer)
  })

  it("should skip compositing SVG if attribution.show is false", async () => {
    const options = {
      attribution: { show: false },
      format: "png",
    }
    const buffer = await generateMap(options)
    expect(mockMapInstance.image.compositeSVG).not.toHaveBeenCalled()
    expect(buffer).toBeInstanceOf(Buffer)
  })

  it("should throw an error if map.image is undefined after render", async () => {
    mockMapInstance.image = undefined

    const options = {
      format: "png",
    }
    await expect(generateMap(options)).rejects.toThrow(
      "Map image is undefined after rendering"
    )
  })

  it("should log and re-throw errors during map generation", async () => {
    const error = new Error("Render failed")
    mockMapInstance.render.mockRejectedValue(error)

    const options = {
      format: "png",
    }

    await expect(generateMap(options)).rejects.toThrow(error)

    expect(logger.error).toHaveBeenCalledWith(
      "Error generating map image",
      expect.objectContaining({
        message: error.message,
        stack: error.stack,
        format: options.format,
      })
    )
  })
})
