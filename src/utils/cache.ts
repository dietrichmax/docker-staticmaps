import NodeCache from "node-cache"
import { MapRequest } from "src/types/types"
import logger from "./logger"

// Cache with 1 hour TTL (3600 seconds)
const tileCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 })

/**
 * Retrieve cached tile by key.
 * @param key Cache key string
 * @returns Buffer or undefined if cache miss
 */
export function getCachedTile(key: string): Buffer | undefined {
  logger.debug(`Retrieving cached tile for ${key}`)
  return tileCache.get<Buffer>(key)
}

/**
 * Store tile data in cache under given key.
 * @param key Cache key string
 * @param data Tile image data as Buffer
 */
export function setCachedTile(key: string, data: Buffer): void {
  logger.debug(`Caching tile ${key}`)
  tileCache.set(key, data)
}

/**
 * Creates a cache key string based on the request method, path, and query parameters.
 * This ensures each unique request maps to a unique cache key.
 * 
 * @param req Express request object
 * @returns string Cache key
 */
export function createCacheKeyFromRequest(req: MapRequest): string {
  // Serialize query parameters into URLSearchParams string
  const queryString = new URLSearchParams(
    // Cast because URLSearchParams expects Record<string, string>
    Object.entries(req.query)
      .filter(([_, v]) => typeof v === "string") // ignore arrays or undefined for simplicity
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v as string }), {})
  ).toString()

  return `${req.method}:${req.path}?${queryString}`
}