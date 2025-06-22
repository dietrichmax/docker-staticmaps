import request from "supertest"
import app from "../../src/server" // Ensure your Express app is exported
import router from "../../src/routes/staticmaps.routes"
import {
  lonToX,
  latToY,
  yToLat,
  xToLon,
  meterToPixel,
  workOnQueue,
  chunk,
  tileXYToQuadKey,
  createGeodesicLine,
} from "../../src/staticmaps/utils"
import { getTileUrl } from "../../src/controllers/staticmaps.controller" // adjust path as necessary
import logger from "../../src/utils/logger" // adjust path as necessary

const BASE_URL = "http://localhost:3000"
const endpoint = process.env.PORT ? process.env.ENDPOINT : "/api/staticmaps"

// Mock the basemaps array and logger
jest.mock("../../src/utils/logger")
const basemaps = [
  { basemap: "osm", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" },
  { basemap: "topo", url: "https://tile.topo.com/{z}/{x}/{y}.png" },
]

jest.mock("supertest", () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue({
        body: Buffer.from("mocked_image_data"), // Mocking image data as a buffer
        headers: {
          "content-type": "image/png", // Mock content type header
        },
        status: 200,
      }),
    }
  })
})

describe("getTileUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return the custom URL when provided", () => {
    const customUrl = "https://custom.tile.url/{z}/{x}/{y}.png"
    const basemap = "osm" // shouldn't matter here
    expect(getTileUrl(customUrl, basemap)).toBe(customUrl)
  })

  it('should return the URL for the "osm" basemap', () => {
    const customUrl = null
    const basemap = "osm"
    expect(getTileUrl(customUrl, basemap)).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
  })

  it('should return the URL for the "otm" basemap', () => {
    const customUrl = null
    const basemap = "otm"
    expect(getTileUrl(customUrl, basemap)).toBe(
      "https://tile.opentopomap.org/{z}/{x}/{y}.png"
    )
  })

  it("should return an empty string and log an error for an unsupported basemap", () => {
    const customUrl = null
    const basemap = "unsupported"
    const expectedErrorMessage = 'Unsupported basemap: "unsupported"! Use a valid basemap name or remove the "basemap" parameter to use default ("osm").'


    const tileUrl = getTileUrl(customUrl, basemap)
    expect(tileUrl).toBe("")
    expect(logger.error).toHaveBeenCalledWith(expectedErrorMessage)
  })

  it("should return the default OpenStreetMap URL when no custom URL or basemap is provided", () => {
    const customUrl = null
    const basemap = null
    expect(getTileUrl(customUrl, basemap)).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
  })
})
