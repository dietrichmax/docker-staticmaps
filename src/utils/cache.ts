import NodeCache from "node-cache"
import { MapRequest } from "src/types/types"
import logger from "./logger"

// Use TTL from env or default to 3600 seconds (1 hour)
const tileCacheTTL = parseInt(process.env.TILE_CACHE_TTL ?? "", 10) || 3600

const tileCache = new NodeCache({ stdTTL: tileCacheTTL, checkperiod: 120 })

/**
 * Retrieves a cached tile buffer by its cache key.
 * Returns `undefined` if caching is disabled or if the key is not found.
 *
 * @param {string} key - The cache key to look up.
 * @returns {Buffer | undefined} - The cached tile data or undefined if not cached or caching disabled.
 */
export function getCachedTile(key: string): Buffer | undefined {
  // Check if cache should be disabled via env
  const disableCache = process.env.DISABLE_TILE_CACHE === "true"
  if (disableCache) {
    return undefined
  }

  const data = tileCache.get<Buffer>(key)
  logger.debug(data ? `Cache hit for ${key}` : `Cache miss for ${key}`)
  return data
}

/**
 * Stores a tile buffer in the cache under the specified key.
 * Does nothing if caching is disabled.
 *
 * @param {string} key - The cache key under which to store the tile.
 * @param {Buffer} data - The tile data buffer to cache.
 */
export function setCachedTile(key: string, data: Buffer): void {
  // Check if cache should be disabled via env
  const disableCache = process.env.DISABLE_TILE_CACHE === "true"
  if (disableCache) {
    return
  }

  tileCache.set(key, data)
  logger.debug(`Cached tile for ${key}`)
}

/**
 * Generates a unique cache key string from the HTTP request method, path, and query parameters.
 * If caching is disabled, returns a special dev key without query parameters.
 *
 * @param {MapRequest} req - The map request object containing method, path, and query parameters.
 * @returns {string} The generated cache key string.
 */
export function createCacheKeyFromRequest(req: MapRequest): string {
  // Check if cache should be disabled via env
  const disableCache = process.env.DISABLE_TILE_CACHE === "true"
  if (disableCache) {
    const devKey = `DEV:${req.method}:${req.path}`
    logger.debug(`Cache disabled in dev mode. Returning key: ${devKey}`)
    return devKey
  }

  const queryParams = Object.entries(req.query)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return [k, v.join(",")] // join array values with a comma
      }
      return [k, v as string]
    })
    .sort(([a], [b]) => a.localeCompare(b)) // sort keys for consistent order
    .map(([k, v]) => `${k}=${v}`) // turn into key=value strings
    .join("&") // join to form cache key string

  const queryString = new URLSearchParams(queryParams).toString()
  const cacheKey = `${req.method}:${req.path}?${queryString}`

  logger.debug(`Generated cache key: ${cacheKey}`)
  return cacheKey
}

/**
 * Internal cache instance used for storing tile buffers.
 * Exported for testing purposes only.
 * 
 * @internal
 */
export const _tileCache = tileCache
