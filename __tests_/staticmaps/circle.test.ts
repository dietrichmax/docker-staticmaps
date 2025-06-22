import Circle from "../../src/staticmaps/circle"

describe("Circle class", () => {
  test("constructor assigns properties and defaults", () => {
    const c = new Circle({
      coord: [10, 20],
      radius: 1000,
    })

    expect(c.coord).toEqual([10, 20])
    expect(c.radius).toBe(1000)
    expect(c.color).toBe("#000000BB") // default
    expect(c.fill).toBe("#AA0000BB") // default
    expect(c.width).toBe(3) // default
  })

  test("constructor accepts all properties", () => {
    const c = new Circle({
      coord: [5, 15],
      radius: 500,
      color: "#123456",
      fill: "#654321",
      width: 7,
    })

    expect(c.coord).toEqual([5, 15])
    expect(c.radius).toBe(500)
    expect(c.color).toBe("#123456")
    expect(c.fill).toBe("#654321")
    expect(c.width).toBe(7)
  })

  test("constructor throws if coord is invalid", () => {
    expect(() => {
      new Circle({ coord: [10] as any, radius: 100 })
    }).toThrow("Specify center of circle")

    expect(() => {
      new Circle({ coord: null as any, radius: 100 })
    }).toThrow("Specify center of circle")
  })

  test("constructor throws if radius is invalid", () => {
    expect(() => {
      new Circle({ coord: [10, 20], radius: 0 })
    }).toThrow("Specify valid radius for circle")

    expect(() => {
      new Circle({ coord: [10, 20], radius: NaN })
    }).toThrow("Specify valid radius for circle")
  })

  test("width defaults to 3 if not finite", () => {
    const c1 = new Circle({ coord: [10, 20], radius: 100, width: NaN })
    expect(c1.width).toBe(3)

    const c2 = new Circle({ coord: [10, 20], radius: 100, width: Infinity })
    expect(c2.width).toBe(3)
  })

  test("extent returns correct bounding box approx", () => {
    const c = new Circle({ coord: [0, 0], radius: 111320 }) // 1 degree radius approx

    const extent = c.extent()

    // minLon, minLat, maxLon, maxLat
    // should be approx [-1, -1, 1, 1]
    expect(extent[0]).toBeCloseTo(-1, 2)
    expect(extent[1]).toBeCloseTo(-1, 2)
    expect(extent[2]).toBeCloseTo(1, 2)
    expect(extent[3]).toBeCloseTo(1, 2)
  })

  test("extent adjusts longitude by latitude correctly", () => {
    const lat = 60
    const radius = 111320 // 1 degree approx at equator

    const c = new Circle({ coord: [0, lat], radius })

    const extent = c.extent()

    // At 60° latitude, longitude degrees are shorter by cos(60°) = 0.5
    // So radius in degrees longitude should be ~ 2 degrees (1 / 0.5)
    expect(extent[0]).toBeCloseTo(-2, 2)
    expect(extent[2]).toBeCloseTo(2, 2)
  })
})
