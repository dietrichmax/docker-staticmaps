import NodeCache from "node-cache"
import { MapRequest } from "src/types/types"
import logger from "./logger"

// Use TTL from env or default to 3600 seconds (1 hour)
const tileCacheTTL = parseInt(process.env.TILE_CACHE_TTL ?? "", 10) || 3600

// Check if cache should be disabled via env
const disableCache = process.env.DISABLE_TILE_CACHE === "true"

const tileCache = new NodeCache({ stdTTL: tileCacheTTL, checkperiod: 120 })

/**
 * Retrieve cached tile by key, unless in development mode.
 */
export function getCachedTile(key: string): Buffer | undefined {
  if (disableCache) {
    return undefined
  }

  const data = tileCache.get<Buffer>(key)
  logger.debug(data ? `Cache hit for ${key}` : `Cache miss for ${key}`)
  return data
}

/**
 * Store tile data in cache under given key, unless in development mode.
 */
export function setCachedTile(key: string, data: Buffer): void {
  if (disableCache) {
    return
  }

  tileCache.set(key, data)
  logger.debug(`Cached tile for ${key}`)
}

/**
 * Create a unique cache key from the request method, path, and query string.
 */
export function createCacheKeyFromRequest(req: MapRequest): string {
  if (disableCache) {
    const devKey = `DEV:${req.method}:${req.path}`
    logger.debug(`Cache disabled in dev mode. Returning key: ${devKey}`)
    return devKey
  }

  const queryParams = Object.entries(req.query)
    .filter(([, v]) => typeof v === "string")
    .reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = v as string
      return acc
    }, {})

  const queryString = new URLSearchParams(queryParams).toString()
  const cacheKey = `${req.method}:${req.path}?${queryString}`

  logger.debug(`Generated cache key: ${cacheKey}`)
  return cacheKey
}

/** @internal Only exported for testing purposes */
export const _tileCache = tileCache
