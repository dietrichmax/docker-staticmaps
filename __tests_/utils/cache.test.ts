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
  } as unknown as MapRequest;
}

describe("tileCache module", () => {
  const testKey = "GET:/staticmaps?center=-119.49280,37.81084&zoom=9"
  const testData = Buffer.from("testdata")

  beforeEach(() => {
    cache._tileCache.flushAll()
    process.env.NODE_ENV = "production" // default to prod for tests
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
    const req = createTestRequest({ query: { center: "-119.49280,37.81084", zoom: "9", layers: "topo" } });

    const key = cache.createCacheKeyFromRequest(req)
    expect(key).toBe("GET:/staticmaps?center=-119.49280%2C37.81084&zoom=9&layers=topo")

  })

  test("cache functions no-op in development mode", () => {
    process.env.NODE_ENV = "development"
    jest.resetModules(); // reset module cache to re-evaluate isDev
    
    const cache = require("../../src/utils/cache"); // re-import after NODE_ENV set
    
    cache.setCachedTile(testKey, testData)
    const cached = cache.getCachedTile(testKey)
    expect(cached).toBeUndefined()
  })
})
