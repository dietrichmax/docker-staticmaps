import NodeCache from "node-cache"
import { MapRequest } from "src/types/types"
import logger from "./logger"

/**
 * Time-to-live (TTL) for cached tiles, in seconds.
 * Reads from environment variable TILE_CACHE_TTL.
 * Defaults to 3600 seconds (1 hour) if not set or invalid.
 */
const tileCacheTTL = parseInt(process.env.TILE_CACHE_TTL ?? "", 10) || 3600

/**
 * In-memory cache instance for storing tile buffers.
 * Configured with:
 * - stdTTL: standard TTL for cached items (in seconds).
 * - checkperiod: interval in seconds to check and purge expired cache entries.
 */
const tileCache = new NodeCache({ stdTTL: tileCacheTTL, checkperiod: 120 })

/**
 * Retrieves a cached tile buffer by its cache key.
 * If caching is disabled or the key is not found, returns `undefined`.
 *
 * @param {string} key - The cache key to retrieve the tile data for.
 * @returns {Buffer | undefined} The cached tile data buffer, or `undefined` if not found or caching is disabled.
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
 * Stores a tile data buffer in the cache using the specified cache key.
 * If caching is disabled via the DISABLE_TILE_CACHE environment variable,
 * this function performs no operation.
 *
 * @param {string} key - The unique cache key to associate with the tile data.
 * @param {Buffer} data - The tile data buffer to be cached.
 * @returns {void}
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
 * Generates a unique cache key string based on the HTTP request method, path, and query parameters.
 * If caching is disabled (via the DISABLE_TILE_CACHE environment variable), returns a special
 * development mode key without query parameters.
 *
 * The query parameters are normalized by:
 * - Joining array values with commas
 * - Sorting keys alphabetically to ensure consistent ordering
 * - Encoding as a URL query string
 *
 * @param {MapRequest} req - The incoming map request object containing method, path, and query parameters.
 * @returns {string} A string that uniquely identifies the request for caching purposes.
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
