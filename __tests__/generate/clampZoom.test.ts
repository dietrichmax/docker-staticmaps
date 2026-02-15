import { getMapParams } from "../../src/generate/generateParams"
import logger from "../../src/utils/logger"

jest.mock("../../src/utils/logger")

describe("zoom clamping in getMapParams", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("clamps zoom above max to max", () => {
    const result = getMapParams({
      center: "50,10",
      zoom: "25",
    })
    // Default zoomRange.max is 17
    expect(result.options.zoom).toBe(17)
  })

  it("clamps zoom below min to min", () => {
    const result = getMapParams({
      center: "50,10",
      zoom: "0",
    })
    // Default zoomRange.min is 1
    expect(result.options.zoom).toBe(1)
  })

  it("respects custom zoomRange", () => {
    const result = getMapParams({
      center: "50,10",
      zoom: "15",
      zoomRange: { min: 5, max: 10 },
    })
    expect(result.options.zoom).toBe(10)
  })

  it("passes through zoom within range", () => {
    const result = getMapParams({
      center: "50,10",
      zoom: "10",
    })
    expect(result.options.zoom).toBe(10)
  })

  it("does not set zoom when not provided", () => {
    const result = getMapParams({
      center: "50,10",
    })
    expect(result.options.zoom).toBeUndefined()
  })
})
