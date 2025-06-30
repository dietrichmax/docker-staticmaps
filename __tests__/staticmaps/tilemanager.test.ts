import { TileManager, TileServerConfig } from "../../src/staticmaps/tilemanager"
import * as cache from "../../src/utils/cache"
import * as utils from "../../src/staticmaps/utils"
import logger from "../../src/utils/logger"

describe("TileServerConfig", () => {
  it("uses default tileUrl if none provided", () => {
    const config = new TileServerConfig({})
    expect(config.tileUrl).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    )
  })

  it("uses provided tileUrl if given", () => {
    const url = "https://custom.tileserver.com/{z}/{x}/{y}.png"
    const config = new TileServerConfig({ tileUrl: url })
    expect(config.tileUrl).toBe(url)
  })

  it("uses tileSubdomains if provided", () => {
    const subdomains = ["a", "b", "c"]
    const config = new TileServerConfig({ tileSubdomains: subdomains })
    expect(config.tileSubdomains).toEqual(subdomains)
  })

  it("uses subdomains if tileSubdomains is not provided", () => {
    const subdomains = ["1", "2", "3"]
    const config = new TileServerConfig({ subdomains })
    expect(config.tileSubdomains).toEqual(subdomains)
  })

  it("defaults tileSubdomains to empty array if none provided", () => {
    const config = new TileServerConfig({})
    expect(config.tileSubdomains).toEqual([])
  })
})

// Mock fetch globally for all tests
global.fetch = jest.fn()

// Mock logger to avoid actual logs during tests
jest.mock("../../src/utils/logger", () => ({
  warn: jest.fn(),
  debug: jest.fn(),
}))

// Mock cache functions
jest.mock("../../src/utils/cache", () => ({
  getCachedTile: jest.fn(),
  setCachedTile: jest.fn(),
}))

// Mock workOnQueue utility
jest.mock("../../src/staticmaps/utils", () => ({
  workOnQueue: jest.fn(async (queue) => {
    for (const fn of queue) {
      await fn()
    }
  }),
}))

describe("TileManager", () => {
  const tileLayers = [new TileServerConfig({})]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should set defaults correctly", () => {
    const tm = new TileManager({ tileLayers })
    expect(tm.tileRequestLimit).toBe(2)
    expect(tm.reverseY).toBe(false)
  })

  describe("getTile", () => {
    const tileData = {
      url: "https://tileserver.org/1/2/3.png",
      box: [0, 0, 1, 1],
    }

    it("returns cached tile if available", async () => {
      ;(cache.getCachedTile as jest.Mock).mockReturnValue(Buffer.from("cached"))
      const tm = new TileManager({ tileLayers })
      const result = await tm.getTile(tileData)

      expect(cache.getCachedTile).toHaveBeenCalledWith(`GET:${tileData.url}`)
      expect(result.success).toBe(true)
      expect(result.tile?.body.toString()).toBe("cached")
      expect(logger.debug).not.toHaveBeenCalled()
    })

    it("fetches tile successfully and caches it", async () => {
      const arrayBuffer = new Uint8Array([1, 2, 3]).buffer
      ;(cache.getCachedTile as jest.Mock).mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => "image/png" },
        arrayBuffer: () => Promise.resolve(arrayBuffer),
      })

      const tm = new TileManager({ tileLayers })
      const result = await tm.getTile(tileData)

      expect(global.fetch).toHaveBeenCalledWith(
        tileData.url,
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      expect(result.tile?.url).toBe(tileData.url)
      expect(result.tile?.body).toBeInstanceOf(Buffer)
      expect(cache.setCachedTile).toHaveBeenCalled()
      expect(logger.debug).toHaveBeenCalledWith(`Fetched tile: ${tileData.url}`)
    })

    it("returns error if fetch response is not ok", async () => {
      ;(cache.getCachedTile as jest.Mock).mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
        headers: { get: () => "image/png" },
      })

      const tm = new TileManager({ tileLayers })
      const result = await tm.getTile(tileData)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Failed to fetch tile/)
    })

    it("returns error if content-type is not image/*", async () => {
      ;(cache.getCachedTile as jest.Mock).mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })

      const tm = new TileManager({ tileLayers })
      const result = await tm.getTile(tileData)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/wrong data/)
    })

    it("returns error if fetch throws", async () => {
      ;(cache.getCachedTile as jest.Mock).mockReturnValue(null)
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"))

      const tm = new TileManager({ tileLayers })
      const result = await tm.getTile(tileData)

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Network error/)
    })
  })

  describe("getTiles", () => {
    const baseLayers = [
      { url: "https://tileserver.org/1/0/0.png", box: [] },
      { url: "https://tileserver.org/1/0/1.png", box: [] },
      { url: "https://tileserver.org/1/1/0.png", box: [] },
      { url: "https://tileserver.org/1/1/1.png", box: [] },
    ]

    it("respects tileRequestLimit and limits concurrency", async () => {
      const tm = new TileManager({ tileLayers, tileRequestLimit: 2 })
      jest.spyOn(tm, "getTile").mockImplementation(async (tile) => ({
        success: true,
        tile,
      }))

      const results = await tm.getTiles(baseLayers)
      expect(tm.getTile).toHaveBeenCalledTimes(baseLayers.length)
      expect(results).toHaveLength(baseLayers.length)
    })

    it("fetches all tiles without limit if limit is 0", async () => {
      const tm = new TileManager({ tileLayers, tileRequestLimit: 0 })
      jest.spyOn(tm, "getTile").mockImplementation(async (tile) => ({
        success: true,
        tile,
      }))

      const results = await tm.getTiles(baseLayers)
      expect(tm.getTile).toHaveBeenCalledTimes(baseLayers.length)
      expect(results).toHaveLength(baseLayers.length)
    })
  })
})
