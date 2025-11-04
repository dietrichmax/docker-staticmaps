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
    query: Record<string, any> = {},
    body: Record<string, any> = {}
  ): MapRequest =>
    ({
      method,
      path,
      query,
      body,
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
    it("should create consistent hash-based cache key with sorted parameters", () => {
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
      expect(key1).toMatch(/^GET:\/api\/staticmaps:[a-f0-9]{64}$/)
    })

    it("should generate different hashes for different parameters", () => {
      const req1 = mockRequest("GET", "/tiles", {
        layers: ["base", "roads"],
      })
      const req2 = mockRequest("GET", "/tiles", {
        layers: ["satellite", "labels"],
      })

      const key1 = createCacheKeyFromRequest(req1)
      const key2 = createCacheKeyFromRequest(req2)
      expect(key1).not.toBe(key2)
      expect(key1).toMatch(/^GET:\/tiles:[a-f0-9]{64}$/)
      expect(key2).toMatch(/^GET:\/tiles:[a-f0-9]{64}$/)
    })

    it("should return DEV key if cache is disabled", () => {
      process.env.DISABLE_TILE_CACHE = "true"
      const req = mockRequest("GET", "/tiles")
      const key = createCacheKeyFromRequest(req)
      expect(key).toBe("DEV:GET:/tiles")
    })

    it("should handle POST requests using body parameters", () => {
      const req1 = mockRequest("POST", "/api/staticmaps", {}, {
        width: "800",
        polyline: "coord1,coord2,coord3",
      })
      const req2 = mockRequest("POST", "/api/staticmaps", {}, {
        width: "800",
        polyline: "coord4,coord5,coord6",
      })

      const key1 = createCacheKeyFromRequest(req1)
      const key2 = createCacheKeyFromRequest(req2)
      expect(key1).not.toBe(key2)
      expect(key1).toMatch(/^POST:\/api\/staticmaps:[a-f0-9]{64}$/)
      expect(key2).toMatch(/^POST:\/api\/staticmaps:[a-f0-9]{64}$/)
    })

    it("should handle large parameter sets without truncation", () => {
      const largeParams: Record<string, string> = {}
      for (let i = 0; i < 2000; i++) {
        largeParams[`coord${i}`] = `${Math.random()},${Math.random()}`
      }

      const req1 = mockRequest("POST", "/api/staticmaps", {}, largeParams)
      const req2 = mockRequest("POST", "/api/staticmaps", {}, {
        ...largeParams,
        coord0: "different,value",
      })

      const key1 = createCacheKeyFromRequest(req1)
      const key2 = createCacheKeyFromRequest(req2)
      expect(key1).not.toBe(key2)
      expect(key1).toMatch(/^POST:\/api\/staticmaps:[a-f0-9]{64}$/)
      expect(key2).toMatch(/^POST:\/api\/staticmaps:[a-f0-9]{64}$/)
    })
  })
})
