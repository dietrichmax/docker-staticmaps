import { MultiPolygon } from "../../src/staticmaps/features"

describe("MultiPolygon class", () => {
  test("constructor sets coords and default color, fill and width", () => {
    const coords = [
      [
        [1, 2],
        [3, 4],
      ],
      [
        [5, 6],
        [7, 8],
      ],
    ]

    const mp = new MultiPolygon({ coords })

    expect(mp.coords).toEqual(coords)
    expect(mp.color).toBe("#000000BB") // default color
    expect(mp.fill).toBeUndefined() // optional fill not set
    expect(mp.width).toBe(3) // default width
  })

  test("constructor uses provided color, fill and width", () => {
    const coords = [
      [
        [1, 2],
        [3, 4],
      ],
    ]

    const mp = new MultiPolygon({
      coords,
      color: "#FF0000AA",
      fill: true,
      width: 7,
    })

    expect(mp.color).toBe("#FF0000AA")
    expect(mp.fill).toBe(true)
    expect(mp.width).toBe(7)
  })

  test("constructor uses default width when width is not finite", () => {
    const coords = [
      [
        [0, 0],
        [1, 1],
      ],
    ]

    const mp1 = new MultiPolygon({ coords, width: NaN })
    expect(mp1.width).toBe(3)

    const mp2 = new MultiPolygon({ coords, width: Infinity })
    expect(mp2.width).toBe(3)
  })

  test("extent calculates bounding box correctly", () => {
    const coords = [
      [
        [-10, 20],
        [30, 40],
      ],
      [
        [5, 15],
        [25, 35],
      ],
    ]

    const mp = new MultiPolygon({ coords })

    const extent = mp.extent()
    expect(extent).toEqual([-10, 15, 30, 40])
  })

  test("extent works for single coordinate set", () => {
    const coords = [
      [
        [2, 3],
        [4, 5],
      ],
    ]

    const mp = new MultiPolygon({ coords })
    expect(mp.extent()).toEqual([2, 3, 4, 5])
  })
})
