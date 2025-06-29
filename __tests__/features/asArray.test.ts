import { asArray } from "../../src/features/asArray"

describe("asArray", () => {
  it("returns an empty array if input is undefined", () => {
    expect(asArray(undefined)).toEqual([])
  })

  it("returns an empty array if input is null", () => {
    expect(asArray(null)).toEqual([])
  })

  it("wraps a single item into an array", () => {
    const single = "foo"
    expect(asArray(single)).toEqual(["foo"])
  })

  it("returns the same array if input is already an array", () => {
    const arr = [1, 2, 3]
    expect(asArray(arr)).toBe(arr) // Same reference
  })

  it("works with generic types", () => {
    interface Feature {
      id: number
      name: string
    }
    const feature: Feature = { id: 1, name: "test" }
    const featureArr: Feature[] = [feature]

    expect(asArray(feature)).toEqual([feature])
    expect(asArray(featureArr)).toBe(featureArr)
    expect(asArray(undefined)).toEqual([])
  })
})
