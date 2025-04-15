import Bound from "../../src/staticmaps/bound"

describe("Bound Class", () => {
  it("should calculate the correct bounding box", () => {
    const coords: [number, number][] = [
      [-119.4928, 37.81084],
      [-118.4928, 38.81084],
      [-120.4928, 36.81084],
    ]

    const bound = new Bound({ coords })
    const result = bound.extent()

    expect(result).toEqual([-120.4928, 36.81084, -118.4928, 38.81084])
  })

  it("should handle a single coordinate", () => {
    const coords: [number, number][] = [[-119.4928, 37.81084]]

    const bound = new Bound({ coords })
    const result = bound.extent()

    expect(result).toEqual([-119.4928, 37.81084, -119.4928, 37.81084])
  })

  it("should throw an error when no coordinates are provided", () => {
    const bound = new Bound({ coords: [] })

    expect(() => bound.extent()).toThrow(
      "Coordinates are required to calculate the bounding box."
    )
  })

  it("should handle negative coordinates", () => {
    const coords: [number, number][] = [
      [-180, -90],
      [0, 0],
      [180, 90],
    ]

    const bound = new Bound({ coords })
    const result = bound.extent()

    expect(result).toEqual([-180, -90, 180, 90])
  })

  it("should handle coordinates with mixed latitudes and longitudes", () => {
    const coords: [number, number][] = [
      [-120.0, 40.0],
      [-110.0, 35.0],
      [-115.0, 45.0],
      [-125.0, 30.0],
    ]

    const bound = new Bound({ coords })
    const result = bound.extent()

    expect(result).toEqual([-125.0, 30.0, -110.0, 45.0])
  })
})
