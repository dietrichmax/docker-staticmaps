import { createAttributionSVG } from "../../src/utils/attribution"
import { measureTextWidth } from "../../src/utils/helpers"
import {
  parseAttributionParam,
  parseBorderParam,
} from "../../src/generate/generateParams"

// Mock measureTextWidth since it's used in createAttributionSVG
jest.mock("../../src/utils/helpers", () => ({
  measureTextWidth: jest.fn(),
}))

describe("createAttributionSVG", () => {
  beforeEach(() => {
    // Provide a fixed width for text to make output predictable
    ;(measureTextWidth as jest.Mock).mockReturnValue(50)
  })

  it("returns a Buffer containing SVG markup", () => {
    const text = "Test attribution"
    const width = 200
    const height = 100

    const svgBuffer = createAttributionSVG(text, width, height)
    const svgString = svgBuffer.toString("utf-8")

    expect(svgBuffer).toBeInstanceOf(Buffer)
    expect(svgString).toContain("<svg")
    expect(svgString).toContain(text)
    expect(svgString).toContain('class="attr-text"')
    expect(svgString).toContain('class="attr-bg"')
  })

  it("positions the rect and text correctly based on input size", () => {
    ;(measureTextWidth as jest.Mock).mockReturnValue(80)
    const width = 300
    const height = 150
    const text = "Position test"

    const svgBuffer = createAttributionSVG(text, width, height)
    const svgString = svgBuffer.toString()

    // Extract rect x/y/width/height attributes from SVG string
    const rectMatch = svgString.match(
      /<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"/
    )
    expect(rectMatch).not.toBeNull()
    if (rectMatch) {
      const [_, x, y, w, h] = rectMatch.map(Number)

      const expectedRectWidth = 80 + 8 * 2 // textWidth + paddingX * 2
      const expectedRectHeight = 12 + 3 * 2 // fontSize + paddingY * 2
      const expectedX = width - expectedRectWidth
      const expectedY = height - expectedRectHeight

      expect(x).toBeCloseTo(expectedX)
      expect(y).toBeCloseTo(expectedY)
      expect(w).toBeCloseTo(expectedRectWidth)
      expect(h).toBeCloseTo(expectedRectHeight)
    }
  })
})

describe("parseAttributionParam", () => {
  it("returns default show:true and basemap text when param is empty", () => {
    const result = parseAttributionParam(undefined, "Default attribution")
    expect(result).toEqual({ show: true, text: "Default attribution" })
  })

  it("returns show:false and no text when param is false", () => {
    expect(parseAttributionParam("false")).toEqual({ show: false })
  })

  it("parses show:true and a text with URL-encoded characters", () => {
    const input = "show:true|text:Powered%20by%20X"
    const result = parseAttributionParam(input)
    expect(result.show).toBe(true)
    expect(result.text).toBe("Powered by X")
  })

  it("parses param with text only and uses basemap attribution fallback", () => {
    const input = "text:Custom%20Text"
    const result = parseAttributionParam(input, "Fallback")
    expect(result.show).toBe(true)
    expect(result.text).toBe("Custom Text")
  })

  it("parses param with show:false and text, overrides show", () => {
    const input = "show:false|text:Hidden%20Text"
    const result = parseAttributionParam(input, "Fallback")
    expect(result.show).toBe(false)
    expect(result.text).toBe("Hidden Text")
  })

  it('handles param with only "true" or "false" without keys', () => {
    expect(parseAttributionParam("true")).toEqual({ show: true })
    expect(parseAttributionParam("false")).toEqual({ show: false })
  })

  it("returns basemap attribution if no text in param", () => {
    const input = "show:true"
    const result = parseAttributionParam(input, "Basemap attribution")
    expect(result.text).toBe("Basemap attribution")
  })

  it("handles object input from JSON POST body", () => {
    const result = parseAttributionParam({ show: true, text: "TEST" })
    expect(result).toEqual({ show: true, text: "TEST" })
  })

  it("handles object input with show:false", () => {
    const result = parseAttributionParam({ show: false, text: "Hidden" })
    expect(result).toEqual({ show: false, text: "Hidden" })
  })

  it("handles object input without text, falls back to basemap attribution", () => {
    const result = parseAttributionParam({ show: true }, "Basemap text")
    expect(result).toEqual({ show: true, text: "Basemap text" })
  })
})

describe("parseBorderParam", () => {
  it("returns undefined if no param provided", () => {
    expect(parseBorderParam()).toBeUndefined()
    expect(parseBorderParam("")).toBeUndefined()
  })

  it("parses string input with width and color", () => {
    expect(parseBorderParam("width:2|color:#ff0000")).toEqual({
      width: 2,
      color: "#ff0000",
    })
  })

  it("normalizes color without # prefix", () => {
    expect(parseBorderParam("color:ff0000")).toEqual({ color: "#ff0000" })
  })

  it("handles object input from JSON POST body", () => {
    expect(parseBorderParam({ width: 2, color: "#ff0000" })).toEqual({
      width: 2,
      color: "#ff0000",
    })
  })

  it("handles object input with only width", () => {
    expect(parseBorderParam({ width: 3 })).toEqual({ width: 3 })
  })

  it("handles object input with only color", () => {
    expect(parseBorderParam({ color: "#000" })).toEqual({ color: "#000" })
  })
})
