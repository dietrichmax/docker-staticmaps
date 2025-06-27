// __tests__/cache.test.ts
import * as cache from "../../src/utils/cache"
import { MapRequest } from "../../src/types/types"

function createTestRequest(overrides: Partial<MapRequest>): MapRequest {
  return {
    method: "GET",
    path: "/staticmaps",
    query: {},
    body: {},
    ...overrides,
  } as unknown as MapRequest
}

describe("tileCache module", () => {
  const testKey = "GET:/staticmaps?center=-119.49280,37.81084&zoom=9"
  const testData = Buffer.from("testdata")

  beforeEach(() => {
    cache._tileCache.flushAll()
    jest.resetModules()
    process.env.DISABLE_TILE_CACHE = "false" // enable cache by default
  })

  test("setCachedTile stores data in cache", () => {
    cache.setCachedTile(testKey, testData)
    const cached = cache.getCachedTile(testKey)
    expect(cached).toEqual(testData)
  })

  test("getCachedTile returns undefined for missing key", () => {
    expect(cache.getCachedTile("missing")).toBeUndefined()
  })

  test("createCacheKeyFromRequest generates consistent keys", () => {
    const req = createTestRequest({
      query: { center: "-119.49280,37.81084", zoom: "9", layers: "topo" },
    })

    const key = cache.createCacheKeyFromRequest(req)
    expect(key).toBe(
      "GET:/staticmaps?center=-119.49280%2C37.81084&layers=topo&zoom=9"
    )
  })

  test("cache functions are disabled when DISABLE_TILE_CACHE is true", () => {
    process.env.DISABLE_TILE_CACHE = "true"
    jest.resetModules()
    const cache = require("../../src/utils/cache")

    cache.setCachedTile(testKey, testData)
    const cached = cache.getCachedTile(testKey)
    expect(cached).toBeUndefined()
  })
})
