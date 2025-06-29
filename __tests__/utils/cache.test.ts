// __tests__/cache.test.ts
import {
  getCachedTile,
  setCachedTile,
  createCacheKeyFromRequest,
  _tileCache,
} from "../../src/utils/cache"
import { MapRequest } from "../../src/types/types"

describe("Tile Cache", () => {
  const key = "test:key"
  const value = Buffer.from("mock tile data")

  beforeEach(() => {
    _tileCache.flushAll()
    process.env.DISABLE_TILE_CACHE = "false"
  })

  afterAll(() => {
    _tileCache.flushAll()
  })

  const mockRequest = (
    method: string,
    path: string,
    query: Record<string, any> = {}
  ): MapRequest =>
    ({
      method,
      path,
      query,
    }) as unknown as MapRequest

  describe("getCachedTile & setCachedTile", () => {
    it("should store and retrieve tile data", () => {
      setCachedTile(key, value)
      const cached = getCachedTile(key)
      expect(cached?.equals(value)).toBe(true)
    })

    it("should return undefined if key not found", () => {
      expect(getCachedTile("nonexistent:key")).toBeUndefined()
    })

    it("should not store or retrieve if cache is disabled", () => {
      process.env.DISABLE_TILE_CACHE = "true"
      setCachedTile(key, value)
      expect(getCachedTile(key)).toBeUndefined()
    })
  })

  describe("createCacheKeyFromRequest", () => {
    it("should create consistent cache key with sorted query parameters", () => {
      const req1 = mockRequest("GET", "/api/staticmaps", {
        width: "800",
        height: "600",
        zoom: "10",
      })
      const req2 = mockRequest("GET", "/api/staticmaps", {
        height: "600",
        zoom: "10",
        width: "800",
      })

      const key1 = createCacheKeyFromRequest(req1)
      const key2 = createCacheKeyFromRequest(req2)
      expect(key1).toBe(key2)
    })

    it("should handle array query parameters by joining with commas", () => {
      process.env.DISABLE_TILE_CACHE = "false"
      const req = mockRequest("GET", "/tiles", {
        layers: ["base", "roads"],
      })

      const key = createCacheKeyFromRequest(req)
      expect(key).toContain("layers=base%2Croads")
    })

    it("should return DEV key if cache is disabled", () => {
      process.env.DISABLE_TILE_CACHE = "true"
      const req = mockRequest("GET", "/tiles")
      const key = createCacheKeyFromRequest(req)
      expect(key).toBe("DEV:GET:/tiles")
    })
  })
})
