import { basemaps } from "../../src/utils/basemaps" // adjust path if needed

describe("basemaps collection", () => {
  test("contains expected number of basemaps", () => {
    expect(basemaps.length).toBe(11)
  })

  test("each basemap has required properties", () => {
    basemaps.forEach((bm) => {
      expect(typeof bm.basemap).toBe("string")
      expect(bm.basemap.length).toBeGreaterThan(0)
      expect(typeof bm.url).toBe("string")
      expect(bm.url.length).toBeGreaterThan(0)
    })
  })

  test("each basemap URL includes {z}, {x}, and {y} placeholders", () => {
    basemaps.forEach((bm) => {
      expect(bm.url).toContain("{z}")
      expect(bm.url).toContain("{x}")
      expect(bm.url).toContain("{y}")
    })
  })

  test("no duplicate basemap names", () => {
    const names = basemaps.map((bm) => bm.basemap)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })
})
