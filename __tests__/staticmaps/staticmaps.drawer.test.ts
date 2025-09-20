import StaticMaps from "../../src/staticmaps/staticmaps"
import {
  drawLayer,
  drawSVG,
  drawMarkers,
  loadMarkers,
  circleToSVG,
  textToSVG,
  lineToSVG,
} from "../../src/staticmaps/renderer"
import { Circle, Text, Polyline } from "../../src/staticmaps/features"

// Mock dependencies
jest.mock("../../src/staticmaps/renderer", () => ({
  drawLayer: jest.fn(),
  drawSVG: jest.fn(),
  drawMarkers: jest.fn(),
  loadMarkers: jest.fn(),
  circleToSVG: jest.fn(),
  textToSVG: jest.fn(),
  lineToSVG: jest.fn(),
}))

describe("StaticMaps methods", () => {
  const mockImage = { image: "imageBuffer" }

  const map = new StaticMaps({
    width: 500,
    height: 300,
    tileUrl: "https://tiles/{z}/{x}/{y}.png",
  })

  map.image = mockImage
  map.centerX = 1000
  map.centerY = 1000
  map.zoom = 5

  describe("drawLayer", () => {
    it("calls drawLayer with correct params", async () => {
      ;(drawLayer as jest.Mock).mockResolvedValue([{ tile: "tileData" }])
      const config = { tileUrl: "url", tileSubdomains: ["a", "b"] }

      const result = await map.drawLayer(config)

      expect(drawLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          centerX: map.centerX,
          centerY: map.centerY,
          zoom: map.zoom,
          config,
        })
      )
      expect(result).toEqual([{ tile: "tileData" }])
    })
  })

  describe("drawSVG", () => {
    it("calls drawSVG with correct args and updates image", async () => {
      ;(drawSVG as jest.Mock).mockResolvedValue("svgBuffer")

      const features = [{ type: "circle" }]
      const fn = (f: any) => `<circle>${f.type}</circle>`

      await map.drawSVG(features, fn)

      expect(drawSVG).toHaveBeenCalledWith("imageBuffer", features, fn)
      expect(map.image.image).toBe("svgBuffer")
    })
  })

  describe("circleToSVG", () => {
    it("calls circleToSVG with correct args", () => {
      ;(circleToSVG as jest.Mock).mockReturnValue("<circle />")
      const circle = {} as Circle

      const result = map.circleToSVG(circle)

      expect(circleToSVG).toHaveBeenCalledWith(
        expect.objectContaining({
          circle,
          zoom: map.zoom,
        })
      )
      expect(result).toBe("<circle />")
    })
  })

  describe("textToSVG", () => {
    it("calls textToSVG with correct args", () => {
      ;(textToSVG as jest.Mock).mockReturnValue("<text />")
      const text = {} as Text

      const result = map.textToSVG(text)

      expect(textToSVG).toHaveBeenCalledWith(
        expect.objectContaining({
          text,
          zoom: map.zoom,
        })
      )
      expect(result).toBe("<text />")
    })
  })

  describe("lineToSVG", () => {
    it("calls lineToSVG with correct args", () => {
      ;(lineToSVG as jest.Mock).mockReturnValue("<line />")
      const line = {} as Polyline

      const result = map.lineToSVG(line)

      expect(lineToSVG).toHaveBeenCalledWith(
        expect.objectContaining({
          line,
          zoom: map.zoom,
        })
      )
      expect(result).toBe("<line />")
    })
  })

  describe("drawMarkers", () => {
    it("calls drawMarkers and updates image", async () => {
      map.image = { image: "imageBuffer" }
      map.markers = [{ coord: [10, 10] }] as any
      ;(drawMarkers as jest.Mock).mockResolvedValue("markerImage")

      await map.drawMarkers()

      expect(drawMarkers).toHaveBeenCalledWith(
        "imageBuffer",
        map.markers,
        500,
        300
      )
      expect(map.image.image).toBe("markerImage")
    })
  })

  describe("loadMarker", () => {
    it("calls loadMarkers with correct args", async () => {
      ;(loadMarkers as jest.Mock).mockResolvedValue(true)
      map.markers = [{ coord: [10, 10] }] as any

      const result = await map.loadMarker()

      expect(loadMarkers).toHaveBeenCalledWith(
        map.markers,
        map.zoom,
        expect.any(Function),
        expect.any(Function)
      )
      expect(result).toBe(true)
    })
  })
})
