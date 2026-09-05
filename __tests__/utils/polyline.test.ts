import { decodePolyline } from "../../src/utils/polyline"

describe("decodePolyline", () => {
  it("decodes the reference example from the Google polyline spec", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ])
  })

  it("returns coordinates as [latitude, longitude]", () => {
    expect(decodePolyline("_p~iF~ps|U")).toEqual([[38.5, -120.2]])
  })

  it("returns an empty array for an empty string", () => {
    expect(decodePolyline("")).toEqual([])
  })

  it("accumulates each point as a delta from the previous one", () => {
    const [first, second, third] = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
    expect(second[0] - first[0]).toBeCloseTo(2.2, 5)
    expect(third[0] - second[0]).toBeCloseTo(2.552, 5)
  })

  it("decodes negative offsets", () => {
    const [first, second] = decodePolyline("_p~iF~ps|U~ulLnnqC")
    expect(second[0]).toBeLessThan(first[0])
  })

  it("scales values by the requested precision", () => {
    expect(decodePolyline("_p~iF~ps|U", 6)).toEqual([[3.85, -12.02]])
  })
})
